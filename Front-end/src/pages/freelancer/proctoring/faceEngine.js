import { isMobileApp } from '../../../utils/platform';
import { error as logError, log } from '../../../utils/logger';

/**
 * MediaPipe Face Landmarker, loaded once per page load and shared.
 *
 * Assets are served same-origin (never a CDN) so the Android app works
 * offline: vite.config.js's mediapipeAssets plugin serves them in dev and
 * copies them into the build — /mediapipe/wasm/* from
 * node_modules/@mediapipe/tasks-vision and /mediapipe/face_landmarker.task
 * from Front-end/vendor/mediapipe.
 *
 * Delegate: the native app starts on CPU. Android WebView can usually
 * create a GPU/WebGL context but then fail real inference — the exact
 * "camera on, nothing ever detected" failure face-api.js had there. The web
 * starts on GPU (faster) and falls back to CPU if GPU can't be created, or
 * if detection keeps failing (see switchToCpu).
 */

const BASE = import.meta.env.BASE_URL || '/';
const WASM_PATH = `${BASE}mediapipe/wasm`;
const MODEL_PATH = `${BASE}mediapipe/face_landmarker.task`;
const LOAD_TIMEOUT_MS = 45000;

let enginePromise = null;
let current = null; // { landmarker, delegate }

const withTimeout = (promise, ms, message) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(message)), ms);
  promise.then(
    (v) => { clearTimeout(timer); resolve(v); },
    (e) => { clearTimeout(timer); reject(e); },
  );
});

async function createLandmarker(delegate) {
  const { FilesetResolver, FaceLandmarker } = await import('@mediapipe/tasks-vision');
  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
  return FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_PATH, delegate },
    // IMAGE, not VIDEO: frames are analysed ~0.7s apart, too far apart for
    // VIDEO mode's frame-to-frame tracking — it kept "following" a face that
    // had already left. IMAGE runs the (cheap) face detector on every frame.
    runningMode: 'IMAGE',
    // The only question asked is "is anyone in the frame?", so one face is
    // enough and the eye / head-angle outputs are switched off (less CPU).
    numFaces: 1,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  });
}

async function load() {
  const order = isMobileApp() ? ['CPU'] : ['GPU', 'CPU'];
  let lastErr = null;
  for (const delegate of order) {
    try {
      const landmarker = await createLandmarker(delegate);
      current = { landmarker, delegate };
      log(`[faceEngine] MediaPipe face landmarker ready (${delegate})`);
      return current;
    } catch (err) {
      lastErr = err;
      logError(`[faceEngine] could not start the ${delegate} delegate`, err);
    }
  }
  throw lastErr || new Error('Face detection could not start');
}

/** Resolves once detection can run; rejects (and allows a retry) on failure. */
export function loadFaceEngine() {
  if (!enginePromise) {
    enginePromise = withTimeout(load(), LOAD_TIMEOUT_MS, 'Face detection took too long to load')
      .catch((err) => {
        enginePromise = null; // let "Retry" try again from scratch
        throw err;
      });
  }
  return enginePromise;
}

export const engineDelegate = () => current?.delegate || null;

/**
 * Analyse the current video frame. Throws if the engine isn't loaded or the
 * frame can't be processed — the caller counts consecutive failures.
 */
export function detectFaces(video) {
  if (!current) throw new Error('Face detection is not loaded');
  return current.landmarker.detect(video);
}

/** Recreate the landmarker on CPU after repeated GPU failures. */
export async function switchToCpu() {
  if (current?.delegate === 'CPU') return false;
  const landmarker = await createLandmarker('CPU');
  try { current?.landmarker?.close(); } catch { /* already gone */ }
  current = { landmarker, delegate: 'CPU' };
  enginePromise = Promise.resolve(current);
  logError('[faceEngine] detection kept failing on GPU — switched to CPU');
  return true;
}
