const FreelancerProfile = require('../models/FreelancerProfile');

/**
 * Skill-gating helper.
 *
 * A freelancer may only create a gig / apply to a job in an area they've proven.
 * The skill test records `isVerified: true` per skill name on the freelancer's
 * profile (and verifications expire after 6 months). The gig/job carries the
 * required `skills[]` (and a category). The rule: the freelancer must hold at
 * least ONE non-expired verified skill that matches one of the required skills
 * (or the category itself, when the freelancer listed the category as a skill).
 *
 * This keeps gating tied to what the test actually verifies, rather than a
 * brittle category→skill table.
 */

const norm = (s) => String(s || '').trim().toLowerCase();

/**
 * @returns {Promise<{ verifiedSkills: string[] }>} the freelancer's currently
 *          valid (non-expired) verified skill names.
 */
async function getVerifiedSkills(userId) {
  const profile = await FreelancerProfile.findOne({ userId }).select('skills').lean();
  if (!profile || !Array.isArray(profile.skills)) return { verifiedSkills: [] };

  const now = Date.now();
  const verifiedSkills = profile.skills
    .filter((s) => s.isVerified && (!s.expiresAt || new Date(s.expiresAt).getTime() > now))
    .map((s) => s.name)
    .filter(Boolean);

  return { verifiedSkills };
}

/**
 * Decide whether a freelancer is allowed to offer/apply for work needing the
 * given required skills (+ optional category).
 *
 * @param {string}   userId
 * @param {string[]} requiredSkills  skills attached to the gig/job
 * @param {string}   [category]      gig/job category (also matched as a skill)
 * @returns {Promise<{ allowed: boolean, verifiedSkills: string[], required: string[] }>}
 */
async function checkSkillGate(userId, requiredSkills = [], category = '') {
  const { verifiedSkills } = await getVerifiedSkills(userId);

  // The set of things that, if verified, unlock this work.
  const required = [...(Array.isArray(requiredSkills) ? requiredSkills : []), category]
    .map(norm)
    .filter(Boolean);

  // No required skills/category specified → nothing to gate against; allow.
  if (required.length === 0) return { allowed: true, verifiedSkills, required: [] };

  const verifiedSet = new Set(verifiedSkills.map(norm));
  const allowed = required.some((r) => verifiedSet.has(r));

  return { allowed, verifiedSkills, required };
}

module.exports = { getVerifiedSkills, checkSkillGate };
