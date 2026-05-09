const { getAIProvider } = require('../services/ai');
const FreelancerProfile = require('../models/FreelancerProfile');
const SkillTestAttempt = require('../models/SkillTestAttempt');
const { sendSuccess, sendCreated } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/helpers');
const { BadRequestError, NotFoundError } = require('../utils/apiError');

/**
 * Generate a new skill test or resume existing one
 */
const generateTest = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // 1. Check for existing pending test to support RESUME
  const pendingTest = await SkillTestAttempt.findOne({ userId, status: 'pending' });
  if (pendingTest) {
    return sendSuccess(res, {
      message: 'Resuming your pending test',
      data: { 
        questions: pendingTest.questions, 
        skills: pendingTest.skillsTested,
        answers: pendingTest.answers,
        attemptId: pendingTest._id
      }
    });
  }

  const profile = await FreelancerProfile.findOne({ userId });
  if (!profile) throw new NotFoundError('Freelancer profile not found');

  // Identify unverified skills
  const unverifiedSkills = profile.skills.filter(s => !s.isVerified).map(s => s.name);

  if (unverifiedSkills.length === 0) {
    return sendSuccess(res, { message: 'All skills are already verified!', data: { questions: [] } });
  }

  const ai = getAIProvider();
  
  // Question count logic: 5-10 per skill, capped at 50 for performance
  const questionCount = Math.min(Math.max(unverifiedSkills.length * 5, 10), 50);

  console.log(`Generating unique test for user ${userId}...`);
  const rawQuestions = await ai.generateSkillTest(unverifiedSkills, questionCount);

  // 2. Initialize pending attempt in DB for PERSISTENCE
  const attempt = await SkillTestAttempt.create({
    userId,
    skillsTested: unverifiedSkills,
    questions: rawQuestions.map(q => ({ ...q, userAnswer: '', score: 0 })),
    status: 'pending'
  });

  sendSuccess(res, {
    message: 'New skill test generated successfully',
    data: { 
      questions: attempt.questions, 
      skills: unverifiedSkills,
      attemptId: attempt._id 
    }
  });
});

/**
 * Save partial progress
 */
const saveProgress = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { answers } = req.body; // Map of { questionIndex: answer }

  const pendingTest = await SkillTestAttempt.findOneAndUpdate(
    { userId, status: 'pending' },
    { $set: { answers } },
    { new: true }
  );

  if (!pendingTest) throw new NotFoundError('No active test found to save progress');

  sendSuccess(res, { message: 'Progress saved successfully' });
});

/**
 * Submit test answers for evaluation with Level Granularity
 */
const submitTest = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { answers: finalAnswers } = req.body; 

  const pendingTest = await SkillTestAttempt.findOne({ userId, status: 'pending' });
  if (!pendingTest) throw new NotFoundError('No active test session found');

  // Map answers to the question structure
  const submissionData = pendingTest.questions.map((q, idx) => ({
    question: q.question,
    skill: q.skill,
    category: q.category,
    userAnswer: finalAnswers[idx] || ''
  }));

  const ai = getAIProvider();
  console.log(`Evaluating test for user ${userId} with ${submissionData.length} answers...`);
  
  const evaluationResult = await ai.evaluateSkillTest(submissionData);

  // Combine answers with evaluations
  const evaluatedQuestions = submissionData.map((ans, index) => ({
    ...ans,
    aiEvaluation: evaluationResult.evaluations[index]?.aiEvaluation || 'No feedback provided',
    score: evaluationResult.evaluations[index]?.score || 0
  }));

  const totalScore = evaluationResult.averageScore * 100;
  
  // LEVEL GRANULARITY LOGIC
  // Beginner (0–49), Intermediate (50–79), Verified Expert (80–100)
  let assignedLevel = 'Beginner';
  let passed = false;

  if (totalScore >= 80) {
    assignedLevel = 'Expert';
    passed = true;
  } else if (totalScore >= 50) {
    assignedLevel = 'Intermediate';
  }

  // 1. Update attempt record
  pendingTest.questions = evaluatedQuestions;
  pendingTest.totalScore = totalScore;
  pendingTest.passed = passed;
  pendingTest.status = passed ? 'completed' : 'failed';
  pendingTest.completedAt = new Date();
  await pendingTest.save();

  // 2. Update Freelancer Profile skills with Level & Expiration
  const profile = await FreelancerProfile.findOne({ userId });
  if (profile) {
    const skillsTested = new Set(pendingTest.skillsTested);
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + 6); // 6 months validity

    profile.skills.forEach(skill => {
      if (skillsTested.has(skill.name)) {
        skill.level = assignedLevel;
        skill.verificationScore = totalScore;
        skill.lastTestedAt = new Date();
        
        if (passed) {
          skill.isVerified = true;
          skill.expiresAt = expirationDate;
        } else {
          skill.isVerified = false;
        }
      }
    });

    // Update overall verification status if at least one skill is verified expert
    const hasExpertSkill = profile.skills.some(s => s.isVerified && s.level === 'Expert');
    if (hasExpertSkill) {
      profile.verificationStatus = 'verified';
    }

    await profile.save();
  }

  sendSuccess(res, {
    message: passed 
      ? `Congratulations! You are now a Verified Expert with a score of ${totalScore.toFixed(1)}%.` 
      : `Test completed. You've been ranked as ${assignedLevel} (${totalScore.toFixed(1)}%). Score 80% to reach Expert status.`,
    data: {
      score: totalScore,
      level: assignedLevel,
      passed,
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
  saveProgress,
  submitTest,
  getTestHistory
};
