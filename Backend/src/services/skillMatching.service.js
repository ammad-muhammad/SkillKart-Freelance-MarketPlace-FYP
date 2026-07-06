/**
 * skillMatching.service.js
 * 
 * Universal Skill Matching System (3-Layer Architecture)
 * 
 * Layer 1: Taxonomy Graph (Source of Truth)
 * Layer 2: Autonomous Taxonomy Enrichment (Queue unknown skills)
 * Layer 3: Extremely Conservative Fallback (String normalization)
 */

const TaxonomyService = require('./taxonomy.service');

const CACHE_TTL = 15 * 60 * 1000;
const _matchCache = new Map();

function getCacheKey(req, ver) {
  return `${req}:::${ver}`;
}

const norm = (s) => String(s || '').trim().toLowerCase();

/**
 * Normalizes punctuation, whitespace, and very strictly singularizes.
 * Used for Layer 3 fallback ONLY. No generic fluff stripping.
 */
function strictNormalize(str) {
  let s = norm(str);
  s = s.replace(/[^\w\s]/g, ' '); // remove punctuation
  s = s.replace(/\s+/g, ' ').trim(); // normalize whitespace
  
  // Strict plural stripping: only if ending in 's', not 'ss', and length > 3
  if (s.length > 3 && s.endsWith('s') && !s.endsWith('ss')) {
    s = s.slice(0, -1);
  }
  return s;
}

/**
 * isSkillSatisfied
 * Evaluates if `verifiedSkill` adequately covers `requiredSkill`.
 */
async function isSkillSatisfied(requiredSkill, verifiedSkill) {
  if (!requiredSkill || !verifiedSkill) return false;

  const reqNorm = norm(requiredSkill);
  const verNorm = norm(verifiedSkill);
  
  // Simple suffix handling: e.g., "JavaScript Development" matches "JavaScript"
  if (reqNorm.endsWith(' development') && verNorm === reqNorm.replace(' development', '')) {
  return true;
}
if (reqNorm === verNorm) return true;

  const cacheKey = getCacheKey(reqNorm, verNorm);
  const cached = _matchCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.result;

  const setResult = (res) => {
    _matchCache.set(cacheKey, { result: res, expires: Date.now() + CACHE_TTL });
    return res;
  };

  try {
    // Layer 1: Taxonomy Matching
    const reqNode = await TaxonomyService.resolveCanonical(reqNorm);
    const verNode = await TaxonomyService.resolveCanonical(verNorm);

    // If both nodes are known to the taxonomy
    if (reqNode && verNode) {
      const reqId = String(reqNode._id);
      const verId = String(verNode._id);

      // Canonical Alias / Synonym Match
      if (reqId === verId) {
        return setResult(true);
      }

      // Hierarchy Match: Verified skill is a parent/ancestor of required skill (ver covers req)
      // i.e., Required skill is a descendant of Verified skill.
      const descendants = await TaxonomyService.getDescendants(verId);
      if (descendants.some(d => String(d._id) === reqId)) {
        return setResult(true);
      }
      
      // Related/Semantics Match
      // Related/Semantics Match (Only SIMILAR_TO, strictly NOT RELATED_TO)
      const mongoose = require('mongoose');
      const SkillRelationship = mongoose.model('SkillRelationship');
      const similarEdge = await SkillRelationship.findOne({
        $or: [
          { from: verId, to: reqId, type: 'SIMILAR_TO' },
          { from: reqId, to: verId, type: 'SIMILAR_TO' }
        ]
      }).lean();
      
      if (similarEdge) {
        return setResult(true);
      }
      
      // If both are in taxonomy but no structural relationship exists, they do NOT match.
      return setResult(false);
    }

    // Layer 2: Autonomous Taxonomy Enrichment
    // If either node is completely unknown to the system, queue it for AI enrichment.
    const unknownSkills = [];
    if (!reqNode) unknownSkills.push(reqNorm);
    if (!verNode) unknownSkills.push(verNorm);
    
    if (unknownSkills.length > 0) {
      // Fire-and-forget: do not await/block.
      TaxonomyService.proposeUnrecognizedSkills(unknownSkills, 'Universal Matching').catch(() => {});
    }

    // Layer 3: Extremely Conservative Fallback
    // Only applied if at least one skill is unknown to the taxonomy.
    const reqStrict = strictNormalize(requiredSkill);
    const verStrict = strictNormalize(verifiedSkill);
    
    if (reqStrict === verStrict) {
      return setResult(true);
    }

    return setResult(false);
  } catch (error) {
    console.error('[SkillMatching] Error during skill matching:', error.message);
    // On error, degrade to strict fallback rather than blocking
    return setResult(strictNormalize(requiredSkill) === strictNormalize(verifiedSkill));
  }
}

/**
 * checkSkillCoverage
 * Evaluates if an array of verified skills satisfies an array of required skills.
 */
async function checkSkillCoverage(requiredSkills = [], verifiedSkills = []) {
  const required = requiredSkills.filter(Boolean);
  const verified = verifiedSkills.filter(Boolean);

  if (required.length === 0) return true;
  if (verified.length === 0) return false;

  // The freelancer must hold at least ONE verified skill that matches ANY required skill.
  const checks = [];
  for (const reqSkill of required) {
    for (const verSkill of verified) {
      checks.push(isSkillSatisfied(reqSkill, verSkill));
    }
  }

  // Execute concurrently for speed, but return early if any resolves to true
  const results = await Promise.all(checks);
  return results.some(res => res === true);
}

module.exports = {
  isSkillSatisfied,
  checkSkillCoverage,
  strictNormalize
};
