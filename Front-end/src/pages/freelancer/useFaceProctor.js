import { useEffect, useRef, useCallback, useState } from 'react';
import * as faceapi from 'face-api.js';

const MODEL_URL = '/models';

// Loaded once per page load and shared across every hook instance/attempt.
let modelsLoadPromise = null;
const loadModels = () => {
  if (!modelsLoadPromise) {
    modelsLoadPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
    ]);
  }
  return modelsLoadPromise;
};

const DETECT_INTERVAL_MS = 600;
const BAD_STREAK_THRESHOLD = 2;   // ~1.2s of a consistent bad state before it counts as one violation
const VIOLATION_COOLDOWN_MS = 4000; // after counting a violation, don't re-count the same episode
const ARM_GRACE_MS = 2000;        // camera focus / model warm-up grace period

// How far the nose can sit off the eye-to-eye midpoint (0.5 = perfectly
// centered) before it counts as a head turn. Small enough to catch a glance
// to the side, not just a full profile turn.
const YAW_DEVIATION = 0.09;
// How far the face's own center can drift from the frame's center (as a
// fraction of frame width/height) before it counts as "moved out of view" —
// e.g. leaning the whole head/body sideways to look at a phone propped next
// to the screen, which a pure head-angle check alone can miss since the face
// may still look roughly front-on relative to the now-off-axis camera.
const OFFCENTER_MARGIN = 0.22;

const REASONS = {
  no_face: 'Your face was not visible on camera.',
  multiple_faces: 'Multiple faces were detected in the camera.',
  looking_away: 'You appeared to look away from the screen.',
};

// Classify a single detection result into 'ok' | 'no_face' | 'multiple_faces' | 'looking_away'.
const classify = (detections, video) => {
  if (!detections || detections.length === 0) return 'no_face';
  if (detections.length > 1) return 'multiple_faces';

  const [{ detection, landmarks }] = detections;
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const nose = landmarks.getNose();
  const avgX = (pts) => pts.reduce((s, p) => s + p.x, 0) / pts.length;

  const leftEyeX = avgX(leftEye);
  const rightEyeX = avgX(rightEye);
  const noseX = avgX(nose);

  // Yaw: where the nose sits between the two eyes, as a 0..1 fraction of the
  // eye-to-eye span. Centered/forward-facing sits near 0.5; turning the head
  // (or just glancing hard to one side) shifts it noticeably off that
  // midpoint. Normalizing by eye-to-eye distance (not the whole face box) is
  // more stable — the box includes jaw/forehead/hair, which vary a lot.
  const eyeSpan = rightEyeX - leftEyeX || 1;
  const yawRatio = (noseX - leftEyeX) / eyeSpan;
  if (Math.abs(yawRatio - 0.5) > YAW_DEVIATION) return 'looking_away';

  // Position-in-frame: catches leaning/shifting the head sideways (e.g.
  // toward a phone propped beside the screen) even when the head itself
  // isn't turned much relative to the now off-axis camera angle.
  if (video?.videoWidth && video?.videoHeight) {
    const faceCenterX = (detection.box.x + detection.box.width / 2) / video.videoWidth;
    const faceCenterY = (detection.box.y + detection.box.height / 2) / video.videoHeight;
    if (Math.abs(faceCenterX - 0.5) > OFFCENTER_MARGIN || Math.abs(faceCenterY - 0.5) > OFFCENTER_MARGIN) {
      return 'looking_away';
    }
  }

  return 'ok';
};

/**
 * useFaceProctor — webcam face/head-pose proctoring guard for the skill test.
 *
 * Runs face-api.js (TinyFaceDetector + tiny 68-point landmarks) against the
 * live camera feed several times a second while `active`, flagging:
 *   - no_face          — face not visible (camera covered, freelancer left)
 *   - multiple_faces   — more than one face in frame (someone else helping)
 *   - looking_away     — head turned (yaw ratio between the eyes deviates
 *                        from center) OR the face has physically drifted
 *                        toward the edge of the frame (e.g. leaning over to
 *                        a phone propped beside the screen). This is a
 *                        head-pose + framing proxy, not true eye/pupil gaze
 *                        tracking — the tiny landmark model has no iris
 *                        points — but both checks are intentionally tight so
 *                        even a glance to the side gets caught.
 *
 * This is a SEPARATE strike counter than useAntiCheat's, still slightly more
 * lenient given camera signals are noisier than browser events (a blink or a
 * quick head bob shouldn't cost a strike): a bad state must persist ~1.2s
 * (2 consecutive ticks at 600ms) before it counts as one violation, and 3
 * violations (not 2) trigger onAbort. A cooldown after each counted violation
 * stops one continuous episode (e.g. "stepped away for 20s") from being
 * counted many times over.
 *
 * @param {object}   opts
 * @param {boolean}  opts.active     enable/disable the guard + detection loop
 * @param {number}   opts.attemptId  bump this to start a fresh attempt (resets strikes)
 * @param {object}   opts.videoRef   ref to the <video> element the camera stream attaches to
 * @param {Function} opts.onWarn     called on the 1st/2nd violation (reason: string)
 * @param {Function} opts.onAbort    called on the 3rd violation (reason: string)
 */
export default function useFaceProctor({ active, attemptId = 0, videoRef, onWarn, onAbort }) {
  const [modelsReady, setModelsReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const busyRef = useRef(false);
  const armedAt = useRef(0);
  const violations = useRef(0);
  const badType = useRef(null);
  const badStreak = useRef(0);
  const cooldownUntil = useRef(0);

  const cbRef = useRef({ onWarn, onAbort });
  useEffect(() => { cbRef.current = { onWarn, onAbort }; }, [onWarn, onAbort]);

  useEffect(() => {
    let cancelled = false;
    loadModels()
      .then(() => { if (!cancelled) setModelsReady(true); })
      .catch(() => { if (!cancelled) setCameraError('Could not load proctoring models.'); });
    return () => { cancelled = true; };
  }, []);

  const stopCamera = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef?.current) videoRef.current.srcObject = null;
  }, [videoRef]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      streamRef.current = stream;
      if (videoRef?.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraError(null);
      return true;
    } catch {
      setCameraError('Camera access was denied or is unavailable.');
      return false;
    }
  }, [videoRef]);

  const registerBadState = useCallback((type) => {
    if (!active) return;
    const now = Date.now();
    if (now - armedAt.current < ARM_GRACE_MS) return;

    if (type === badType.current) {
      badStreak.current += 1;
    } else {
      badType.current = type;
      badStreak.current = 1;
    }

    if (badStreak.current < BAD_STREAK_THRESHOLD) return;
    badStreak.current = 0;
    if (now < cooldownUntil.current) return;
    cooldownUntil.current = now + VIOLATION_COOLDOWN_MS;

    violations.current += 1;
    const reason = REASONS[type] || 'Camera proctoring flagged unusual activity.';
    if (violations.current >= 3) {
      cbRef.current.onAbort?.(reason);
    } else {
      cbRef.current.onWarn?.(reason);
    }
  }, [active]);

  const registerOk = useCallback(() => {
    badType.current = null;
    badStreak.current = 0;
  }, []);

  // Detection loop.
  useEffect(() => {
    if (!active || !modelsReady) return undefined;

    intervalRef.current = setInterval(async () => {
      const video = videoRef?.current;
      if (!video || video.readyState < 2 || busyRef.current) return;
      busyRef.current = true;
      try {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks(true);
        const state = classify(detections, video);
        if (state === 'ok') registerOk();
        else registerBadState(state);
      } catch {
        // Transient detection failure (e.g. video not ready) — ignore this tick.
      } finally {
        busyRef.current = false;
      }
    }, DETECT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, modelsReady, videoRef, registerBadState, registerOk]);

  // Reset strikes only when a NEW attempt starts, mirroring useAntiCheat.
  useEffect(() => {
    if (active) {
      violations.current = 0;
      badType.current = null;
      badStreak.current = 0;
      cooldownUntil.current = 0;
      armedAt.current = Date.now();
    }
  }, [attemptId, active]);

  // Never leave a camera light on after the component using this hook unmounts.
  useEffect(() => () => stopCamera(), [stopCamera]);

  return { modelsReady, cameraError, startCamera, stopCamera };
}
