// Testing-only override for AI-generated skill test difficulty. Never enable
// in production — it also causes the frontend to reveal the correct MCQ
// answer (see skillTest.controller.js's `easyMode` response flag).
const isEasyMode = () => /^(1|true|yes)$/i.test(process.env.SKILL_TEST_EASY_MODE || '');

const difficultyInstruction = () => (isEasyMode()
  ? 'The difficulty should be VERY EASY: simple, well-known, beginner-level questions that anyone with basic familiarity with the skill can answer immediately. Avoid tricky, edge-case, or advanced questions.'
  : 'The difficulty should be moderate (not too hard, not too easy).');

// Skill-test proctoring strictness — ONE number, 0 to 1, that the frontend
// turns into every camera/eye/head/body/tab-switch threshold (see
// Front-end/src/pages/freelancer/proctoring/strictness.js). 0 = proctoring
// off, 1 = very strict. Unset or invalid falls back to medium rather than
// off, so a typo can never silently disable proctoring.
const DEFAULT_PROCTOR_STRICTNESS = 0.5;
const getProctorStrictness = () => {
  const raw = process.env.SKILL_TEST_PROCTOR_STRICTNESS;
  if (raw === undefined || String(raw).trim() === '') return DEFAULT_PROCTOR_STRICTNESS;
  const value = Number(raw);
  if (!Number.isFinite(value)) return DEFAULT_PROCTOR_STRICTNESS;
  return Math.min(1, Math.max(0, Math.round(value * 1000) / 1000));
};

module.exports = { isEasyMode, difficultyInstruction, getProctorStrictness, DEFAULT_PROCTOR_STRICTNESS };
