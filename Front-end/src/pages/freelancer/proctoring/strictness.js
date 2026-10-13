/**
 * Skill-test proctoring settings.
 *
 * The backend exposes ONE number, SKILL_TEST_PROCTOR_STRICTNESS (0–1, see
 * GET /skill-tests/proctoring-config).
 *   0    → proctoring off entirely (no camera, tab switches never penalised)
 *   > 0  → proctoring on. The camera rule is fixed — no face in view for
 *          FACE_MISSING_MS cancels the test — and the number only sets how many
 *          tab-switch / window-blur / full-screen-exit strikes are tolerated
 *          (see browserStrikes below).
 */

export const DEFAULT_STRICTNESS = 0.5;

// No face in the camera for this long in a row → the test is cancelled.
export const FACE_MISSING_MS = 3000;
// How often a camera frame is analysed. Cancellation lands on the first check
// after FACE_MISSING_MS, so this is also the most it can overshoot by.
const DETECT_INTERVAL_MS = 700;

// Piecewise-linear curve through anchor points { strictness: value }.
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

// Tab switch / window blur / leaving full-screen: cancelled on the Nth.
const browserStrikesFor = curve({ 0: 6, 0.2: 5, 0.5: 3, 0.7: 3, 1: 2 });

/** Clamp anything the API sends into 0–1; unusable input → medium. */
export const normalizeStrictness = (value) => {
  const n = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(n)) return DEFAULT_STRICTNESS;
  return Math.min(1, Math.max(0, n));
};

/**
 * @param {number} rawStrictness 0–1
 * @returns {object} proctoring settings; `enabled: false` when 0.
 */
export function deriveProctoringSettings(rawStrictness) {
  const strictness = normalizeStrictness(rawStrictness);
  if (strictness === 0) {
    return { strictness, enabled: false, browserStrikes: 0 };
  }
  return {
    strictness,
    enabled: true,
    intervalMs: DETECT_INTERVAL_MS,
    holdMs: FACE_MISSING_MS,
    browserStrikes: Math.max(2, Math.round(browserStrikesFor(strictness))),
  };
}
