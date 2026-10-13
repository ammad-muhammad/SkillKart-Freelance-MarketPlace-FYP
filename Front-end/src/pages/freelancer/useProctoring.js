import { useCallback, useEffect, useRef, useState } from 'react';
import { loadFaceEngine, detectFaces, switchToCpu, engineDelegate } from './proctoring/faceEngine';
import { analyzeFrame, FACE_MISSING_MESSAGE } from './proctoring/analyzeFrame';
import { error as logError } from '../../utils/logger';

// Camera focus / exposure settling right after the test starts.
const ARM_GRACE_MS = 2000;
// Detection failures in a row before trying CPU, and before giving up.
const CPU_FALLBACK_STREAK = 3;
const HARD_ERROR_STREAK = 10;
// No decodable video frames for this long while the camera is "on" = broken.
const NO_FRAMES_MS = 8000;
// Android's WebView can stop delivering camera frames for a few seconds
// (measured: 3–4s freezes, real camera and test feed alike). A frozen feed
// is no evidence either way, so the countdown pauses — but a freeze this
// long during the test counts as a missing face, so covering/freezing the
// camera can't be used to dodge proctoring.
const FROZEN_AS_MISSING_MS = 10000;

const MISSING = Object.freeze({ faces: 0, faceMissing: true });

// getUserMedia errors meaning the device has no camera at all (as opposed to
// permission denied / camera busy / broken, which stay blocking).
const NO_CAMERA_ERRORS = ['NotFoundError', 'DevicesNotFoundError'];

/**
 * useProctoring — live camera proctoring for the skill test. The one rule is
 * face presence: if no face is in view for settings.holdMs in a row, the test
 * is cancelled (onAbort). Head angle, eye direction, movement, distance and
 * extra people are not checked.
 *
 * mode:
 *   'off'     — nothing runs (also when settings.enabled is false)
 *   'preview' — rules screen: detection runs and `live` updates so the
 *               candidate can position themselves; nothing is enforced
 *   'active'  — the test: a face missing for settings.holdMs cancels it
 *
 * A device with no camera at all (`noCamera`) is let through unproctored.
 */
export default function useProctoring({
  settings,
  mode,
  attemptId = 0,
  videoRef,
  onAbort,
}) {
  const [noCamera, setNoCamera] = useState(false);
  const enabled = !!settings?.enabled && mode !== 'off' && !noCamera;

  const [engineStatus, setEngineStatus] = useState('idle'); // idle | loading | ready | error
  const [engineError, setEngineError] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [detecting, setDetecting] = useState(false); // first frame analysed on this stream
  const [live, setLive] = useState({ missing: false, since: null, faces: 0 });
  const [engineReloadKey, setEngineReloadKey] = useState(0);

  const streamRef = useRef(null);
  // Bumped by every start/stop. A start that is still waiting on the browser
  // (permission prompt, slow device) checks it afterwards and backs off if the
  // camera was stopped or restarted in the meantime — see startCamera.
  const startSeq = useRef(0);
  const noVideoError = useRef(false); // cameraError currently = "no video coming through" (self-heals)
  const streamLost = useRef(false);
  const timerRef = useRef(null);
  const busyRef = useRef(false);
  const errorStreak = useRef(0);
  const noFrameSince = useRef(0);
  // Fresh-frame tracking (requestVideoFrameCallback) — see FROZEN_AS_MISSING_MS.
  const frameSeq = useRef(0);
  const frameVideo = useRef(null);
  const analyzedSeq = useRef(-1);
  const frozenSince = useRef(0);
  const lastTickAt = useRef(0);

  // Per-attempt state (reset when a new attempt starts).
  const missingSince = useRef(null); // when the current no-face stretch began
  const armedAt = useRef(0);
  const abortedRef = useRef(false);

  // Live mirrors so the loop (scheduled once) always sees current values.
  const modeRef = useRef(mode);
  const settingsRef = useRef(settings);
  const cbRef = useRef({ onAbort });
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { cbRef.current = { onAbort }; }, [onAbort]);

  /* ── engine ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setEngineStatus('loading');
    setEngineError(null);
    loadFaceEngine()
      .then(() => { if (!cancelled) setEngineStatus('ready'); })
      .catch((err) => {
        logError('[useProctoring] face detection failed to load', err);
        if (!cancelled) {
          setEngineStatus('error');
          setEngineError('Face detection could not start on this device.');
        }
      });
    return () => { cancelled = true; };
  }, [enabled, engineReloadKey]);

  /* ── camera ───────────────────────────────────────────────────── */
  const stopCamera = useCallback(() => {
    startSeq.current += 1; // also cancels a start that is still waiting on the browser
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef?.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    setDetecting(false);
  }, [videoRef]);

  const startCamera = useCallback(async () => {
    if (!settingsRef.current?.enabled) return false;
    stopCamera(); // releases the current camera and supersedes any start still in flight
    const mySeq = startSeq.current;
    const superseded = () => mySeq !== startSeq.current;
    noVideoError.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // facingMode 'user' matters on phones — without it some Android
        // WebViews open the BACK camera, so the candidate is never in view.
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (superseded()) {
        // The camera was stopped (page left, test cancelled) or restarted while
        // the browser was still opening this one — never keep it running.
        stream.getTracks().forEach((t) => t.stop());
        return false;
      }
      streamRef.current = stream;
      streamLost.current = false;
      stream.getVideoTracks().forEach((track) => {
        track.addEventListener('ended', () => {
          // Only the CURRENT camera ending means we lost it. A stale/stopped
          // stream's late 'ended' must not flag a healthy camera as lost.
          if (streamRef.current !== stream) return;
          streamLost.current = true;
          setCameraOn(false);
          setCameraError('The camera stopped working.');
        });
      });
      if (videoRef?.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
        if (superseded()) return false; // stopCamera already released this stream
      }
      noFrameSince.current = 0;
      setNoCamera(false);
      setCameraError(null);
      setCameraOn(true);
      setDetecting(false);
      return true;
    } catch (err) {
      if (superseded()) return false; // an outdated attempt failing is not news
      setCameraOn(false);
      if (NO_CAMERA_ERRORS.includes(err?.name)) {
        // No camera hardware at all → nothing to proctor; the test proceeds.
        setNoCamera(true);
        setCameraError(null);
        return false;
      }
      logError('[useProctoring] camera unavailable', err);
      setCameraError(err?.name === 'NotAllowedError'
        ? 'Camera permission was denied.'
        : 'Camera is unavailable.');
      return false;
    }
  }, [videoRef, stopCamera]);

  const retry = useCallback(() => {
    setEngineError(null);
    setCameraError(null);
    errorStreak.current = 0;
    if (engineStatus === 'error') setEngineReloadKey((k) => k + 1);
    return startCamera();
  }, [engineStatus, startCamera]);

  /* ── per-attempt reset ───────────────────────────────────────── */
  useEffect(() => {
    if (mode !== 'active') return;
    missingSince.current = null;
    abortedRef.current = false;
    armedAt.current = Date.now();
  }, [attemptId, mode]);

  /* ── enforcement (active mode only) ──────────────────────────── */
  const record = useCallback((faceMissing) => {
    const now = Date.now();
    if (!faceMissing || now - armedAt.current < ARM_GRACE_MS) {
      missingSince.current = null;
      return;
    }
    if (missingSince.current === null) missingSince.current = now;
    if (!abortedRef.current && now - missingSince.current >= settingsRef.current.holdMs) {
      abortedRef.current = true;
      cbRef.current.onAbort?.(FACE_MISSING_MESSAGE);
    }
  }, []);

  /* ── detection loop ──────────────────────────────────────────── */
  useEffect(() => {
    if (!enabled || engineStatus !== 'ready') return undefined;
    let stopped = false;

    const schedule = () => {
      if (stopped) return;
      timerRef.current = setTimeout(tick, settingsRef.current?.intervalMs || 700);
    };

    // Count frames actually presented by the <video> (re-attached when the
    // rules preview is swapped for the in-test thumbnail). Keeps firing when
    // the element is scrolled off-screen, so it measures the camera feed,
    // not visibility.
    const watchFrames = (video) => {
      if (frameVideo.current === video || typeof video.requestVideoFrameCallback !== 'function') return;
      frameVideo.current = video;
      const onFrame = () => {
        if (stopped || frameVideo.current !== video) return;
        frameSeq.current += 1;
        video.requestVideoFrameCallback(onFrame);
      };
      video.requestVideoFrameCallback(onFrame);
    };

    const tick = async () => {
      if (stopped || busyRef.current) { schedule(); return; }
      busyRef.current = true;
      try {
        const video = videoRef?.current;
        let analysis;

        if (streamLost.current) {
          // Camera gone mid-test — that's a missing face, not a free pass.
          analysis = MISSING;
        } else if (!streamRef.current || !video || video.readyState < 2 || !video.videoWidth) {
          if (streamRef.current) {
            if (!noFrameSince.current) noFrameSince.current = Date.now();
            else if (Date.now() - noFrameSince.current > NO_FRAMES_MS) {
              noVideoError.current = true;
              setCameraError('The camera is on but no video is coming through.');
            }
          }
          return;
        } else {
          noFrameSince.current = 0;
          if (noVideoError.current) {
            // Video is flowing again — a stall (busy device, slow start) is not a
            // permanent failure, so don't leave the error up and Restart disabled.
            noVideoError.current = false;
            setCameraError(null);
          }
          watchFrames(video);
          const now = Date.now();
          const gap = lastTickAt.current ? now - lastTickAt.current : 0;
          lastTickAt.current = now;
          const canTell = typeof video.requestVideoFrameCallback === 'function';
          if (canTell && frameSeq.current === analyzedSeq.current) {
            // No new frame since the last analysis — the feed is frozen.
            if (!frozenSince.current) frozenSince.current = now;
            if (now - frozenSince.current < FROZEN_AS_MISSING_MS) {
              // Pause the countdown instead of letting a stale frame run it.
              if (missingSince.current !== null) missingSince.current += gap;
              setLive((prev) => (prev.missing ? { ...prev, since: missingSince.current } : prev));
              return;
            }
            analysis = MISSING;
          }
        }

        if (!analysis) {
          frozenSince.current = 0;
          analyzedSeq.current = frameSeq.current;
          let result;
          try {
            result = detectFaces(video);
          } catch (err) {
            errorStreak.current += 1;
            if (errorStreak.current === 1) logError('[useProctoring] detection failed', err);
            if (errorStreak.current === CPU_FALLBACK_STREAK) {
              switchToCpu().catch((e) => logError('[useProctoring] CPU fallback failed', e));
            }
            if (errorStreak.current === HARD_ERROR_STREAK) {
              setEngineStatus('error');
              setEngineError('Face detection stopped working on this device.');
            }
            return;
          }
          errorStreak.current = 0;
          analysis = analyzeFrame(result);
          setDetecting(true);
        }

        if (modeRef.current === 'active') record(analysis.faceMissing);

        setLive({
          missing: analysis.faceMissing,
          since: analysis.faceMissing ? missingSince.current : null,
          faces: analysis.faces,
          delegate: engineDelegate(),
        });
      } finally {
        busyRef.current = false;
        schedule();
      }
    };

    schedule();
    return () => {
      stopped = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, engineStatus, videoRef, record]);

  // Never leave the camera light on after the page unmounts.
  useEffect(() => () => stopCamera(), [stopCamera]);

  // Turned off mid-way (e.g. strictness 0 loaded late) → release the camera.
  useEffect(() => {
    if (!enabled) stopCamera();
  }, [enabled, stopCamera]);

  return {
    enabled,
    engineStatus,
    engineError,
    cameraOn,
    cameraError,
    noCamera,
    detecting,
    live,
    startCamera,
    stopCamera,
    retry,
  };
}
