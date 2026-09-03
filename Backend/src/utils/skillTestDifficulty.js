// Testing-only override for AI-generated skill test difficulty. Never enable
// in production — it also causes the frontend to reveal the correct MCQ
// answer (see skillTest.controller.js's `easyMode` response flag).
const isEasyMode = () => /^(1|true|yes)$/i.test(process.env.SKILL_TEST_EASY_MODE || '');

const difficultyInstruction = () => (isEasyMode()
  ? 'The difficulty should be VERY EASY: simple, well-known, beginner-level questions that anyone with basic familiarity with the skill can answer immediately. Avoid tricky, edge-case, or advanced questions.'
  : 'The difficulty should be moderate (not too hard, not too easy).');

module.exports = { isEasyMode, difficultyInstruction };
