const User = require('../models/User');
const FreelancerProfile = require('../models/FreelancerProfile');
const notifications = require('./notification.service');

/**
 * A skill verification is valid for six months (`expiresAt`, set when the skill
 * test is passed). The skill gate (utils/skillGating.js) has always checked the
 * date, but `isVerified` itself used to stay true forever, so a lapsed skill
 * kept the "verified" tick, kept the profile "verified", and kept counting as
 * tested in search and matchmaking. This flips lapsed skills back to
 * unverified; the last score and rank are kept so the dashboard can still show
 * them next to the "Retake Test" button.
 * @returns {string[]} names of the skills that lapsed just now
 */
const expireLapsedSkills = (profile, now = new Date()) => {
  const lapsed = [];
  for (const skill of profile.skills || []) {
    if (skill.isVerified && skill.expiresAt && new Date(skill.expiresAt) <= now) {
      skill.isVerified = false;
      lapsed.push(skill.name);
    }
  }
  return lapsed;
};

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

  // Lapsed skills stop counting before anything below is calculated.
  const lapsedSkills = expireLapsedSkills(profile);

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

  // 4. All Skill Tests Passed
  // Logic: User must have at least one skill AND all existing skills must be tested
  // OR at least all added skills during onboarding must be verified.
  // Rule: each skill must be verified (skillTest.controller.js's SKILL_VERIFICATION_THRESHOLD,
  // currently 25%) — isVerified encodes that score floor, and lapsed skills were just
  // flipped back to unverified above, so don't re-check verificationScore against a
  // separate (stale) threshold here.
  const allSkillTestsPassed = profile.skills.length > 0 &&
                               profile.skills.every(s => s.isVerified);

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

  // Tell the freelancer — otherwise they simply lose the ability to apply for
  // work that needs the skill and don't know why. Fires once: the skill was
  // flipped to unverified above, so it can't lapse a second time.
  if (lapsedSkills.length > 0) {
    notifications.onSkillVerificationExpired(userId, { skills: lapsedSkills });
  }

  return {
    isVerified: isFullyVerified,
    verificationStatus: profile.verificationStatus,
    details: profile.verificationDetails,
    lapsedSkills
  };
};

/**
 * Daily sweep (see cron.service.js): expire lapsed skill verifications for every
 * freelancer who has one, so public profiles, search ordering and matchmaking
 * stop treating them as tested even if their owner never opens the dashboard.
 * @returns {Promise<number>} how many profiles had at least one lapsed skill
 */
const expireLapsedVerifications = async () => {
  const profiles = await FreelancerProfile.find({
    skills: { $elemMatch: { isVerified: true, expiresAt: { $lte: new Date() } } }
  }).select('userId').lean();

  for (const { userId } of profiles) {
    try {
      await syncFreelancerVerification(userId);
    } catch (err) {
      console.error(`[verification] expiry sync failed for user ${userId}:`, err.message);
    }
  }
  return profiles.length;
};

module.exports = {
  syncFreelancerVerification,
  expireLapsedSkills,
  expireLapsedVerifications
};
