const { getAIProvider } = require('../services/ai');
const FreelancerProfile = require('../models/FreelancerProfile');
const SkillTestAttempt = require('../models/SkillTestAttempt');
const { sendSuccess } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/helpers');
const { BadRequestError, NotFoundError } = require('../utils/apiError');
const { syncFreelancerVerification } = require('../services/verification.service');
const { isEasyMode, getProctorStrictness, TEST_LEVELS, resolveTestLevel } = require('../utils/skillTestDifficulty');

// Minimum per-skill score to be marked isVerified (unlocks applying to jobs/
// gigs gated on that skill — see utils/skillGating.js). Deliberately low: it
// only needs to filter out near-zero/random-guess attempts. Clearing it at a
// given test level marks the skill with that level's rank (Easy → Beginner,
// Intermediate → Intermediate, Expert → Expert) — the rank follows the level the
// freelancer picked, not the score (see TEST_LEVELS in utils/skillTestDifficulty.js).
const SKILL_VERIFICATION_THRESHOLD = 25;

// Attempts created before the level picker existed carry no level; they keep the
// old behaviour of ranking by score alone.
const rankFromScore = (percentage) => {
  if (percentage >= 80) return 'Expert';
  if (percentage >= 50) return 'Intermediate';
  return 'Beginner';
};

// LLMs reliably write the correct option first when generating MCQs, so
// without reshuffling, "A" ends up correct almost every time. correctAnswer
// is matched by its text everywhere downstream (not by index), so shuffling
// the options array is safe.
const shuffleOptions = (questions) => questions.map((q) => {
  if (q.type !== 'mcq' || !Array.isArray(q.options)) return q;
  const options = [...q.options];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { ...q, options };
});

/**
 * Generate a new skill test or resume existing one
 */
const generateTest = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { skill: specificSkill } = req.query; // Optional specific skill

  // The level the freelancer picked decides the question count and difficulty.
  // Missing → intermediate (older app builds don't send one); an unknown value
  // is rejected rather than silently swapped for a different test.
  const testLevel = resolveTestLevel(req.query.level);
  if (!testLevel) {
    throw new BadRequestError(`Invalid level. Choose one of: ${Object.keys(TEST_LEVELS).join(', ')}.`);
  }
  const questionCount = TEST_LEVELS[testLevel].questionCount;

  console.log(`[SkillTest] Generating ${testLevel} test (${questionCount} questions) for user ${userId}. Specific Skill: ${specificSkill || 'None (Baseline Mixed)'}`);

  // 1. ALWAYS delete any existing pending/evaluating test to ensure a fresh
  // start. This satisfies the requirement that we never resume old/stale
  // sessions, and also sweeps up an 'evaluating' row orphaned by a crash
  // between claiming it and the AI call finishing (see submitTest).
  await SkillTestAttempt.deleteMany({ userId, status: { $in: ['pending', 'evaluating'] } });

  // 2. Fetch LATEST profile without any potential caching
  const profile = await FreelancerProfile.findOne({ userId }).lean();
  if (!profile) throw new NotFoundError('Freelancer profile not found');

  let skillsToTest = [];

  if (specificSkill) {
    // Individual Skill Test mode
    const skillExists = profile.skills.some(s => s.name.toLowerCase() === specificSkill.toLowerCase());
    if (!skillExists) throw new BadRequestError(`Skill '${specificSkill}' not found in your profile`);

    skillsToTest = [specificSkill];
  } else {
    // Initial Baseline Mixed Test mode
    skillsToTest = profile.skills
      .filter(s => !s.isVerified)
      .map(s => s.name);

    if (skillsToTest.length === 0) {
      // If all verified, but they want a mixed test? Just use all skills.
      skillsToTest = profile.skills.map(s => s.name);
    }
  }

  if (skillsToTest.length === 0) {
    throw new BadRequestError('No skills found to test. Please add skills to your profile first.');
  }

  const ai = getAIProvider();
  console.log(`[SkillTest] AI generating ${questionCount} questions for: ${skillsToTest.join(', ')}`);
  
  let rawQuestions = [];
  let attempts = 0;
  let mcqFallback = false; // true if we accepted a test below the 65% MCQ target
  const MAX_GEN_ATTEMPTS = 2; // Reduced to 2 to save quota/tokens

  while (attempts < MAX_GEN_ATTEMPTS) {
    attempts++;
    try {
      rawQuestions = await ai.generateSkillTest(skillsToTest, questionCount, testLevel);

      // Validate MCQ distribution
      const mcqCount = rawQuestions.filter(q => q.type === 'mcq').length;
      const mcqPercentage = (mcqCount / rawQuestions.length) * 100;

      console.log(`[SkillTest] Generation Attempt ${attempts}: Generated ${rawQuestions.length} questions. MCQs: ${mcqCount} (${mcqPercentage.toFixed(1)}%)`);

      // If we met the requirement OR it's our last attempt, accept it
      if (mcqPercentage >= 65 || attempts >= MAX_GEN_ATTEMPTS) {
        if (mcqPercentage < 65) {
          mcqFallback = true;
          console.warn(`[SkillTest] MCQ percentage (${mcqPercentage.toFixed(1)}%) is below target, but using it to avoid further API calls.`);
        }
        break;
      }
      
      console.warn(`[SkillTest] MCQ percentage too low (${mcqPercentage.toFixed(1)}%). Regenerating once more...`);
    } catch (error) {
      console.error(`[SkillTest] Generation failed on attempt ${attempts}:`, error.message);
      
      // If we already have some questions from a previous attempt (rare), use them
      if (rawQuestions.length > 0) break;
      
      // If it's a rate limit or auth error, don't bother retrying this provider in the loop
      if (error.statusCode === 429 || error.statusCode === 401) {
        throw error; // Re-throw so the RouterAIProvider can switch to next provider
      }
      
      if (attempts >= MAX_GEN_ATTEMPTS) throw error;
    }
  }

  // 4. Create a GUARANTEED NEW attempt in DB
  const attempt = await SkillTestAttempt.create({
    userId,
    skillsTested: skillsToTest,
    level: testLevel,
    // The AI occasionally over-delivers; the picked level promises an exact count.
    questions: shuffleOptions(rawQuestions.slice(0, questionCount)).map(q => ({
      ...q,
      userAnswer: '',
      score: 0,
      aiEvaluation: ''
    })),
    status: 'pending'
  });

  console.log(`[SkillTest] New attempt ${attempt._id} created for user ${userId}`);

  sendSuccess(res, {
    message: 'New skill test generated successfully',
    data: {
      questions: attempt.questions,
      skills: skillsToTest,
      level: testLevel,
      attemptId: attempt._id,
      mcqFallback, // UI can note the test mix is below the usual MCQ ratio
      easyMode: isEasyMode() // testing-only: tells the UI it's safe to reveal correct answers
    }
  });
});



/**
 * Submit test answers for evaluation with Level Granularity
 */
// Violation events are client-reported (browser-integrity + camera proctoring
// signals) — sanitize defensively rather than trusting the payload shape.
// 'looking_away' is kept only so older attempts stay valid; new attempts
// report head_turn / eyes_away / body_movement separately.
const VIOLATION_TYPES = ['tab_switch', 'window_blur', 'fullscreen_exit', 'no_face', 'multiple_faces', 'head_turn', 'eyes_away', 'body_movement', 'looking_away', 'other'];
const VIOLATION_SOURCES = ['browser', 'camera'];
const MAX_VIOLATIONS = 100;
const MOVEMENT_KEYS = ['face_missing', 'extra_face', 'head_turn', 'eyes_away', 'body_movement'];

// Live movement counters the candidate saw during the attempt (informational
// — strikes are what cancel a test). Only known keys, non-negative ints.
const sanitizeProctoringSummary = (summary) => {
  const src = summary && typeof summary === 'object' ? summary : {};
  const toCount = (v) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n > 0 ? Math.min(n, 100000) : 0;
  };
  const movements = {};
  for (const key of MOVEMENT_KEYS) movements[key] = toCount(src.movements?.[key]);
  return {
    // The server's own value at submit time, never the client's claim.
    strictness: getProctorStrictness(),
    movements,
    cameraStrikes: toCount(src.cameraStrikes),
    browserStrikes: toCount(src.browserStrikes),
  };
};

/**
 * GET /skill-tests/proctoring-config — the single proctoring knob
 * (SKILL_TEST_PROCTOR_STRICTNESS, 0–1). The frontend derives every
 * threshold from it, so changing difficulty needs only an env change +
 * restart — no web or APK rebuild.
 */
const getProctoringConfig = asyncHandler(async (req, res) => {
  sendSuccess(res, {
    message: 'Proctoring config',
    data: { strictness: getProctorStrictness() },
  });
});

const sanitizeViolations = (violations) => {
  if (!Array.isArray(violations)) return [];
  return violations.slice(0, MAX_VIOLATIONS).reduce((acc, v) => {
    if (!v || typeof v !== 'object') return acc;
    const type = VIOLATION_TYPES.includes(v.type) ? v.type : 'other';
    const source = VIOLATION_SOURCES.includes(v.source) ? v.source : 'browser';
    const reason = typeof v.reason === 'string' ? v.reason.slice(0, 300) : '';
    const at = new Date(v.at);
    acc.push({ type, source, reason, at: Number.isNaN(at.getTime()) ? new Date() : at });
    return acc;
  }, []);
};

const submitTest = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { answers: finalAnswers, violations, proctoring } = req.body;

  // Atomic claim — the per-question timer's auto-advance can call this
  // directly on timeout in the same window as a manual "Complete
  // Verification" click; only the request that actually flips
  // pending -> evaluating proceeds to call the (real-cost) AI provider.
  const pendingTest = await SkillTestAttempt.findOneAndUpdate(
    { userId, status: 'pending' },
    { $set: { status: 'evaluating' } },
    { new: true }
  );
  if (!pendingTest) throw new NotFoundError('No active test session found, or it is already being evaluated');

  // Map answers to the question structure
  const submissionData = pendingTest.questions.map((q, idx) => ({
    question: q.question,
    skill: q.skill,
    category: q.category,
    userAnswer: finalAnswers[idx] || ''
  }));

  const ai = getAIProvider();
  console.log(`Evaluating test for user ${userId} with ${submissionData.length} answers...`);

  let evaluationResult;
  try {
    evaluationResult = await ai.evaluateSkillTest(submissionData);
  } catch (err) {
    // Release the claim so the user isn't stuck unable to ever submit again.
    await SkillTestAttempt.updateOne({ _id: pendingTest._id, status: 'evaluating' }, { $set: { status: 'pending' } });
    throw err;
  }

  // Combine answers with evaluations
  const evaluatedQuestions = submissionData.map((ans, index) => ({
    ...ans,
    aiEvaluation: evaluationResult.evaluations[index]?.aiEvaluation || 'No feedback provided',
    score: evaluationResult.evaluations[index]?.score || 0
  }));

  // Calculate per-skill scores
  const skillScores = {};
  evaluatedQuestions.forEach(q => {
    const sName = q.skill || 'Unknown';
    if (!skillScores[sName]) {
      skillScores[sName] = { total: 0, count: 0 };
    }
    skillScores[sName].total += q.score;
    skillScores[sName].count += 1;
  });

  // The level the freelancer picked decides the rank a verified skill earns.
  const pickedLevel = TEST_LEVELS[pendingTest.level] || null;
  const rankFor = (percentage) => (pickedLevel ? pickedLevel.rank : rankFromScore(percentage));

  const skillResults = {};
  for (const skill in skillScores) {
    const avg = skillScores[skill].total / skillScores[skill].count;
    const percentage = avg * 100;

    // "Verified" (unlocks job/gig applications gated on this skill) means the
    // freelancer actually attempted and cleared a sanity floor. A near-zero
    // score (e.g. random guessing on MCQs) stays unverified and earns no rank.
    const isVerified = percentage >= SKILL_VERIFICATION_THRESHOLD;
    skillResults[skill] = { percentage, level: rankFor(percentage), isVerified };
  }

  // Calculate overall performance manually to ensure no NaN errors
  const avgFromQuestions = evaluatedQuestions.length > 0
    ? evaluatedQuestions.reduce((sum, q) => sum + (q.score || 0), 0) / evaluatedQuestions.length
    : 0;

  const totalScore = avgFromQuestions * 100;
  const overallVerified = totalScore >= SKILL_VERIFICATION_THRESHOLD;
  const awardedRank = overallVerified ? rankFor(totalScore) : null;

  // 1. Update attempt record (`passed` = verified at the picked level)
  pendingTest.questions = evaluatedQuestions;
  pendingTest.totalScore = totalScore;
  pendingTest.passed = overallVerified;
  pendingTest.status = overallVerified ? 'completed' : 'failed';
  pendingTest.completedAt = new Date();
  pendingTest.violations = sanitizeViolations(violations);
  pendingTest.proctoring = sanitizeProctoringSummary(proctoring);
  await pendingTest.save();

  // 2. Update Freelancer Profile skills with Level & Expiration Independently
  const profile = await FreelancerProfile.findOne({ userId });
  if (profile) {
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + 6); // 6 months validity

    profile.skills.forEach(skill => {
      // Find the specific result for this skill
      const res = skillResults[skill.name];
      if (res) {
        skill.lastTestedAt = new Date();

        if (res.isVerified) {
          // Only a verified result earns the picked level's rank.
          skill.level = res.level;
          skill.verificationScore = res.percentage;
          skill.isVerified = true;
          skill.expiresAt = expirationDate;
        } else if (!skill.isVerified) {
          // Never verified: just record this attempt's score. A skill that is
          // already verified keeps its verification, rank and score — failing a
          // (say, higher-level) retake must not take away what was earned.
          skill.verificationScore = res.percentage;
        }
      }
    });

    await profile.save();
    
    // Sync verification status checklist
    await syncFreelancerVerification(userId);
  }

  const scoreMsg = totalScore.toFixed(1);
  const levelLabel = pickedLevel ? pickedLevel.label : awardedRank;
  const message = overallVerified
    ? `Verified at the ${levelLabel} level (${scoreMsg}%). Your tested skills are now marked ${awardedRank} and you can apply to work that requires them.`
    : `Test completed with a score of ${scoreMsg}%, which is too low to verify this skill. Retake the test and score at least ${SKILL_VERIFICATION_THRESHOLD}% to unlock applying to work that requires it.`;

  sendSuccess(res, {
    message,
    data: {
      score: totalScore,
      // The rank earned — the picked level's rank when verified. Not verified →
      // 'Beginner' only so clients that always read a string keep working.
      level: awardedRank || 'Beginner',
      testLevel: pendingTest.level || null, // 'easy' | 'intermediate' | 'expert' (null for pre-picker attempts)
      passed: overallVerified,
      verified: overallVerified,
      skillScores: skillResults, // Passing this if frontend wants to use it later
      attemptId: pendingTest._id
    }
  });
});

/**
 * Get test history for a user
 */
const getTestHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const history = await SkillTestAttempt.find({ userId }).sort({ createdAt: -1 });
  sendSuccess(res, { data: history });
});

module.exports = {
  generateTest,
  getProctoringConfig,
  submitTest,
  getTestHistory
};
