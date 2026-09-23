import { useCallback, useEffect, useRef, useState } from 'react';
import { loadFaceEngine, detectFaces, switchToCpu, engineDelegate } from './proctoring/faceEngine';
import { analyzeFrame, ISSUE_TYPES, ISSUE_MESSAGES } from './proctoring/analyzeFrame';
import { error as logError } from '../../utils/logger';

const ZERO_COUNTS = Object.freeze(Object.fromEntries(ISSUE_TYPES.map((t) => [t, 0])));

// Camera focus / exposure settling right after the test starts.
const ARM_GRACE_MS = 2000;
// Frames used to learn the candidate's normal distance from the camera.
const BASELINE_FRAMES = 3;
// Detection failures in a row before trying CPU, and before giving up.
const CPU_FALLBACK_STREAK = 3;
const HARD_ERROR_STREAK = 10;
// No decodable video frames for this long while the camera is "on" = broken.
const NO_FRAMES_MS = 8000;
// Android's WebView can stop delivering camera frames for a few seconds
// (measured: 3–4s freezes, real camera and test feed alike). A frozen feed
// is no evidence either way, so the strike clock pauses — but a freeze this
// long during the test counts as a missing face, so covering/freezing the
// camera can't be used to dodge proctoring.
const FROZEN_AS_MISSING_MS = 10000;

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/**
 * useProctoring — live camera proctoring for the skill test (MediaPipe Face
 * Landmarker: face presence, extra faces, head angle, eye direction, body
 * position). Every threshold comes from `settings`
 * (proctoring/strictness.js — one 0–1 strictness value).
 *
 * mode:
 *   'off'     — nothing runs (also when settings.enabled is false)
 *   'preview' — rules screen: detection runs and `live` updates so the
 *               candidate can position themselves; nothing is counted
 *   'active'  — the test: movements are counted, strikes issued
 *
 * A "movement" is counted each time an issue STARTS (shown live to the
 * candidate). A "strike" is issued only when an issue CONTINUES for
 * settings.holdMs, with settings.cooldownMs between strikes so one long
 * episode can't burn several. onStrike fires on every strike, onWarn on
 * the last one before the limit, onAbort when the limit is reached.
 */
export default function useProctoring({
  settings,
  mode,
  attemptId = 0,
  videoRef,
  questionCount = 0,
  onStrike,
  onWarn,
  onAbort,
}) {
  const enabled = !!settings?.enabled && mode !== 'off';
  const maxStrikes = settings?.enabled ? settings.cameraStrikesFor(questionCount) : 0;

  const [engineStatus, setEngineStatus] = useState('idle'); // idle | loading | ready | error
  const [engineError, setEngineError] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [detecting, setDetecting] = useState(false); // first frame analysed on this stream
  const [live, setLive] = useState({ issues: [], issue: null, since: null, faces: 0 });
  const [counts, setCounts] = useState(ZERO_COUNTS);
  const [strikes, setStrikes] = useState(0);
  const [engineReloadKey, setEngineReloadKey] = useState(0);

  const streamRef = useRef(null);
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
  const countsRef = useRef({ ...ZERO_COUNTS });
  const strikesRef = useRef(0);
  const sinceRef = useRef({});
  const prevIssues = useRef(new Set());
  const prevCenter = useRef(null);
  const baselineSamples = useRef([]);
  const baselineWidth = useRef(0);
  const cooldownUntil = useRef(0);
  const armedAt = useRef(0);

  // Live mirrors so the loop (scheduled once) always sees current values.
  const modeRef = useRef(mode);
  const settingsRef = useRef(settings);
  const maxRef = useRef(maxStrikes);
  const cbRef = useRef({ onStrike, onWarn, onAbort });
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { maxRef.current = maxStrikes; }, [maxStrikes]);
  useEffect(() => { cbRef.current = { onStrike, onWarn, onAbort }; }, [onStrike, onWarn, onAbort]);

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
    if (streamRef.current) stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // facingMode 'user' matters on phones — without it some Android
        // WebViews open the BACK camera, so the candidate is never in view.
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      streamLost.current = false;
      stream.getVideoTracks().forEach((track) => {
        track.addEventListener('ended', () => {
          streamLost.current = true;
          setCameraOn(false);
          setCameraError('The camera stopped working.');
        });
      });
      if (videoRef?.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      noFrameSince.current = 0;
      setCameraError(null);
      setCameraOn(true);
      setDetecting(false);
      return true;
    } catch (err) {
      logError('[useProctoring] camera unavailable', err);
      setCameraOn(false);
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
    countsRef.current = { ...ZERO_COUNTS };
    strikesRef.current = 0;
    sinceRef.current = {};
    prevIssues.current = new Set();
    prevCenter.current = null;
    baselineSamples.current = [];
    baselineWidth.current = 0;
    cooldownUntil.current = 0;
    armedAt.current = Date.now();
    setCounts(ZERO_COUNTS);
    setStrikes(0);
  }, [attemptId, mode]);

  /* ── counting + strikes (active mode only) ───────────────────── */
  const record = useCallback((analysis) => {
    const s = settingsRef.current;
    const now = Date.now();
    if (now - armedAt.current < ARM_GRACE_MS) return;

    const current = new Set(analysis.issues);
    let changed = false;
    for (const type of current) {
      if (!prevIssues.current.has(type)) {
        countsRef.current[type] += 1;
        sinceRef.current[type] = now;
        changed = true;
      }
    }
    // A sudden jump is a movement too, even if it settles back in place.
    if (analysis.jump && !current.has('body_movement') && !current.has('face_missing')) {
      countsRef.current.body_movement += 1;
      changed = true;
    }
    for (const type of prevIssues.current) {
      if (!current.has(type)) delete sinceRef.current[type];
    }
    prevIssues.current = current;
    if (changed) setCounts({ ...countsRef.current });

    if (now < cooldownUntil.current) return;
    const due = ISSUE_TYPES.find((t) => current.has(t) && now - (sinceRef.current[t] ?? now) >= s.holdMs);
    if (!due) return;

    strikesRef.current += 1;
    cooldownUntil.current = now + s.cooldownMs;
    sinceRef.current[due] = now; // a still-ongoing episode needs a full new hold
    setStrikes(strikesRef.current);

    const count = strikesRef.current;
    const max = maxRef.current;
    const message = ISSUE_MESSAGES[due];
    cbRef.current.onStrike?.(count, max, due, message);
    if (count >= max) cbRef.current.onAbort?.(message, due);
    else if (count === max - 1) cbRef.current.onWarn?.(message, due);
  }, []);

  /* ── detection loop ──────────────────────────────────────────── */
  useEffect(() => {
    if (!enabled || engineStatus !== 'ready') return undefined;
    let stopped = false;

    const schedule = () => {
      if (stopped) return;
      timerRef.current = setTimeout(tick, settingsRef.current?.intervalMs || 1000);
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
        const s = settingsRef.current;
        const video = videoRef?.current;
        let analysis;

        if (streamLost.current) {
          // Camera gone mid-test — that's a missing face, not a free pass.
          analysis = { issues: ['face_missing'], faces: 0, box: null, jump: false };
        } else if (!streamRef.current || !video || video.readyState < 2 || !video.videoWidth) {
          if (streamRef.current) {
            if (!noFrameSince.current) noFrameSince.current = Date.now();
            else if (Date.now() - noFrameSince.current > NO_FRAMES_MS) {
              setCameraError('The camera is on but no video is coming through.');
            }
          }
          return;
        } else {
          noFrameSince.current = 0;
          watchFrames(video);
          const now = Date.now();
          const gap = lastTickAt.current ? now - lastTickAt.current : 0;
          lastTickAt.current = now;
          const canTell = typeof video.requestVideoFrameCallback === 'function';
          if (canTell && frameSeq.current === analyzedSeq.current) {
            // No new frame since the last analysis — the feed is frozen.
            if (!frozenSince.current) frozenSince.current = now;
            if (now - frozenSince.current < FROZEN_AS_MISSING_MS) {
              // Pause every running hold timer instead of letting a stale
              // frame build toward a strike.
              for (const key of Object.keys(sinceRef.current)) sinceRef.current[key] += gap;
              setLive((prev) => (prev.issue ? { ...prev, since: sinceRef.current[prev.issue] ?? prev.since } : prev));
              return;
            }
            analysis = { issues: ['face_missing'], faces: 0, box: null, jump: false };
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
          analysis = analyzeFrame(result, s, {
            baselineWidth: baselineWidth.current,
            prevCenter: prevCenter.current,
          });
          setDetecting(true);

          if (analysis.box) prevCenter.current = { x: analysis.box.cx, y: analysis.box.cy };
          // Learn the normal distance from the first clean frames of the test.
          if (modeRef.current === 'active' && !baselineWidth.current && analysis.issues.length === 0 && analysis.box) {
            baselineSamples.current.push(analysis.box.width);
            if (baselineSamples.current.length >= BASELINE_FRAMES) {
              baselineWidth.current = median(baselineSamples.current);
            }
          }
        }

        if (modeRef.current === 'active') record(analysis);

        const issue = ISSUE_TYPES.find((t) => analysis.issues.includes(t)) || null;
        setLive({
          issues: analysis.issues,
          issue,
          since: issue ? (sinceRef.current[issue] ?? null) : null,
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
    detecting,
    live,
    counts,
    strikes,
    maxStrikes,
    startCamera,
    stopCamera,
    retry,
  };
}
