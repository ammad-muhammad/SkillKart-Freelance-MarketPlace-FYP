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

  console.log(`[SkillTest] Generating COMPLETELY NEW test for user ${userId}`);

  // 1. ALWAYS delete any existing pending test to ensure a fresh start
  // This satisfies the requirement that we never resume old/stale sessions
  await SkillTestAttempt.deleteMany({ userId, status: 'pending' });

  // 2. Fetch LATEST profile without any potential caching
  const profile = await FreelancerProfile.findOne({ userId }).lean();
  if (!profile) throw new NotFoundError('Freelancer profile not found');

  // Identify ALL skills that need testing (not verified as Expert)
  const skillsToTest = profile.skills
    .filter(s => !s.isVerified)
    .map(s => s.name);

  console.log(`[SkillTest] Skills identified for testing: ${skillsToTest.join(', ')}`);

  if (skillsToTest.length === 0) {
    return sendSuccess(res, { 
      message: 'All your skills are already verified as Expert!', 
      data: { questions: [], skills: [] } 
    });
  }

  const ai = getAIProvider();
  
  // Requirement: Minimum 25 questions, 70-80% MCQs
  const questionCount = Math.min(Math.max(skillsToTest.length * 8, 25), 50);

  console.log(`[SkillTest] AI generating ${questionCount} questions for user ${userId}...`);
  
  let rawQuestions = [];
  let attempts = 0;
  const MAX_GEN_ATTEMPTS = 2; // Reduced to 2 to save quota/tokens

  while (attempts < MAX_GEN_ATTEMPTS) {
    attempts++;
    try {
      rawQuestions = await ai.generateSkillTest(skillsToTest, questionCount);
      
      // Validate MCQ distribution
      const mcqCount = rawQuestions.filter(q => q.type === 'mcq').length;
      const mcqPercentage = (mcqCount / rawQuestions.length) * 100;

      console.log(`[SkillTest] Generation Attempt ${attempts}: Generated ${rawQuestions.length} questions. MCQs: ${mcqCount} (${mcqPercentage.toFixed(1)}%)`);

      // If we met the requirement OR it's our last attempt, accept it
      if (mcqPercentage >= 65 || attempts >= MAX_GEN_ATTEMPTS) {
        if (mcqPercentage < 65) {
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
    questions: rawQuestions.map(q => ({ 
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
      attemptId: attempt._id 
    }
  });
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

  const skillResults = {};
  for (const skill in skillScores) {
    const avg = skillScores[skill].total / skillScores[skill].count;
    const percentage = avg * 100;
    
    let level = 'Beginner';
    let isVerified = false;
    
    if (percentage >= 80) {
      level = 'Expert';
      isVerified = true;
    } else if (percentage >= 50) {
      level = 'Intermediate';
    }

    skillResults[skill] = { percentage, level, isVerified };
  }

  // Calculate overall performance manually to ensure no NaN errors
  const avgFromQuestions = evaluatedQuestions.length > 0 
    ? evaluatedQuestions.reduce((sum, q) => sum + (q.score || 0), 0) / evaluatedQuestions.length 
    : 0;

  const totalScore = avgFromQuestions * 100;
  const overallPassed = totalScore >= 80;
  const overallLevel = overallPassed ? 'Expert' : (totalScore >= 50 ? 'Intermediate' : 'Beginner');

  // 1. Update attempt record
  pendingTest.questions = evaluatedQuestions;
  pendingTest.totalScore = totalScore;
  pendingTest.passed = overallPassed;
  pendingTest.status = overallPassed ? 'completed' : 'failed';
  pendingTest.completedAt = new Date();
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
        skill.level = res.level;
        skill.verificationScore = res.percentage;
        skill.lastTestedAt = new Date();
        
        if (res.isVerified) {
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
    message: overallPassed 
      ? `Congratulations! You are now a Verified Expert with a score of ${totalScore.toFixed(1)}%.` 
      : `Test completed. You've been ranked as ${overallLevel} (${totalScore.toFixed(1)}%). Score 80% to reach Expert status.`,
    data: {
      score: totalScore,
      level: overallLevel,
      passed: overallPassed,
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
  submitTest,
  getTestHistory
};
