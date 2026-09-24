/**
 * Skill-test proctoring strictness → every threshold the test uses.
 *
 * The backend exposes ONE number, SKILL_TEST_PROCTOR_STRICTNESS (0–1, see
 * GET /skill-tests/proctoring-config). Everything below is derived from it
 * so there's a single knob to tune:
 *   0    → proctoring off entirely (no camera, nothing counted, never cancelled)
 *   0.2  → easy      0.5 → medium      0.7 → strict      1 → very strict
 * Values in between interpolate smoothly between those anchor points, so
 * 0.35 really is a little stricter than 0.3.
 */

export const DEFAULT_STRICTNESS = 0.5;

// Piecewise-linear curve through anchor points { strictness: value }. The 0
// anchor is only the "most lenient" end of the curve — strictness 0 itself
// turns proctoring off before any of this is consulted.
const curve = (anchors) => {
  const xs = Object.keys(anchors).map(Number).sort((a, b) => a - b);
  return (s) => {
    if (s <= xs[0]) return anchors[xs[0]];
    for (let i = 1; i < xs.length; i++) {
      if (s <= xs[i]) {
        const x0 = xs[i - 1];
        const x1 = xs[i];
        const t = (s - x0) / (x1 - x0);
        return anchors[x0] + (anchors[x1] - anchors[x0]) * t;
      }
    }
    return anchors[xs[xs.length - 1]];
  };
};

const CURVES = {
  // How often a camera frame is analysed.
  intervalMs: curve({ 0: 1600, 0.2: 1400, 0.5: 900, 0.7: 700, 1: 400 }),
  // How long a problem must continue before it becomes a strike.
  holdMs: curve({ 0: 8000, 0.2: 5000, 0.5: 3000, 0.7: 2000, 1: 1000 }),
  // After a strike, no new strike for this long (one long episode ≠ many strikes).
  cooldownMs: curve({ 0: 10000, 0.2: 8000, 0.5: 5000, 0.7: 4000, 1: 2500 }),
  // Head rotation allowed, in degrees (left/right, up/down).
  headYawDeg: curve({ 0: 50, 0.2: 38, 0.5: 26, 0.7: 20, 1: 12 }),
  headPitchDeg: curve({ 0: 45, 0.2: 35, 0.5: 25, 0.7: 20, 1: 14 }),
  // Eye-direction scores (MediaPipe blendshapes, 0–1) allowed. Looking DOWN
  // gets the most slack — reading the lower half of the screen or typing a
  // written answer is normal.
  eyeSide: curve({ 0: 0.92, 0.2: 0.82, 0.5: 0.68, 0.7: 0.58, 1: 0.45 }),
  eyeUp: curve({ 0: 0.9, 0.2: 0.8, 0.5: 0.65, 0.7: 0.55, 1: 0.45 }),
  eyeDown: curve({ 0: 0.97, 0.2: 0.9, 0.5: 0.8, 0.7: 0.72, 1: 0.62 }),
  // Face centre allowed off the frame centre (fraction of frame size).
  offCenter: curve({ 0: 0.48, 0.2: 0.42, 0.5: 0.3, 0.7: 0.22, 1: 0.15 }),
  // Face size change vs. the size at the start of the test (0.45 = up to
  // 45% bigger/smaller) — leaning in to a phone or sitting far back.
  sizeChange: curve({ 0: 1.0, 0.2: 0.7, 0.5: 0.45, 0.7: 0.35, 1: 0.25 }),
  // A jump bigger than this × face width between two frames counts as one
  // sudden body movement (informational — too brief to become a strike).
  jump: curve({ 0: 1.2, 0.2: 0.9, 0.5: 0.6, 0.7: 0.45, 1: 0.3 }),
  // Camera strikes allowed per question (10 questions @0.5 → 5).
  strikesPerQuestion: curve({ 0: 1.5, 0.2: 1.0, 0.5: 0.5, 0.7: 0.4, 1: 0.2 }),
  // Tab switch / window blur / leaving full-screen: cancelled on the Nth.
  browserStrikes: curve({ 0: 6, 0.2: 5, 0.5: 3, 0.7: 3, 1: 2 }),
};

/** Clamp anything the API sends into 0–1; unusable input → medium. */
export const normalizeStrictness = (value) => {
  const n = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(n)) return DEFAULT_STRICTNESS;
  return Math.min(1, Math.max(0, n));
};

/**
 * @param {number} rawStrictness 0–1
 * @returns {object} every proctoring threshold; `enabled: false` when 0.
 */
export function deriveProctoringSettings(rawStrictness) {
  const strictness = normalizeStrictness(rawStrictness);
  if (strictness === 0) {
    return { strictness, enabled: false, browserStrikes: 0, cameraStrikesFor: () => 0 };
  }
  const v = (key) => CURVES[key](strictness);
  const strikesPerQuestion = v('strikesPerQuestion');
  return {
    strictness,
    enabled: true,
    intervalMs: Math.round(v('intervalMs')),
    holdMs: Math.round(v('holdMs')),
    cooldownMs: Math.round(v('cooldownMs')),
    headYawDeg: v('headYawDeg'),
    headPitchDeg: v('headPitchDeg'),
    eyeSide: v('eyeSide'),
    eyeUp: v('eyeUp'),
    eyeDown: v('eyeDown'),
    offCenter: v('offCenter'),
    sizeChange: v('sizeChange'),
    jump: v('jump'),
    browserStrikes: Math.max(2, Math.round(v('browserStrikes'))),
    // Scales with test length — a 50-question test naturally has more
    // incidental movement than a 10-question one. Never fewer than 2, so a
    // single glitch can't cancel a test on its own.
    cameraStrikesFor: (questionCount) => Math.max(2, Math.round((questionCount || 0) * strikesPerQuestion)),
  };
}

/** Human label for the rules screen. */
export const strictnessLabel = (s) => {
  if (s === 0) return 'Off';
  if (s < 0.35) return 'Easy';
  if (s < 0.6) return 'Medium';
  if (s < 0.85) return 'Strict';
  return 'Very strict';
};
