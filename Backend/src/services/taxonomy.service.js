/**
 * TaxonomyService — the single source of truth for the Universal Skill Graph.
 *
 * Every platform feature (search, matching, recommendations, tests, AI,
 * learning paths, certifications) should call this service instead of
 * implementing its own category logic.
 *
 * Implementation notes
 * ─────────────────────
 * • MongoDB is used as the graph store.  Deep traversal uses $graphLookup
 *   (native recursive stage) so no client-side recursion is needed.
 * • Results are cached in-process (NodeJS Map) with a configurable TTL.
 *   This avoids N+1 round-trips for hot paths (search expansion happens on
 *   every search request).
 * • The service is stateless — instantiate once and export the singleton.
 */

const SkillNode         = require('../models/SkillNode');
const SkillRelationship = require('../models/SkillRelationship');

/* ── In-process cache ────────────────────────────────────────────────── */
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const _cache = new Map(); // key → { data, expiresAt }

function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _cache.delete(key); return null; }
  return entry.data;
}

function cacheSet(key, data) {
  _cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Invalidate the entire cache (call after any write operation). */
function invalidateCache() { _cache.clear(); }

/* ── Utilities ───────────────────────────────────────────────────────── */
const slugify = (s) =>
  String(s).toLowerCase().trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const norm = (s) => String(s || '').trim().toLowerCase();

/* ═══════════════════════════════════════════════════════════════════════
   GRAPH TRAVERSAL
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Return all nodes reachable from `startId` via the given relationship
 * types, up to `maxDepth` hops.  Uses MongoDB $graphLookup.
 */
async function traverseGraph(startId, relationshipTypes, maxDepth = 3) {
  const cacheKey = `traverse:${startId}:${relationshipTypes.join(',')}:${maxDepth}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  // $graphLookup: follow SkillRelationship.from edges whose `type` is in the set
  const pipeline = [
    { $match: { _id: typeof startId === 'string' ? require('mongoose').Types.ObjectId(startId) : startId } },
    {
      $graphLookup: {
        from: 'skillrelationships',
        startWith: '$_id',
        connectFromField: 'to',
        connectToField: 'from',
        as: 'edges',
        maxDepth: maxDepth - 1,
        depthField: 'depth',
        restrictSearchWithMatch: { type: { $in: relationshipTypes } },
      },
    },
    { $project: { edges: 1 } },
  ];

  const [result] = await SkillNode.aggregate(pipeline);
  if (!result || !result.edges || result.edges.length === 0) {
    cacheSet(cacheKey, []);
    return [];
  }

  // Collect unique `to` IDs then fetch the actual SkillNode documents
  const toIds = [...new Set(result.edges.map((e) => String(e.to)))];
  const nodes = await SkillNode.find({ _id: { $in: toIds }, status: 'active' }).lean();

  cacheSet(cacheKey, nodes);
  return nodes;
}

/**
 * Reverse traversal — find all nodes from which `endId` is reachable.
 */
async function traverseReverse(endId, relationshipTypes, maxDepth = 3) {
  const cacheKey = `rev:${endId}:${relationshipTypes.join(',')}:${maxDepth}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const pipeline = [
    { $match: { _id: typeof endId === 'string' ? require('mongoose').Types.ObjectId(endId) : endId } },
    {
      $graphLookup: {
        from: 'skillrelationships',
        startWith: '$_id',
        connectFromField: 'from',
        connectToField: 'to',
        as: 'edges',
        maxDepth: maxDepth - 1,
        depthField: 'depth',
        restrictSearchWithMatch: { type: { $in: relationshipTypes } },
      },
    },
    { $project: { edges: 1 } },
  ];

  const [result] = await SkillNode.aggregate(pipeline);
  if (!result || !result.edges || result.edges.length === 0) {
    cacheSet(cacheKey, []);
    return [];
  }

  const fromIds = [...new Set(result.edges.map((e) => String(e.from)))];
  const nodes = await SkillNode.find({ _id: { $in: fromIds }, status: 'active' }).lean();

  cacheSet(cacheKey, nodes);
  return nodes;
}

/* ═══════════════════════════════════════════════════════════════════════
   PUBLIC API
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Resolve a raw string (name / alias / synonym) to its canonical SkillNode.
 * Returns null if not found.
 */
async function resolveCanonical(term) {
  if (!term) return null;
  const cacheKey = `resolve:${norm(term)}`;
  const cached = cacheGet(cacheKey);
  if (cached !== null) return cached;

  let node = await SkillNode.resolveByName(term);

  // If found a merged node, follow the redirect once
  if (node && node.status === 'merged' && node.mergedInto) {
    node = await SkillNode.findById(node.mergedInto).lean();
  }

  cacheSet(cacheKey, node || null);
  return node;
}

/**
 * Return SkillNodes that are direct parents / ancestor categories of `nodeId`.
 * Traverses BELONGS_TO and PARENT edges upward.
 */
async function getAncestors(nodeId, maxDepth = 4) {
  return traverseGraph(nodeId, ['BELONGS_TO', 'PARENT'], maxDepth);
}

/**
 * Return SkillNodes that are children / descendants of `nodeId`.
 * Traverses CHILD and PART_OF edges downward.
 */
async function getDescendants(nodeId, maxDepth = 4) {
  return traverseGraph(nodeId, ['CHILD', 'PART_OF', 'SPECIALIZES_IN'], maxDepth);
}

/**
 * Return skills that must be learned before `nodeId` (PREREQUISITE edges).
 */
async function getPrerequisites(nodeId) {
  return traverseGraph(nodeId, ['PREREQUISITE', 'DEPENDS_ON'], 5);
}

/**
 * Return related skills (RELATED_TO, SIMILAR_TO edges in both directions).
 */
async function getRelated(nodeId, maxDepth = 2) {
  const [forward, reverse] = await Promise.all([
    traverseGraph(nodeId, ['RELATED_TO', 'SIMILAR_TO', 'CHILD', 'USED_IN'], maxDepth),
    traverseReverse(nodeId, ['RELATED_TO', 'SIMILAR_TO', 'USED_IN'], maxDepth),
  ]);
  // Deduplicate by _id string
  const seen = new Set();
  return [...forward, ...reverse].filter((n) => {
    const id = String(n._id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/**
 * Return what to learn next after `nodeId` (SUCCESSOR, CHILD edges).
 */
async function getRecommendations(nodeId) {
  const cacheKey = `rec:${nodeId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  // Direct relationships: what is built on top of this skill?
  const rels = await SkillRelationship.find({
    to: nodeId,
    type: { $in: ['PREREQUISITE', 'DEPENDS_ON'] },
  }).populate('from').lean();

  // Also include RELATED_TO in both directions
  const related = await getRelated(nodeId, 1);

  const direct = rels.map((r) => r.from).filter(Boolean);
  const all = [...direct, ...related];
  const seen = new Set([String(nodeId)]);
  const result = all.filter((n) => {
    const id = String(n._id);
    if (seen.has(id)) return false;
    seen.add(id);
    return n.status === 'active';
  }).slice(0, 12);

  cacheSet(cacheKey, result);
  return result;
}

/**
 * Generate an ordered learning path from prerequisites up to `targetNodeId`.
 * Returns skills in the order they should be learned (lowest-level first).
 */
async function getLearningPath(targetNodeId) {
  const cacheKey = `path:${targetNodeId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  // BFS over PREREQUISITE / DEPENDS_ON edges to build the dependency chain
  const visited = new Set();
  const queue = [String(targetNodeId)];
  const ordered = [];

  while (queue.length) {
    const currentId = queue.shift();
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const prereqs = await SkillRelationship.find({
      to: currentId,
      type: { $in: ['PREREQUISITE', 'DEPENDS_ON'] },
    }).populate('from').lean();

    for (const rel of prereqs) {
      if (rel.from && !visited.has(String(rel.from._id))) {
        queue.push(String(rel.from._id));
        ordered.push(rel.from);
      }
    }
  }

  // Reverse so fundamentals come first
  ordered.reverse();
  // Add the target itself at the end
  const target = await SkillNode.findById(targetNodeId).lean();
  if (target) ordered.push(target);

  cacheSet(cacheKey, ordered);
  return ordered;
}

/**
 * Given a list of skill name strings, infer which parent categories they belong to.
 * Returns an array of unique category names.
 */
async function inferCategories(skillNames) {
  if (!skillNames || skillNames.length === 0) return [];

  const cacheKey = `infer:${skillNames.sort().join(',')}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  // Resolve each name to a node, then get its ancestors
  const results = await Promise.all(
    skillNames.map(async (name) => {
      const node = await resolveCanonical(name);
      if (!node) return [];
      const ancestors = await getAncestors(node._id, 3);
      return ancestors.filter((n) => n.type === 'category').map((n) => n.name);
    })
  );

  const categories = [...new Set(results.flat())];
  cacheSet(cacheKey, categories);
  return categories;
}

/**
 * Expand a raw search query into a set of skill/category names for $in queries.
 *
 * Example: "Web Developer" →
 *   ["Web Development", "Frontend Development", "Backend Development",
 *    "JavaScript", "React", "Vue.js", "Angular", "Node.js", "PHP", ...]
 */
async function expandSearchTerms(query) {
  if (!query || !query.trim()) return [];

  const cacheKey = `expand:${norm(query)}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  // 1. Try to resolve the query to a canonical node
  const node = await resolveCanonical(query);

  let names = [];

  if (node) {
    // Gather: self + ancestors + descendants + related (2 hops)
    const [ancestors, descendants, related] = await Promise.all([
      getAncestors(node._id, 3),
      getDescendants(node._id, 3),
      getRelated(node._id, 2),
    ]);

    const all = [node, ...ancestors, ...descendants, ...related];
    names = [...new Set(all.map((n) => n.name))];
  } else {
    // Fuzzy fallback: text search across name, aliases, synonyms
    const fuzzy = await SkillNode.find({
      status: 'active',
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { aliases: { $regex: query, $options: 'i' } },
        { synonyms: { $regex: query, $options: 'i' } },
      ],
    }).lean();

    if (fuzzy.length > 0) {
      // Expand each fuzzy match up to 1 hop
      const expanded = await Promise.all(
        fuzzy.map(async (n) => {
          const rel = await getRelated(n._id, 1);
          return [n.name, ...rel.map((r) => r.name)];
        })
      );
      names = [...new Set(expanded.flat())];
    } else {
      // Last resort: return the original query so basic search still works
      names = [query];
    }
  }

  cacheSet(cacheKey, names);
  return names;
}

/* ═══════════════════════════════════════════════════════════════════════
   GRAPH-AWARE MATCHING
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Calculate a match score (0–1) between required skills and candidate skills.
 * Uses graph proximity to give partial credit for related skills.
 *
 * Score rules (per required skill):
 *   Exact match in candidate          → 1.0
 *   Candidate is a child/descendant   → 0.85  (Next.js satisfies React)
 *   Candidate is a parent/ancestor    → 0.70  (JavaScript satisfies React requirement loosely)
 *   Candidate is RELATED_TO (1 hop)   → 0.55
 *   Candidate is RELATED_TO (2 hops)  → 0.35
 *   No graph connection               → 0.0
 */
async function calcMatchScore(requiredSkillNames, candidateSkillNames) {
  if (!requiredSkillNames || requiredSkillNames.length === 0) {
    return { score: 0.5, matched: [], partial: [], missed: [], ratio: 0.5 };
  }

  const matched = [];
  const partial = [];
  const missed = [];
  let totalWeight = 0;

  for (const req of requiredSkillNames) {
    const reqNode = await resolveCanonical(req);
    let bestScore = 0;
    let bestMatch = null;

    for (const cand of candidateSkillNames) {
      const candNode = await resolveCanonical(cand);
      if (!reqNode || !candNode) {
        // Fall back to string comparison
        if (norm(req) === norm(cand)) { bestScore = 1.0; bestMatch = cand; }
        continue;
      }

      // Exact same node
      if (String(reqNode._id) === String(candNode._id)) {
        bestScore = 1.0; bestMatch = cand; break;
      }

      // Is the candidate a child/descendant of required? (e.g. Next.js → React)
      const reqDescendants = await getDescendants(reqNode._id, 2);
      if (reqDescendants.some((d) => String(d._id) === String(candNode._id))) {
        if (0.85 > bestScore) { bestScore = 0.85; bestMatch = cand; }
        continue;
      }

      // Does candidate depend on or have the required node as a prerequisite? (e.g. Next.js depends on React)
      const candPrereqs = await getPrerequisites(candNode._id);
      if (candPrereqs.some((p) => String(p._id) === String(reqNode._id))) {
        if (0.85 > bestScore) { bestScore = 0.85; bestMatch = cand; }
        continue;
      }

      // Is the candidate a parent/ancestor of required? (e.g. JavaScript → React)
      const reqAncestors = await getAncestors(reqNode._id, 2);
      if (reqAncestors.some((a) => String(a._id) === String(candNode._id))) {
        if (0.70 > bestScore) { bestScore = 0.70; bestMatch = cand; }
        continue;
      }

      // Is the candidate a prerequisite of the required skill? (e.g. React candidate satisfies Next.js required loosely)
      const reqPrereqs = await getPrerequisites(reqNode._id);
      if (reqPrereqs.some((p) => String(p._id) === String(candNode._id))) {
        if (0.70 > bestScore) { bestScore = 0.70; bestMatch = cand; }
        continue;
      }

      // 1-hop RELATED_TO
      const directRel = await SkillRelationship.findOne({
        $or: [
          { from: reqNode._id, to: candNode._id, type: { $in: ['RELATED_TO', 'SIMILAR_TO'] } },
          { from: candNode._id, to: reqNode._id, type: { $in: ['RELATED_TO', 'SIMILAR_TO'] } },
        ],
      });
      if (directRel) {
        const ws = 0.55 * (directRel.weight || 1);
        if (ws > bestScore) { bestScore = ws; bestMatch = cand; }
        continue;
      }
    }

    totalWeight += bestScore;

    if (bestScore >= 1.0) matched.push({ required: req, matched: bestMatch, score: bestScore });
    else if (bestScore > 0) partial.push({ required: req, matched: bestMatch, score: bestScore });
    else missed.push(req);
  }

  const ratio = totalWeight / requiredSkillNames.length;
  return {
    score: Math.round(ratio * 100) / 100,
    matched,
    partial,
    missed,
    ratio,
  };
}

/**
 * Which categories does passing a skill test for `skillName` propagate to?
 * Used by the certification system to boost profile scores.
 */
async function getCertificationImpact(skillName) {
  const node = await resolveCanonical(skillName);
  if (!node) return { categories: [], industries: [] };

  const ancestors = await getAncestors(node._id, 4);
  const categories = ancestors.filter((n) => n.type === 'category').map((n) => n.name);
  const industries = ancestors.filter((n) => n.type === 'industry').map((n) => n.name);

  return { categories, industries };
}

/* ═══════════════════════════════════════════════════════════════════════
   ADMIN HELPERS
   ═══════════════════════════════════════════════════════════════════════ */

/** Create a SkillNode — invalidates cache. */
async function createNode(data) {
  const node = await SkillNode.create({
    ...data,
    slug: slugify(data.name),
  });
  invalidateCache();
  return node;
}

/** Create a SkillRelationship — invalidates cache. */
async function createRelationship(fromId, toId, type, weight = 1.0, metadata = {}) {
  const rel = await SkillRelationship.create({ from: fromId, to: toId, type, weight, metadata });
  invalidateCache();
  return rel;
}

/** Merge `sourceId` into `targetId` — all edges from source are transferred. */
async function mergeNodes(sourceId, targetId) {
  // Move all relationships
  await SkillRelationship.updateMany({ from: sourceId }, { from: targetId });
  await SkillRelationship.updateMany({ to: sourceId }, { to: targetId });
  // Mark source as merged
  await SkillNode.findByIdAndUpdate(sourceId, { status: 'merged', mergedInto: targetId });
  invalidateCache();
}

/** Return all active nodes and relationships in the graph. */
async function getFullGraph() {
  const [nodes, relationships] = await Promise.all([
    SkillNode.find({ status: 'active' }).lean(),
    SkillRelationship.find().lean()
  ]);
  return { nodes, relationships };
}

/** Return the full hierarchical tree: Industry -> Categories -> Subcategories -> Skills (strictly de-duplicated) */
async function getTaxonomyTree() {
  const cacheKey = 'taxonomy:tree';
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const User = require('../models/User');
  const Gig = require('../models/Gig');
  const Job = require('../models/Job');
  const FreelancerProfile = require('../models/FreelancerProfile');

  const [nodes, relationships, activeUsers, gigsRaw, jobsRaw, freelancersRaw] = await Promise.all([
    SkillNode.find({ status: 'active' }).lean(),
    SkillRelationship.find({ type: { $in: ['BELONGS_TO', 'CHILD'] } }).lean(),
    User.find({ isActive: true }).select('_id role').lean(),
    Gig.find({ status: 'active' }).select('category skills freelancerId').lean(),
    Job.find({ status: 'open' }).select('category skills clientId').lean(),
    FreelancerProfile.find().select('skills userId').lean()
  ]);

  const activeFreelancerIds = new Set(activeUsers.filter(u => u.role === 'freelancer').map(u => String(u._id)));
  const activeClientIds = new Set(activeUsers.filter(u => u.role === 'client').map(u => String(u._id)));

  const gigs = gigsRaw.filter(g => activeFreelancerIds.has(String(g.freelancerId)));
  const jobs = jobsRaw.filter(j => activeClientIds.has(String(j.clientId)));
  const freelancers = freelancersRaw.filter(f => activeFreelancerIds.has(String(f.userId)));

  const activeCategories = new Set();
  const activeSkills = new Set();
  const normKey = (s) => String(s || '').trim().toLowerCase();

  for (const g of gigs) {
    if (g.category) activeCategories.add(normKey(g.category));
    if (Array.isArray(g.skills)) {
      for (const s of g.skills) activeSkills.add(normKey(s));
    }
  }

  for (const j of jobs) {
    if (j.category) activeCategories.add(normKey(j.category));
    if (Array.isArray(j.skills)) {
      for (const s of j.skills) activeSkills.add(normKey(s));
    }
  }

  for (const f of freelancers) {
    if (Array.isArray(f.skills)) {
      for (const s of f.skills) {
        const name = typeof s === 'string' ? s : s.name;
        if (name) activeSkills.add(normKey(name));
      }
    }
  }

  // Cold start protection: show all if platform is empty
  const totalActive = activeCategories.size + activeSkills.size;
  const filterActiveOnly = totalActive > 0;

  // Build parent mapping dynamically
  const parentMap = new Map(); // parentIdString -> array of child nodes
  const rootIndustries = [];

  const nodesMap = new Map(nodes.map(n => [String(n._id), n]));

  // For each node, figure out its unique parent
  for (const node of nodes) {
    const nodeIdStr = String(node._id);

    if (node.type === 'industry') {
      rootIndustries.push(node);
      continue;
    }

    let parentIdStr = null;
    if (node.canonicalParent) {
      parentIdStr = String(node.canonicalParent);
    } else {
      // Find the first BELONGS_TO relationship
      const rel = relationships.find(r => String(r.from) === nodeIdStr);
      if (rel) {
        parentIdStr = String(rel.to);
      }
    }

    if (parentIdStr && nodesMap.has(parentIdStr)) {
      if (!parentMap.has(parentIdStr)) {
        parentMap.set(parentIdStr, []);
      }
      parentMap.get(parentIdStr).push(node);
    }
  }

  const seenNodeIds = new Set();

  function buildTreeRecursively(parentNodeId) {
    const parentIdStr = String(parentNodeId);
    const children = parentMap.get(parentIdStr) || [];

    // Sort children
    children.sort((a, b) => {
      if (a.menuOrder !== b.menuOrder) return a.menuOrder - b.menuOrder;
      if (a.displayPriority !== b.displayPriority) return b.displayPriority - a.displayPriority;
      return a.name.localeCompare(b.name);
    });

    const result = [];
    for (const child of children) {
      const childIdStr = String(child._id);
      
      // Strict de-duplication: skip if already added elsewhere in the tree!
      if (seenNodeIds.has(childIdStr)) continue;
      if (child.hiddenInMenu) continue;

      const normName = normKey(child.name);
      const isLeaf = ['skill', 'technology', 'tool', 'concept'].includes(child.type);

      if (isLeaf) {
        if (filterActiveOnly && !activeSkills.has(normName)) continue;
        seenNodeIds.add(childIdStr);
        result.push({
          id: childIdStr,
          name: child.name,
          slug: child.slug,
          type: child.type,
          icon: child.icon,
          color: child.color,
          featured: child.featured
        });
      } else {
        // It's a category/subcategory. Build its subtree.
        const childrenTree = buildTreeRecursively(child._id);
        const hasGigs = activeCategories.has(normName);
        const keepCategory = !filterActiveOnly || hasGigs || childrenTree.length > 0;

        if (keepCategory) {
          seenNodeIds.add(childIdStr);
          result.push({
            id: childIdStr,
            name: child.name,
            slug: child.slug,
            type: child.type,
            icon: child.icon || '🔸',
            gradient: child.color || 'linear-gradient(135deg, #374151, #111827)',
            featured: child.featured,
            children: childrenTree
          });
        }
      }
    }

    return result;
  }

  // Sort root industries
  rootIndustries.sort((a, b) => {
    if (a.menuOrder !== b.menuOrder) return a.menuOrder - b.menuOrder;
    if (a.displayPriority !== b.displayPriority) return b.displayPriority - a.displayPriority;
    return a.name.localeCompare(b.name);
  });

  const tree = rootIndustries.map(ind => {
    const categoriesTree = buildTreeRecursively(ind._id);
    return {
      industry: ind.name,
      slug: ind.slug,
      categories: categoriesTree
    };
  }).filter(ind => ind.categories.length > 0 || !filterActiveOnly);

  cacheSet(cacheKey, tree);
  return tree;
}

/**
 * Scan a list of skills and category context, detect unrecognized terms,
 * and trigger background AI suggestion flow to queue proposals in the review list.
 */
async function proposeUnrecognizedSkills(skillsArray, categoryName, sourceType, sourceId) {
  if (!Array.isArray(skillsArray) || skillsArray.length === 0) return;

  process.nextTick(async () => {
    try {
      const unrecognized = [];
      for (const skill of skillsArray) {
        const resolved = await resolveCanonical(skill);
        if (!resolved) {
          unrecognized.push(skill);
        }
      }

      if (unrecognized.length === 0) return;

      const { getAIProvider } = require('./ai');
      const TaxonomyProposal = require('../models/TaxonomyProposal');

      for (const rawName of unrecognized) {
        const existing = await TaxonomyProposal.findOne({
          name: new RegExp(`^${rawName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
          status: 'pending_review'
        });
        if (existing) continue;

        console.log(`[TaxonomyAI] Detecting unrecognized skill: "${rawName}". Querying AI suggested placement...`);
        try {
          const ai = getAIProvider();
          const suggestion = await ai.suggestTaxonomyNode(rawName, categoryName);
          
          if (suggestion && suggestion.name && suggestion.type) {
            await TaxonomyProposal.create({
              name: suggestion.name,
              type: suggestion.type,
              description: suggestion.description || '',
              aliases: suggestion.aliases || [],
              synonyms: suggestion.synonyms || [],
              weight: suggestion.weight ?? 1.0,
              icon: suggestion.icon || '',
              color: suggestion.color || '',
              relationships: suggestion.relationships || [],
              sourceType,
              sourceId,
              status: 'pending_review',
              aiReasoning: suggestion.aiReasoning || ''
            });
            console.log(`[TaxonomyAI] Proposal queued for "${suggestion.name}"`);
          }
        } catch (innerErr) {
          console.error(`[TaxonomyAI] Inner suggestion failed for "${rawName}":`, innerErr.message);
        }
      }
    } catch (err) {
      console.error('[TaxonomyAI] Background proposal analysis failed:', err.message);
    }
  });
}

/* ── Exports ─────────────────────────────────────────────────────────── */
module.exports = {
  // Resolution
  resolveCanonical,
  // Traversal
  getAncestors,
  getDescendants,
  getPrerequisites,
  getRelated,
  getRecommendations,
  getLearningPath,
  getTaxonomyTree,
  // Inference
  inferCategories,
  expandSearchTerms,
  proposeUnrecognizedSkills,
  // Matching
  calcMatchScore,
  getCertificationImpact,
  // Admin
  createNode,
  createRelationship,
  mergeNodes,
  getFullGraph,
  // Cache
  invalidateCache,
};
