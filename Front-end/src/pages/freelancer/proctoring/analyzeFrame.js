/**
 * One camera frame → is anybody in it?
 * Pure (no DOM, no state).
 *
 * Face presence is the ONLY camera rule: head turns, eye direction, movement,
 * distance and extra people are deliberately not checked. A frame with no face
 * (left the seat, covered/blank camera, turned fully away) is "missing" —
 * useProctoring cancels the test once that has lasted settings.holdMs.
 */

// Shown when the test is cancelled for it.
export const FACE_MISSING_MESSAGE = 'Your face was not visible on camera.';
// Live hint while the face is missing.
export const FACE_MISSING_HINT = 'Move back into view of the camera';

/**
 * @param {object} result MediaPipe FaceLandmarkerResult
 * @returns {{ faces: number, faceMissing: boolean }}
 */
export function analyzeFrame(result) {
  const faces = result?.faceLandmarks?.length || 0;
  return { faces, faceMissing: faces === 0 };
}
