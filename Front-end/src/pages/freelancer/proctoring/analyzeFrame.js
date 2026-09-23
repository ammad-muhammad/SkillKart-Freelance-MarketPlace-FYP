/**
 * One camera frame → which proctoring issues are present right now.
 * Pure (no DOM, no state) so it can be unit-checked with recorded values.
 *
 * Input is a MediaPipe FaceLandmarkerResult (478 landmarks per face, face
 * blendshapes, facial transformation matrix). Issue types, most serious
 * first — the order doubles as display/strike priority:
 *   face_missing  — no face in view (left, covered the camera, turned fully away)
 *   extra_face    — more than one face (someone else in view)
 *   head_turn     — head rotated left/right or up/down beyond the allowed angle
 *   eyes_away     — eyes looking off-screen (MediaPipe eyeLook* blendshapes)
 *   body_movement — leaned/moved toward the frame edge, or much closer/further
 *                   than at the start (face size vs. the calibrated baseline)
 */

export const ISSUE_TYPES = ['face_missing', 'extra_face', 'head_turn', 'eyes_away', 'body_movement'];

export const ISSUE_LABELS = {
  face_missing: 'Face missing',
  extra_face: 'Extra face',
  head_turn: 'Head turns',
  eyes_away: 'Eyes away',
  body_movement: 'Body movement',
};

// What the candidate is told live, and the reason logged for a strike.
export const ISSUE_MESSAGES = {
  face_missing: 'Your face is not visible on camera.',
  extra_face: 'Another person is visible on camera.',
  head_turn: 'You turned your head away from the screen.',
  eyes_away: 'You looked away from the screen.',
  body_movement: 'You moved out of position in front of the camera.',
};

export const ISSUE_HINTS = {
  face_missing: 'Move back into view of the camera',
  extra_face: 'Only you should be in view',
  head_turn: 'Face the screen',
  eyes_away: 'Keep your eyes on the screen',
  body_movement: 'Sit centred, at your normal distance',
};

const RAD = 180 / Math.PI;

const blendshapeMap = (classifications) => {
  const out = {};
  for (const c of classifications?.categories || []) out[c.categoryName] = c.score;
  return out;
};

/**
 * Head yaw/pitch in degrees from the facial transformation matrix. Uses the
 * face's forward axis (the rotation's third column), so the result doesn't
 * depend on Euler-order conventions — and only magnitudes are compared, so a
 * mirrored front camera or a row/column-major mix-up can only flip the sign.
 */
export const headAngles = (matrix) => {
  const d = matrix?.data;
  if (!Array.isArray(d) && !(d && typeof d.length === 'number')) return null;
  if (d.length < 16) return null;
  const fx = d[8];
  const fy = d[9];
  const fz = d[10];
  if (![fx, fy, fz].every(Number.isFinite)) return null;
  return {
    yaw: Math.atan2(fx, fz) * RAD,
    pitch: Math.atan2(fy, Math.hypot(fx, fz)) * RAD,
  };
};

// Fallback when no matrix is available: yaw from where the nose tip sits
// between the two face edges (0.5 = centred), mapped roughly to degrees.
const yawFromLandmarks = (lm) => {
  const nose = lm[1];
  const left = lm[234];
  const right = lm[454];
  if (!nose || !left || !right) return null;
  const span = right.x - left.x;
  if (Math.abs(span) < 1e-6) return null;
  const ratio = (nose.x - left.x) / span;
  return (ratio - 0.5) * 120;
};

export const faceBox = (lm) => {
  let minX = 1; let maxX = 0; let minY = 1; let maxY = 0;
  for (const p of lm) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
};

export const eyeScores = (bs) => {
  const g = (k) => bs[k] || 0;
  return {
    // Looking to the side = one eye looking "out" while the other looks "in".
    side: Math.max(
      (g('eyeLookOutLeft') + g('eyeLookInRight')) / 2,
      (g('eyeLookInLeft') + g('eyeLookOutRight')) / 2,
    ),
    up: (g('eyeLookUpLeft') + g('eyeLookUpRight')) / 2,
    down: (g('eyeLookDownLeft') + g('eyeLookDownRight')) / 2,
    blink: (g('eyeBlinkLeft') + g('eyeBlinkRight')) / 2,
  };
};

/**
 * @param {object} result   MediaPipe FaceLandmarkerResult
 * @param {object} settings from deriveProctoringSettings()
 * @param {object} context  { baselineWidth?: number, prevCenter?: {x,y} }
 * @returns {{ issues: string[], faces: number, box: object|null, jump: boolean, metrics: object }}
 */
export function analyzeFrame(result, settings, context = {}) {
  const faces = result?.faceLandmarks?.length || 0;
  if (faces === 0) {
    return { issues: ['face_missing'], faces, box: null, jump: false, metrics: {} };
  }

  const issues = [];
  if (faces > 1) issues.push('extra_face');

  // Everything below describes the main (first, largest-confidence) face.
  const lm = result.faceLandmarks[0];
  const box = faceBox(lm);
  const angles = headAngles(result.facialTransformationMatrixes?.[0])
    || { yaw: yawFromLandmarks(lm) ?? 0, pitch: 0 };
  const eyes = eyeScores(blendshapeMap(result.faceBlendshapes?.[0]));

  const headTurned = Math.abs(angles.yaw) > settings.headYawDeg || Math.abs(angles.pitch) > settings.headPitchDeg;
  if (headTurned) issues.push('head_turn');

  // Eye direction is only meaningful with the head roughly frontal and the
  // eyes open — a blink drives eyeLookDown up and must never count.
  if (!headTurned && eyes.blink < 0.55) {
    if (eyes.side > settings.eyeSide || eyes.up > settings.eyeUp || eyes.down > settings.eyeDown) {
      issues.push('eyes_away');
    }
  }

  const offCenter = Math.abs(box.cx - 0.5) > settings.offCenter || Math.abs(box.cy - 0.5) > settings.offCenter;
  let sizeOff = false;
  if (context.baselineWidth > 0 && box.width > 0) {
    const ratio = box.width / context.baselineWidth;
    sizeOff = ratio > 1 + settings.sizeChange || ratio < 1 / (1 + settings.sizeChange);
  }
  if (offCenter || sizeOff) issues.push('body_movement');

  let jump = false;
  if (context.prevCenter && box.width > 0) {
    const moved = Math.hypot(box.cx - context.prevCenter.x, box.cy - context.prevCenter.y);
    jump = moved > settings.jump * box.width;
  }

  return {
    issues,
    faces,
    box,
    jump,
    metrics: { yaw: angles.yaw, pitch: angles.pitch, ...eyes, cx: box.cx, cy: box.cy, width: box.width },
  };
}
