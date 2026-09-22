const FreelancerProfile = require('../models/FreelancerProfile');

/**
 * AI-style freelancer matchmaking.
 *
 * Scores REAL freelancer profiles against a project brief using an explainable,
 * deterministic model (skill overlap, budget/rate fit, rating, verification,
 * experience, availability) and emits human-readable reasoning notes per match.
 *
 * This is intentionally code-driven rather than one LLM call per freelancer:
 * it is instant, deterministic, free, and the reasoning is fully auditable —
 * which is exactly what a ranking engine needs. (An LLM pass could later enrich
 * the prose of `matchReasons`, but the score must stay reproducible.)
 */

const AVATAR_BGS = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#0ea5e9,#22d3ee)',
  'linear-gradient(135deg,#f59e0b,#f97316)',
  'linear-gradient(135deg,#10b981,#34d399)',
  'linear-gradient(135deg,#ec4899,#f43f5e)',
  'linear-gradient(135deg,#3b82f6,#6366f1)',
];


// Score candidates in bounded-size concurrent batches rather than either (a)
// one at a time — the original approach, which made 100-candidate matching
// take 30+ seconds — or (b) all 100 at once, which just moves the same
// problem into a thundering herd of thousands of simultaneous MongoDB
// queries against a single connection pool. A batch of 10 keeps real
// concurrency (each candidate's own skill-pair scoring is already
// parallelized inside calcMatchScore) without overwhelming the DB.
const MATCH_BATCH_SIZE = 10;
async function scoreInBatches(items, scoreFn) {
  const results = [];
  for (let i = 0; i < items.length; i += MATCH_BATCH_SIZE) {
    const batch = items.slice(i, i + MATCH_BATCH_SIZE);
    const batchResults = await Promise.all(batch.map((item, j) => scoreFn(item, i + j)));
    results.push(...batchResults);
  }
  return results;
}

const initials = (first, last, email) => {
  const a = (first || '').trim();
  const b = (last || '').trim();
  if (a || b) return `${a.charAt(0)}${b.charAt(0)}`.toUpperCase() || a.charAt(0).toUpperCase();
  return (email || '?').charAt(0).toUpperCase();
};

/**
 * Compute a 0–100 match score + reasoning for one freelancer profile using Skill Graph.
 * @param {object} profile - populated FreelancerProfile (userId populated)
 * @param {object} brief - { skills:[], budget:Number, timeline, title, description, category }
 */
const scoreFreelancer = async (profile, brief) => {
  const reasons = [];
  const fpSkills = (profile.skills || []).map((s) => (typeof s === 'object' ? s.name : s)).filter(Boolean);
  const wantSkills = (brief.skills || []).filter(Boolean);

  // --- Skill match (up to 50 pts) using the central TaxonomyService graph matching ---
  let skillScore = 0;
  if (wantSkills.length) {
    const taxonomy = require('./taxonomy.service');
    const graphMatch = await taxonomy.calcMatchScore(wantSkills, fpSkills);
    
    // Convert match ratio to score (0 to 50 scale)
    skillScore = Math.round(graphMatch.ratio * 50);

    if (graphMatch.matched.length > 0) {
      const matchNames = graphMatch.matched.map(m => m.required);
      reasons.push(`Direct matches for skills: ${matchNames.slice(0, 3).join(', ')}${matchNames.length > 3 ? '…' : ''}`);
    }
    if (graphMatch.partial.length > 0) {
      const partialDetails = graphMatch.partial.map(p => `${p.required} (via ${p.matched})`);
      reasons.push(`Graph-expanded matches: ${partialDetails.slice(0, 3).join(', ')}${partialDetails.length > 3 ? '…' : ''}`);
    }
    if (graphMatch.matched.length === 0 && graphMatch.partial.length === 0) {
      reasons.push('No matching skills found in graph taxonomy for your requirements, ranked on general profile strength');
    }
  } else {
    // No skills specified → give partial credit based on breadth of skills
    skillScore = Math.min(35, fpSkills.length * 5);
    reasons.push(`Brings ${fpSkills.length} relevant skill${fpSkills.length === 1 ? '' : 's'} to the table`);
  }

  // --- Verified skills bonus (up to 10 pts) ---
  const verifiedCount = (profile.skills || []).filter((s) => typeof s === 'object' && s.isVerified).length;
  const verifiedBonus = Math.min(10, verifiedCount * 3);
  if (verifiedCount) reasons.push(`${verifiedCount} AI-verified skill${verifiedCount === 1 ? '' : 's'} (passed skill tests)`);

  // --- Rating (up to 15 pts) ---
  const rating = profile.rating || profile.userId?.rating || 0;
  const ratingScore = Math.round((rating / 5) * 15);
  if (rating >= 4.5) reasons.push(`Top-rated freelancer at ${rating.toFixed(1)}★`);
  else if (rating > 0) reasons.push(`Rated ${rating.toFixed(1)}★ by previous clients`);

  // --- Experience / completed projects (up to 10 pts) ---
  const completed = profile.completedProjects || 0;
  const expScore = Math.min(10, Math.round(completed / 2));
  if (completed >= 10) reasons.push(`Proven track record: ${completed} completed projects`);
  else if (completed > 0) reasons.push(`${completed} completed project${completed === 1 ? '' : 's'} so far`);

  // --- Budget / rate fit (up to 15 pts) ---
  const rate = profile.hourlyRate || 0;
  const budget = Number(brief.budget) || 0;
  let budgetScore = 0;
  if (!budget || !rate) {
    budgetScore = 8; // neutral when unknown
  } else {
    // Treat budget as an approximate hourly ceiling proxy; closer/under = better.
    if (rate <= budget) {
      budgetScore = 15;
      reasons.push(`Within your budget at $${rate}/hr`);
    } else if (rate <= budget * 1.3) {
      budgetScore = 9;
      reasons.push(`Slightly above budget at $${rate}/hr — strong value`);
    } else {
      budgetScore = 3;
      reasons.push(`Premium rate at $${rate}/hr`);
    }
  }

  // --- Availability bonus (small) ---
  let availabilityBonus = 0;
  if (profile.availability === 'full-time') { availabilityBonus = 5; reasons.push('Available full-time'); }
  else if (profile.availability === 'part-time') { availabilityBonus = 3; }

  let total = skillScore + verifiedBonus + ratingScore + expScore + budgetScore + availabilityBonus;
  total = Math.max(0, Math.min(100, total));

  return { score: total, reasons, rating, rate, completed, skills: fpSkills, verifiedCount };
};

const availabilityLabel = (availability) => {
  switch (availability) {
    case 'full-time': return 'Available full-time';
    case 'part-time': return 'Available part-time';
    case 'contract': return 'Open to contract work';
    default: return 'Availability on request';
  }
};

/**
 * Find and rank freelancers for a project brief using graph matching.
 * @returns {Promise<{matches: Array, analysed: number}>}
 */
const matchFreelancers = async (brief, { limit = 8 } = {}) => {
  // Pull a reasonable candidate pool. Prefer verified/experienced first so that
  // when there are many freelancers we score the most promising ones.
  const candidates = await FreelancerProfile.find({})
    .populate('userId', 'firstName lastName email profilePicture rating')
    .sort({ verificationStatus: -1, rating: -1 })
    .limit(100);

  const validCandidates = candidates.filter((p) => p.userId); // skip orphaned profiles

  // Pre-warm the taxonomy caches for every skill name this run will need, in
  // a small handful of bulk queries, instead of letting each candidate's
  // scoring pass discover them one at a time. This is what actually fixes
  // matchmaking's multi-second latency — see taxonomy.service.js's
  // warmResolveCache/warmDirectRelationshipCache doc comments.
  const taxonomy = require('./taxonomy.service');
  const requiredSkillNames = (brief.skills || []).filter(Boolean);
  const allCandidateSkillNames = validCandidates.flatMap((p) =>
    (p.skills || []).map((s) => (typeof s === 'object' ? s.name : s)).filter(Boolean)
  );
  await taxonomy.warmResolveCache([...requiredSkillNames, ...allCandidateSkillNames]);

  const [requiredNodes, candidateNodes] = await Promise.all([
    Promise.all(requiredSkillNames.map((s) => taxonomy.resolveCanonical(s))),
    Promise.all([...new Set(allCandidateSkillNames)].map((s) => taxonomy.resolveCanonical(s))),
  ]);
  await taxonomy.warmDirectRelationshipCache(
    requiredNodes.filter(Boolean).map((n) => n._id),
    candidateNodes.filter(Boolean).map((n) => n._id)
  );

  const scored = await scoreInBatches(validCandidates, async (p, i) => {
    const { score, reasons, rating, rate, completed, skills, verifiedCount } = await scoreFreelancer(p, brief);
    const u = p.userId;
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || (u.email ? u.email.split('@')[0] : 'Freelancer');
    const estLow = rate ? rate * 8 : null; // rough estimate band (≈1 day)
    const estHigh = rate ? rate * 40 : null; // ≈1 week
    return {
      freelancer: {
        id: String(u._id || p._id),
        name: fullName,
        role: p.title || 'Freelancer',
        avatar: u.profilePicture ? null : initials(u.firstName, u.lastName, u.email),
        avatarUrl: u.profilePicture || null,
        avatarBg: AVATAR_BGS[i % AVATAR_BGS.length],
        isOnline: false,
        isVerified: p.verificationStatus === 'verified',
        rating: Number(rating) || 0,
        reviewCount: completed,
        hourlyRate: rate,
        projectsCompleted: completed,
        skills: skills,
        verifiedSkillCount: verifiedCount,
      },
      matchScore: score,
      matchReasons: reasons,
      estimatedCost: estLow && estHigh ? `$${estLow}–$${estHigh}` : 'Rate on request',
      availability: availabilityLabel(p.availability),
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);

  return { matches: scored.slice(0, limit), analysed: candidates.length };
};

module.exports = { matchFreelancers, scoreFreelancer };
