const { getAIProvider } = require('../services/ai');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/helpers');
const { JOB_CATEGORIES, CATEGORY_GROUPS } = require('../utils/constants');
const taxonomy = require('../services/taxonomy.service');
const SkillNode = require('../models/SkillNode');
const SkillRelationship = require('../models/SkillRelationship');

/* ─────────────────────────────────────────────────────────────────────
   PUBLIC ENDPOINTS (no auth required)
───────────────────────────────────────────────────────────────────── */

/**
 * GET /skills/taxonomy
 * Returns the full static taxonomy (flat + grouped) from constants.
 * This endpoint is fast — served from memory, no DB call.
 */
exports.getTaxonomy = asyncHandler(async (req, res) => {
  const groups = Object.entries(CATEGORY_GROUPS).map(([industry, categories]) => ({
    industry,
    categories,
  }));
  sendSuccess(res, {
    message: 'Skill taxonomy',
    data: { categories: JOB_CATEGORIES, groups, total: JOB_CATEGORIES.length },
  });
});

/**
 * GET /skills/graph
 * Returns the full live graph (all active nodes + edges) for admin/export.
 */
exports.getFullGraph = asyncHandler(async (req, res) => {
  const data = await taxonomy.getFullGraph();
  sendSuccess(res, { message: 'Full skill graph', data });
});

/**
 * GET /skills/resolve?q=JS
 * Resolve an alias, synonym, or name to the canonical SkillNode.
 */
exports.resolveSkill = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) return sendError(res, 'Query parameter q is required', 400);
  const node = await taxonomy.resolveCanonical(q);
  if (!node) return sendError(res, `No skill found for "${q}"`, 404);
  sendSuccess(res, { message: 'Resolved', data: { node } });
});

/**
 * GET /skills/:slug/ancestors
 * Return parent categories/industries of a skill.
 */
exports.getAncestors = asyncHandler(async (req, res) => {
  const node = await SkillNode.findOne({ slug: req.params.slug, status: 'active' });
  if (!node) return sendError(res, 'Skill not found', 404);
  const ancestors = await taxonomy.getAncestors(node._id);
  sendSuccess(res, { message: 'Ancestors', data: { node, ancestors } });
});

/**
 * GET /skills/:slug/descendants
 * Return child skills under a category.
 */
exports.getDescendants = asyncHandler(async (req, res) => {
  const node = await SkillNode.findOne({ slug: req.params.slug, status: 'active' });
  if (!node) return sendError(res, 'Skill not found', 404);
  const descendants = await taxonomy.getDescendants(node._id);
  sendSuccess(res, { message: 'Descendants', data: { node, descendants } });
});

/**
 * GET /skills/:slug/prerequisites
 * Return skills that must be learned before this one.
 */
exports.getPrerequisites = asyncHandler(async (req, res) => {
  const node = await SkillNode.findOne({ slug: req.params.slug, status: 'active' });
  if (!node) return sendError(res, 'Skill not found', 404);
  const prerequisites = await taxonomy.getPrerequisites(node._id);
  sendSuccess(res, { message: 'Prerequisites', data: { node, prerequisites } });
});

/**
 * GET /skills/:slug/related
 * Return related skills (RELATED_TO, SIMILAR_TO, CHILD, USED_IN).
 */
exports.getRelated = asyncHandler(async (req, res) => {
  const node = await SkillNode.findOne({ slug: req.params.slug, status: 'active' });
  if (!node) return sendError(res, 'Skill not found', 404);
  const related = await taxonomy.getRelated(node._id);
  sendSuccess(res, { message: 'Related skills', data: { node, related } });
});

/**
 * GET /skills/:slug/recommendations
 * Return skills recommended after mastering this one.
 */
exports.getRecommendations = asyncHandler(async (req, res) => {
  const node = await SkillNode.findOne({ slug: req.params.slug, status: 'active' });
  if (!node) return sendError(res, 'Skill not found', 404);
  const recommendations = await taxonomy.getRecommendations(node._id);
  sendSuccess(res, { message: 'Recommendations', data: { node, recommendations } });
});

/**
 * GET /skills/:slug/learning-path
 * Return the ordered learning path (prerequisites first → target last).
 */
exports.getLearningPath = asyncHandler(async (req, res) => {
  const node = await SkillNode.findOne({ slug: req.params.slug, status: 'active' });
  if (!node) return sendError(res, 'Skill not found', 404);
  const path = await taxonomy.getLearningPath(node._id);
  sendSuccess(res, { message: 'Learning path', data: { node, path } });
});

/**
 * POST /skills/expand
 * Body: { query: "Web Developer" }
 * Returns the expanded set of skill/category names for DB $in queries.
 */
exports.expandQuery = asyncHandler(async (req, res) => {
  const { query } = req.body;
  if (!query) return sendError(res, 'query is required', 400);
  const terms = await taxonomy.expandSearchTerms(query);
  sendSuccess(res, { message: 'Expanded terms', data: { query, terms, count: terms.length } });
});

/**
 * GET /skills/tree
 * Returns the full live hierarchical taxonomy tree: Industries -> Categories -> Skills
 */
exports.getTaxonomyTree = asyncHandler(async (req, res) => {
  const tree = await taxonomy.getTaxonomyTree();
  sendSuccess(res, { message: 'Taxonomy tree', data: { tree } });
});

/* ─────────────────────────────────────────────────────────────────────
   AUTHENTICATED ENDPOINTS
───────────────────────────────────────────────────────────────────── */

/**
 * POST /skills/match-score
 * Body: { required: ["React", "TypeScript"], candidate: ["Next.js", "JavaScript"] }
 * Returns a 0–1 graph-aware match score with breakdown.
 */
exports.calcMatchScore = asyncHandler(async (req, res) => {
  const { required, candidate } = req.body;
  if (!Array.isArray(required) || !Array.isArray(candidate)) {
    return sendError(res, 'required and candidate must be arrays', 400);
  }
  const result = await taxonomy.calcMatchScore(required, candidate);
  sendSuccess(res, { message: 'Match score calculated', data: result });
});

/**
 * POST /skills/validate
 * Body: { input: "skill name" }
 * Validates a free-text skill input via AI and returns the canonical suggestion.
 */
exports.validateSkill = asyncHandler(async (req, res) => {
  const { input } = req.body;
  if (!input || input.trim().length === 0) {
    return sendError(res, 'Skill input is required', 400);
  }
  const ai = getAIProvider();
  const result = await ai.validateSkill(input);
  sendSuccess(res, { message: 'Skill validated successfully', data: result });
});
