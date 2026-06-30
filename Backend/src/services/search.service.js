/**
 * search.service.js — Graph-expanded search utility.
 *
 * All search endpoints (jobs, gigs, freelancers) should call
 * `buildGraphSearchQuery()` instead of building their own regex/exact matchers.
 *
 * The expansion flow:
 *   1. Resolve the raw query to a SkillNode (handles aliases/synonyms).
 *   2. Collect the node itself + its ancestors + descendants + related skills.
 *   3. Return a MongoDB `$or` / `$in` filter ready to be spread into a query.
 */

const taxonomy = require('./taxonomy.service');

/**
 * Expand a raw search string and build a MongoDB $or query for skills/category.
 *
 * @param {string} q           Raw search input from the user
 * @param {string[]} fields    Document fields to match against (default: skills + category)
 * @returns {{ $or: object[] } | {}}  Mongo $or clause (empty object if q is empty)
 */
async function buildGraphSearchQuery(q, fields = ['skills', 'category']) {
  if (!q || !String(q).trim()) return {};

  const raw = String(q).trim();
  const expanded = await taxonomy.expandSearchTerms(raw);

  // Build a text regex for title/description search alongside the skill expansion
  const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const safeQ = escapeRegex(raw);
  const textRegex = new RegExp(safeQ, 'i');

  const clauses = [
    // Free-text match on title and description
    { title: textRegex },
    { description: textRegex },
  ];

  // Graph-expanded skill/category match
  if (expanded.length) {
    for (const field of fields) {
      if (field === 'skills') {
        // skills is an array field — use $in with all expanded names
        clauses.push({ skills: { $in: expanded } });
        // Also match the raw string case-insensitively for legacy data
        clauses.push({ skills: { $regex: safeQ, $options: 'i' } });
      } else {
        // category is a string field — use $in for exact match
        clauses.push({ [field]: { $in: expanded } });
        clauses.push({ [field]: { $regex: safeQ, $options: 'i' } });
      }
    }
  }

  return { $or: clauses };
}

/**
 * Build a skills-only $in filter (for freelancer profile search).
 * Returns both the expanded set AND the raw string as fallback.
 */
async function buildSkillsFilter(q) {
  if (!q || !String(q).trim()) return null;
  const expanded = await taxonomy.expandSearchTerms(String(q).trim());
  if (!expanded.length) return null;
  return { skills: { $in: expanded } };
}

module.exports = { buildGraphSearchQuery, buildSkillsFilter };
