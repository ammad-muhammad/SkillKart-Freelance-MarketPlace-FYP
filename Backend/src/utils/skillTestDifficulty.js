// Testing-only override for AI-generated skill test difficulty. Never enable
// in production — it also causes the frontend to reveal the correct MCQ
// answer (see skillTest.controller.js's `easyMode` response flag).
const isEasyMode = () => /^(1|true|yes)$/i.test(process.env.SKILL_TEST_EASY_MODE || '');

// The level the freelancer picks before a test: it sets how many questions they
// get and how hard the AI writes them. Keep the keys in sync with
// Front-end/src/pages/freelancer/SkillTest.jsx's TEST_LEVELS (the page shows
// the same counts up front).
//   label — how the level is named to the freelancer
//   rank  — the skill level (FreelancerProfile.skills[].level) a verified result
//           at this test level is marked with: the level picked IS the rank
//           earned, not something derived from the score.
const TEST_LEVELS = {
  easy: {
    label: 'Easy',
    rank: 'Beginner',
    questionCount: 5,
    difficulty: 'The difficulty should be EASY: simple, well-known, beginner-level questions about the core basics of the skill. Avoid tricky, edge-case, or advanced questions.',
  },
  intermediate: {
    label: 'Intermediate',
    rank: 'Intermediate',
    questionCount: 10,
    difficulty: 'The difficulty should be INTERMEDIATE: practical, working-knowledge questions a competent practitioner with a year or two of experience would answer. Not trivial basics, not obscure edge cases.',
  },
  expert: {
    label: 'Expert',
    rank: 'Expert',
    questionCount: 15,
    difficulty: 'The difficulty should be EXPERT: challenging, in-depth questions covering advanced concepts, trade-offs, best practices and subtle edge cases that only a senior practitioner would reliably get right.',
  },
};
const DEFAULT_TEST_LEVEL = 'intermediate';

/** Normalised level key; unset → the default, an unknown value → null (caller rejects it). */
const resolveTestLevel = (raw) => {
  if (raw === undefined || raw === null || String(raw).trim() === '') return DEFAULT_TEST_LEVEL;
  const key = String(raw).trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(TEST_LEVELS, key) ? key : null;
};

// SKILL_TEST_EASY_MODE (testing only) overrides the picked level's difficulty.
const difficultyInstruction = (level = DEFAULT_TEST_LEVEL) => (isEasyMode()
  ? 'The difficulty should be VERY EASY: simple, well-known, beginner-level questions that anyone with basic familiarity with the skill can answer immediately. Avoid tricky, edge-case, or advanced questions.'
  : (TEST_LEVELS[level] || TEST_LEVELS[DEFAULT_TEST_LEVEL]).difficulty);

// ~80% of a test is multiple choice; the rest is short written answers. Spelled
// out per count in the AI prompts so a 5-question test isn't asked for "20 of 25".
const mcqCountFor = (count) => Math.ceil(count * 0.8);

// Skill-test proctoring strictness — ONE number, 0 to 1, that the frontend
// turns into its proctoring settings (see
// Front-end/src/pages/freelancer/proctoring/strictness.js): 0 = proctoring
// off; otherwise the camera rule is fixed (no face for 3s) and the number
// sets the tab-switch strike limit. Unset or invalid falls back to medium
// rather than off, so a typo can never silently disable proctoring.
const DEFAULT_PROCTOR_STRICTNESS = 0.5;
const getProctorStrictness = () => {
  const raw = process.env.SKILL_TEST_PROCTOR_STRICTNESS;
  if (raw === undefined || String(raw).trim() === '') return DEFAULT_PROCTOR_STRICTNESS;
  const value = Number(raw);
  if (!Number.isFinite(value)) return DEFAULT_PROCTOR_STRICTNESS;
  return Math.min(1, Math.max(0, Math.round(value * 1000) / 1000));
};

module.exports = {
  isEasyMode,
  TEST_LEVELS,
  DEFAULT_TEST_LEVEL,
  resolveTestLevel,
  difficultyInstruction,
  mcqCountFor,
  getProctorStrictness,
  DEFAULT_PROCTOR_STRICTNESS,
};
