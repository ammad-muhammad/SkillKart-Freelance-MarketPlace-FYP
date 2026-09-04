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
 *
 * When the work also specifies a required experience level (Job.experienceLevel:
 * 'entry'|'intermediate'|'expert'), the matching verified skill's tested level
 * must meet or exceed it — a job posted for "expert" only accepts freelancers
 * verified at Expert in that skill; "intermediate" accepts Intermediate or
 * Expert; "entry" accepts any verified level (Beginner/Intermediate/Expert).
 */

const LEVEL_RANK = { entry: 1, beginner: 1, intermediate: 2, expert: 3 };
const levelRank = (level) => LEVEL_RANK[String(level || '').toLowerCase()] || 0;

/**
 * @returns {Promise<{ verifiedSkills: string[], verifiedSkillDetails: {name: string, level: string}[] }>}
 *          the freelancer's currently valid (non-expired) verified skills —
 *          as plain names, and again with their tested level attached.
 */
async function getVerifiedSkills(userId) {
  const profile = await FreelancerProfile.findOne({ userId }).select('skills').lean();
  if (!profile || !Array.isArray(profile.skills)) return { verifiedSkills: [], verifiedSkillDetails: [] };

  const now = Date.now();
  const valid = profile.skills.filter((s) => s.isVerified && (!s.expiresAt || new Date(s.expiresAt).getTime() > now));
  const verifiedSkills = valid.map((s) => s.name).filter(Boolean);
  const verifiedSkillDetails = valid.filter((s) => s.name).map((s) => ({ name: s.name, level: s.level }));

  return { verifiedSkills, verifiedSkillDetails };
}

/**
 * Decide whether a freelancer is allowed to offer/apply for work needing the
 * given required skills (+ optional category), optionally gated further by a
 * minimum required experience level.
 *
 * @param {string}   userId
 * @param {string[]} requiredSkills  skills attached to the gig/job
 * @param {string}   [category]      gig/job category (also matched as a skill)
 * @param {string}   [requiredLevel] job's experienceLevel ('entry'|'intermediate'|'expert') — omit/empty for no level gate
 * @returns {Promise<{ allowed: boolean, verifiedSkills: string[], required: string[], requiredLevel: string }>}
 */
async function checkSkillGate(userId, requiredSkills = [], category = '', requiredLevel = '') {
  const { verifiedSkills, verifiedSkillDetails } = await getVerifiedSkills(userId);

  // The set of things that, if verified, unlock this work.
  const required = [...(Array.isArray(requiredSkills) ? requiredSkills : []), category].filter(Boolean);

  // No required skills/category specified → nothing to gate against; allow.
  if (required.length === 0) return { allowed: true, verifiedSkills, required: [], requiredLevel: '' };

  const { checkSkillCoverage } = require('../services/skillMatching.service');
  const minRank = levelRank(requiredLevel);

  if (minRank === 0) {
    // No level requirement on this work — any verified match (any level) unlocks it.
    const allowed = await checkSkillCoverage(required, verifiedSkills);
    return { allowed, verifiedSkills, required, requiredLevel: '' };
  }

  // Level-gated: only verified skills whose tested level meets the bar count
  // toward coverage — a Beginner-verified skill can't unlock an Expert job.
  const eligibleNames = verifiedSkillDetails
    .filter((d) => levelRank(d.level) >= minRank)
    .map((d) => d.name);

  const allowed = eligibleNames.length > 0 && await checkSkillCoverage(required, eligibleNames);

  return { allowed, verifiedSkills, required, requiredLevel };
}

module.exports = { getVerifiedSkills, checkSkillGate };
