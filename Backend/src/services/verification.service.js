const User = require('../models/User');
const FreelancerProfile = require('../models/FreelancerProfile');

/**
 * Synchronize and calculate freelancer verification status based on multi-condition checklist
 * @param {String} userId - User ID to sync
 * @returns {Object} Updated profile and verification results
 */
const syncFreelancerVerification = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  let profile = await FreelancerProfile.findOne({ userId });
  if (!profile) {
    profile = await FreelancerProfile.create({ userId });
  }

  // 1. Email Verified
  const emailVerified = !!user.isEmailVerified;

  // 2. Onboarding Completed
  const onboardingCompleted = !!user.isOnBoardingCompleted;

  // 3. Profile Completed (Required fields check)
  const hasBio = !!(profile.bio && profile.bio.trim().length >= 10);
  const hasTitle = !!(profile.title && profile.title.trim().length >= 3);
  const hasSkills = !!(profile.skills && profile.skills.length >= 1);
  const hasPortfolio = !!(profile.portfolio && profile.portfolio.length >= 1);
  const profileCompleted = hasBio && hasTitle && hasSkills && hasPortfolio;

  // 4. All Skill Tests Passed (Min 50% score requirement)
  // Logic: User must have at least one skill AND all existing skills must be tested
  // OR at least all added skills during onboarding must be verified.
  // Rule: each verified skill must score >= 50%.
  const allSkillTestsPassed = profile.skills.length > 0 && 
                               profile.skills.every(s => s.isVerified && s.verificationScore >= 50);

  // Update verification details
  profile.verificationDetails = {
    ...profile.verificationDetails,
    emailVerified,
    onboardingCompleted,
    profileCompleted,
    allSkillTestsPassed,
    // Identity, payment, etc. remain false until integrated later
  };

  // Calculate final verificationStatus
  // Rule: email + onboarding + profile + skills = VERIFIED
  const isFullyVerified = emailVerified && onboardingCompleted && profileCompleted && allSkillTestsPassed;
  
  if (isFullyVerified) {
    profile.verificationStatus = 'verified';
  } else if (onboardingCompleted || profile.skills.some(s => s.isVerified)) {
    profile.verificationStatus = 'pending';
  } else {
    profile.verificationStatus = 'unverified';
  }

  await profile.save();

  return {
    isVerified: isFullyVerified,
    verificationStatus: profile.verificationStatus,
    details: profile.verificationDetails
  };
};

module.exports = {
  syncFreelancerVerification
};
