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

// Distinguishes "never cached" from "cached, and the cached value happens to
// be null/false/0" — cacheGet() alone can't tell these apart, which silently
// defeated caching for every "resolved to nothing" result (a very common
// case: most skill-pair relationship lookups find no edge at all).
function cacheHas(key) {
  const entry = _cache.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) { _cache.delete(key); return false; }
  return true;
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
    { $match: { _id: typeof startId === 'string' ? new (require('mongoose').Types.ObjectId)(startId) : startId } },
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
    { $match: { _id: typeof endId === 'string' ? new (require('mongoose').Types.ObjectId)(endId) : endId } },
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
  if (cacheHas(cacheKey)) return cacheGet(cacheKey);

  let node = await SkillNode.resolveByName(term);

  // If found a merged node, follow the redirect once
  if (node && node.status === 'merged' && node.mergedInto) {
    node = await SkillNode.findById(node.mergedInto).lean();
  }

  cacheSet(cacheKey, node || null);
  return node;
}

/**
 * Batch-resolve many terms in ONE query instead of one findOne() per term.
 * Populates the exact same `resolve:*` cache entries resolveCanonical()
 * reads, so callers don't need to change at all — this just pre-warms the
 * cache before a hot loop that would otherwise call resolveCanonical() many
 * times over (e.g. scoring every candidate in a matchmaking run against a
 * few required skills: 100+ distinct terms one findOne() at a time, each a
 * real round-trip to the DB, vs. one query for all of them here).
 */
async function warmResolveCache(terms) {
  const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const uniqueTerms = [...new Set((terms || []).map((t) => String(t || '').trim()).filter(Boolean))];
  const uncached = uniqueTerms.filter((t) => !cacheHas(`resolve:${norm(t)}`));
  if (!uncached.length) return;

  const orClauses = [];
  uncached.forEach((t) => {
    const esc = escapeRegex(t);
    orClauses.push(
      { name: { $regex: `^${esc}$`, $options: 'i' } },
      { aliases: { $regex: `^${esc}$`, $options: 'i' } },
      { synonyms: { $regex: `^${esc}$`, $options: 'i' } },
      { slug: t.toLowerCase() }
    );
  });

  const docs = await SkillNode.find({
    status: { $in: ['active', 'merged'] },
    $or: orClauses,
  }).lean();

  // Merged nodes redirect to their target — resolve all such targets in one
  // more batched lookup rather than one findById() per merged doc.
  const mergedIds = [...new Set(docs.filter((d) => d.status === 'merged' && d.mergedInto).map((d) => String(d.mergedInto)))];
  let mergedTargets = new Map();
  if (mergedIds.length) {
    const targets = await SkillNode.find({ _id: { $in: mergedIds } }).lean();
    mergedTargets = new Map(targets.map((t) => [String(t._id), t]));
  }

  for (const term of uncached) {
    const lower = norm(term);
    const lowerSlug = term.toLowerCase();
    let doc = docs.find((d) =>
      norm(d.name) === lower ||
      (d.aliases || []).some((a) => norm(a) === lower) ||
      (d.synonyms || []).some((s) => norm(s) === lower) ||
      d.slug === lowerSlug
    ) || null;
    if (doc && doc.status === 'merged' && doc.mergedInto) {
      doc = mergedTargets.get(String(doc.mergedInto)) || doc;
    }
    cacheSet(`resolve:${lower}`, doc);
  }
}

/**
 * Resolve a term for the PUBLIC skill-detail page (SkillPage.jsx), extending
 * resolveCanonical() with a fallback to ad-hoc skill strings freelancers have
 * typed into live Gig.skills but that were never added as a curated
 * SkillNode — the same synthetic-skill fallback getTaxonomyTree() already
 * uses to populate nav menu panels for categories with no curated skill
 * children (see the `gig-skill:` entries there). Reusing that same tree here
 * guarantees anything clickable in the nav always has somewhere real to
 * land, by construction — no separate matching logic that could drift out
 * of sync with the nav a second time.
 *
 * Deliberately kept separate from resolveCanonical(), which is used
 * internally by unrelated features (match-scoring, category inference, the
 * unrecognized-skill taxonomy-growth proposal flow) where this permissive
 * fallback would be the wrong behavior — e.g. proposeUnrecognizedSkills
 * would stop firing for exactly the ad-hoc skills it exists to catch, since
 * they'd suddenly "resolve".
 */
async function resolvePublicSkillNode(term) {
  const node = await resolveCanonical(term);
  if (node) return node;

  const wanted = slugify(term);
  if (!wanted) return null;

  const tree = await getTaxonomyTree();
  for (const industry of tree) {
    for (const category of industry.categories) {
      for (const child of category.children || []) {
        if (child.type === 'skill' && child.slug === wanted) {
          return {
            id: child.id,
            name: child.name,
            slug: child.slug,
            type: 'skill',
            description: `Explore ${child.name} freelancers, gigs, and pricing on SkillKart.`,
            subcategories: [],
            trending: [],
          };
        }
      }
    }
  }
  return null;
}

/**
 * Return every real-world string that should count as "this exact skill" —
 * its canonical name plus any aliases/synonyms — for callers that need to
 * match literal Gig/Job/FreelancerProfile skill strings precisely (e.g. a
 * skill's own stats page), where expandSearchTerms()'s broader ancestor/
 * descendant/related expansion would incorrectly pull in other skills.
 * Falls back to `[term]` if it doesn't resolve to a curated node at all.
 */
async function resolveMatchTerms(term) {
  const node = await resolveCanonical(term);
  if (!node) return [term];
  return [...new Set([node.name, ...(node.aliases || []), ...(node.synonyms || [])])];
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
 * Reverse of getPrerequisites — nodes that have `nodeId` somewhere in their
 * own prerequisite chain (i.e. things that depend on `nodeId`).
 */
async function getDependents(nodeId) {
  return traverseReverse(nodeId, ['PREREQUISITE', 'DEPENDS_ON'], 5);
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

    // Include each node's aliases/synonyms too, not just its canonical name —
    // real Gig/Job/FreelancerProfile data is free text and often uses the
    // colloquial alias ("Lightroom") rather than the curated canonical name
    // ("Adobe Lightroom"), so canonical-only expansion silently misses it.
    const all = [node, ...ancestors, ...descendants, ...related];
    names = [...new Set(all.flatMap((n) => [n.name, ...(n.aliases || []), ...(n.synonyms || [])]))];
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
/**
 * Direct RELATED_TO/SIMILAR_TO edge between two nodes (order-independent),
 * cached like every other graph lookup in this service — this was previously
 * the one query in calcMatchScore's hot path with no cache at all, re-run
 * uncached for every single (required × candidate) skill pair.
 */
async function getDirectRelationship(nodeIdA, nodeIdB) {
  const [a, b] = [String(nodeIdA), String(nodeIdB)].sort();
  const cacheKey = `directrel:${a}:${b}`;
  if (cacheHas(cacheKey)) return cacheGet(cacheKey);

  const rel = await SkillRelationship.findOne({
    $or: [
      { from: nodeIdA, to: nodeIdB, type: { $in: ['RELATED_TO', 'SIMILAR_TO'] } },
      { from: nodeIdB, to: nodeIdA, type: { $in: ['RELATED_TO', 'SIMILAR_TO'] } },
    ],
  }).lean();

  cacheSet(cacheKey, rel || null);
  return rel;
}

/**
 * Batch-warm getDirectRelationship()'s cache for every (required-node ×
 * any-node) pair in ONE query, instead of one findOne() per candidate skill
 * per required skill (which is where the real cost was: only a handful of
 * required-skill nodes exist per match run, but up to 100+ distinct
 * candidate-skill nodes, so this is the required side driving one bulk
 * fetch rather than the candidate side driving hundreds of individual ones).
 * Any (reqId, otherId) pair with no matching edge is explicitly cached as
 * "no relationship" so later lookups don't re-query for it either.
 */
async function warmDirectRelationshipCache(reqNodeIds, candNodeIds) {
  const reqIds = [...new Set((reqNodeIds || []).map(String))];
  const candIds = [...new Set((candNodeIds || []).map(String))];
  if (!reqIds.length || !candIds.length) return;

  const rels = await SkillRelationship.find({
    type: { $in: ['RELATED_TO', 'SIMILAR_TO'] },
    $or: [{ from: { $in: reqIds } }, { to: { $in: reqIds } }],
  }).lean();

  for (const reqId of reqIds) {
    for (const candId of candIds) {
      if (reqId === candId) continue;
      const [a, b] = [reqId, candId].sort();
      const cacheKey = `directrel:${a}:${b}`;
      if (cacheHas(cacheKey)) continue;

      const rel = rels.find((r) =>
        (String(r.from) === reqId && String(r.to) === candId) ||
        (String(r.from) === candId && String(r.to) === reqId)
      ) || null;
      cacheSet(cacheKey, rel);
    }
  }
}

/**
 * Score a single (required, candidate) skill pair. Split out of
 * calcMatchScore so every pair in a match run can be scored concurrently
 * (see below) instead of one sequential `await` at a time.
 */
async function scoreSkillPair(req, cand) {
  const [reqNode, candNode] = await Promise.all([resolveCanonical(req), resolveCanonical(cand)]);

  if (!reqNode || !candNode) {
    return norm(req) === norm(cand) ? { score: 1.0, match: cand } : { score: 0, match: null };
  }
  if (String(reqNode._id) === String(candNode._id)) {
    return { score: 1.0, match: cand };
  }

  // All remaining relationship checks are independent of each other, so run
  // them concurrently and take the highest-priority one that applies —
  // equivalent to the original's sequential highest-priority-first checks,
  // since the priority order here is already monotonically decreasing.
  //
  // Every one of these is keyed by reqNode (there are only as many distinct
  // required-skill nodes as the brief lists — typically 1-5), never by
  // candNode (of which there can be 100+ distinct nodes across a full
  // candidate pool). getDependents(reqNode) replaces what would otherwise be
  // getPrerequisites(candNode) called once per distinct candidate skill —
  // the same check, just from the cheap side of the relationship, so the
  // whole match run needs a handful of graph traversals total instead of one
  // per candidate skill.
  const [reqDescendants, reqDependents, reqAncestors, reqPrereqs, directRel] = await Promise.all([
    getDescendants(reqNode._id, 2),
    getDependents(reqNode._id),
    getAncestors(reqNode._id, 2),
    getPrerequisites(reqNode._id),
    getDirectRelationship(reqNode._id, candNode._id),
  ]);

  // Is the candidate a child/descendant of required? (e.g. Next.js → React)
  if (reqDescendants.some((d) => String(d._id) === String(candNode._id))) return { score: 0.85, match: cand };
  // Does candidate depend on or have the required node as a prerequisite? (e.g. Next.js depends on React)
  if (reqDependents.some((p) => String(p._id) === String(candNode._id))) return { score: 0.85, match: cand };
  // Is the candidate a parent/ancestor of required? (e.g. JavaScript → React)
  if (reqAncestors.some((a) => String(a._id) === String(candNode._id))) return { score: 0.70, match: cand };
  // Is the candidate a prerequisite of the required skill? (e.g. React candidate satisfies Next.js required loosely)
  if (reqPrereqs.some((p) => String(p._id) === String(candNode._id))) return { score: 0.70, match: cand };
  // 1-hop RELATED_TO
  if (directRel) return { score: 0.55 * (directRel.weight || 1), match: cand };

  return { score: 0, match: null };
}

async function calcMatchScore(requiredSkillNames, candidateSkillNames) {
  if (!requiredSkillNames || requiredSkillNames.length === 0) {
    return { score: 0.5, matched: [], partial: [], missed: [], ratio: 0.5 };
  }

  // Score every (required, candidate) pair concurrently. With up to ~5 graph
  // queries per pair, doing this one pair at a time across every candidate in
  // a match run (100s of pairs) was the single largest contributor to
  // matchmaking taking 30+ seconds — this reduces it to one round-trip depth
  // regardless of how many pairs there are.
  const pairs = [];
  for (const req of requiredSkillNames) {
    for (const cand of candidateSkillNames || []) {
      pairs.push({ req, cand });
    }
  }
  const results = await Promise.all(pairs.map(({ req, cand }) => scoreSkillPair(req, cand)));

  const matched = [];
  const partial = [];
  const missed = [];
  let totalWeight = 0;
  let idx = 0;

  for (const req of requiredSkillNames) {
    let bestScore = 0;
    let bestMatch = null;
    for (let i = 0; i < (candidateSkillNames || []).length; i++) {
      const r = results[idx++];
      if (r.score > bestScore) { bestScore = r.score; bestMatch = r.match; }
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
  const targetIdStr = String(targetId);

  // Redirect every edge that touches the source node onto the target node —
  // one at a time rather than updateMany, because a blind redirect can
  // produce a self-loop (source->target becoming target->target) or collide
  // with an edge the target already has (both violate the {from,to,type}
  // unique index — updateMany would throw mid-batch and leave a partial
  // merge). Drop those instead of redirecting them.
  const outgoing = await SkillRelationship.find({ from: sourceId });
  for (const rel of outgoing) {
    if (String(rel.to) === targetIdStr) {
      await SkillRelationship.deleteOne({ _id: rel._id }); // would self-loop
      continue;
    }
    const dup = await SkillRelationship.findOne({ from: targetId, to: rel.to, type: rel.type });
    if (dup) {
      await SkillRelationship.deleteOne({ _id: rel._id }); // target already has this edge
    } else {
      await SkillRelationship.updateOne({ _id: rel._id }, { from: targetId });
    }
  }

  const incoming = await SkillRelationship.find({ to: sourceId });
  for (const rel of incoming) {
    if (String(rel.from) === targetIdStr) {
      await SkillRelationship.deleteOne({ _id: rel._id }); // would self-loop
      continue;
    }
    const dup = await SkillRelationship.findOne({ from: rel.from, to: targetId, type: rel.type });
    if (dup) {
      await SkillRelationship.deleteOne({ _id: rel._id }); // target already has this edge
    } else {
      await SkillRelationship.updateOne({ _id: rel._id }, { to: targetId });
    }
  }

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
  const PlatformSettings = require('../models/PlatformSettings');

  const [nodes, relationships, activeUsers, gigsRaw, jobsRaw, freelancersRaw, settings] = await Promise.all([
    SkillNode.find({ status: 'active' }).lean(),
    SkillRelationship.find({ type: { $in: ['BELONGS_TO', 'CHILD'] } }).lean(),
    User.find({ isActive: true }).select('_id role').lean(),
    Gig.find({ status: 'active' }).select('category skills freelancerId').lean(),
    Job.find({ status: 'open' }).select('category skills clientId').lean(),
    FreelancerProfile.find().select('skills userId').lean(),
    PlatformSettings.findOne({ key: 'category_popularity_weights' }).lean()
  ]);

  const activeFreelancerIds = new Set(activeUsers.filter(u => u.role === 'freelancer').map(u => String(u._id)));
  const activeClientIds = new Set(activeUsers.filter(u => u.role === 'client').map(u => String(u._id)));

  const gigs = gigsRaw.filter(g => activeFreelancerIds.has(String(g.freelancerId)));
  const jobs = jobsRaw.filter(j => activeClientIds.has(String(j.clientId)));
  const freelancers = freelancersRaw.filter(f => activeFreelancerIds.has(String(f.userId)));

  const activeCategories = new Set();
  const activeSkills = new Set();
  const normKey = (s) => String(s || '').trim().toLowerCase();

  // Distinct skills actually sold under each category (from live gigs). Used as
  // a fallback so a popular category with no taxonomy skill-children still shows
  // a populated menu panel built from what freelancers really offer.
  const gigSkillsByCategory = new Map();
  for (const g of gigs) {
    if (g.category) {
      activeCategories.add(normKey(g.category));
      const key = normKey(g.category);
      if (!gigSkillsByCategory.has(key)) gigSkillsByCategory.set(key, new Map());
      const bucket = gigSkillsByCategory.get(key);
      if (Array.isArray(g.skills)) {
        for (const s of g.skills) {
          const disp = String(s || '').trim();
          if (disp && !bucket.has(normKey(disp))) bucket.set(normKey(disp), disp);
        }
      }
    }
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

  const weights = settings?.weights || {
    gigs: 0.40,
    jobs: 0.25,
    freelancers: 0.20,
    searchVolume: 0.10,
    views: 0.05
  };

  const parentMap = new Map();
  const rootIndustries = [];
  const nodesMap = new Map(nodes.map(n => [String(n._id), n]));

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

  const getChildSkillNames = (catNodeId) => {
    const list = [];
    const queue = [String(catNodeId)];
    const visited = new Set(queue);

    while (queue.length > 0) {
      const currentId = queue.shift();
      const children = parentMap.get(currentId) || [];
      for (const child of children) {
        const childIdStr = String(child._id);
        if (!visited.has(childIdStr)) {
          visited.add(childIdStr);
          if (['skill', 'technology', 'tool'].includes(child.type)) {
            list.push(normKey(child.name));
          } else {
            queue.push(childIdStr);
          }
        }
      }
    }
    return list;
  };

  // Find and rank active categories
  const categoriesList = nodes.filter(n => n.type === 'category');
  const rankedCategories = [];

  for (const cat of categoriesList) {
    const catNameLc = normKey(cat.name);
    
    // Gigs count
    const gigCount = gigs.filter(g => normKey(g.category) === catNameLc).length;
    // Jobs count
    const jobCount = jobs.filter(j => normKey(j.category) === catNameLc).length;
    
    // Freelancers count possessing skills in child hierarchy
    const descSkillNames = new Set(getChildSkillNames(cat._id));
    descSkillNames.add(catNameLc);
    
    const freelancerCount = freelancers.filter(f => {
      return (f.skills || []).some(s => {
        const name = typeof s === 'string' ? s : s.name;
        return descSkillNames.has(normKey(name));
      });
    }).length;

    // Check if category has any active data
    const hasActiveChildSkill = Array.from(descSkillNames).some(name => activeSkills.has(name));
    const hasActiveData = gigCount > 0 || jobCount > 0 || freelancerCount > 0 || hasActiveChildSkill || activeCategories.has(catNameLc);

    if (!hasActiveData) {
      continue;
    }

    const popularityScore = (gigCount * weights.gigs) +
                            (jobCount * weights.jobs) +
                            (freelancerCount * weights.freelancers) +
                            ((cat.searchVolume || 0) * weights.searchVolume) +
                            ((cat.views || 0) * weights.views);

    rankedCategories.push({
      node: cat,
      popularityScore
    });
  }

  // Sort descending
  rankedCategories.sort((a, b) => b.popularityScore - a.popularityScore);

  // Take the top active categories (by popularity). Keep a generous slice so
  // that after empty ones are dropped downstream, the menu still shows ≥6.
  const top7Categories = rankedCategories.slice(0, 12).map(rc => rc.node);

  const seenNodeIds = new Set();

  // A leaf (skill/technology/tool/concept) only appears if it has real
  // activity (a gig, an open job, or a freelancer's listed skill) — otherwise
  // it'd be a clickable nav entry that lands on an all-zeros skill page.
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

      if (seenNodeIds.has(childIdStr)) continue;
      if (child.hiddenInMenu) continue;

      const normName = normKey(child.name);
      const isLeaf = ['skill', 'technology', 'tool', 'concept'].includes(child.type);

      if (isLeaf) {
        if (!activeSkills.has(normName)) continue;
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
        const childrenTree = buildTreeRecursively(child._id);
        const hasGigs = activeCategories.has(normName);
        const keepCategory = hasGigs || childrenTree.length > 0;

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
    const indIdStr = String(ind._id);
    
    // Find top-7 categories belonging to this industry
    const catsUnderInd = top7Categories.filter(cat => {
      let parentIdStr = null;
      if (cat.canonicalParent) {
        parentIdStr = String(cat.canonicalParent);
      } else {
        const rel = relationships.find(r => String(r.from) === String(cat._id));
        if (rel) parentIdStr = String(rel.to);
      }
      return parentIdStr === indIdStr;
    });

    const categoriesTree = catsUnderInd.map(cat => {
      // Strict: a curated skill only shows in the nav if it has real activity
      // (a gig, an open job, or a freelancer's listed skill) — a taxonomy
      // entry with zero real-world usage would otherwise be clickable in the
      // menu but land on an all-zeros "no data yet" skill page.
      let childrenTree = buildTreeRecursively(cat._id);

      // Fallback: if that leaves this popular category with no skill-children
      // (either the graph has none, or none of them are active), build the
      // panel from the skills actually sold on its gigs instead — those are
      // real by construction (extracted straight from active Gig documents),
      // so they can never lead to a zero-activity page either.
      if (childrenTree.length === 0) {
        const bucket = gigSkillsByCategory.get(normKey(cat.name));
        if (bucket && bucket.size) {
          childrenTree = [...bucket.values()].slice(0, 12).map(name => ({
            id: `gig-skill:${slugify(name)}`,
            name,
            slug: slugify(name),
            type: 'skill',
            icon: undefined,
            featured: false,
          }));
        }
      }

      return {
        id: String(cat._id),
        name: cat.name,
        slug: cat.slug,
        type: cat.type,
        icon: cat.icon || '🔸',
        gradient: cat.color || 'linear-gradient(135deg, #374151, #111827)',
        featured: cat.featured,
        children: childrenTree
      };
    });

    return {
      industry: ind.name,
      slug: ind.slug,
      categories: categoriesTree.filter(c => c.children.length > 0 || activeCategories.has(normKey(c.name)))
    };
  }).filter(ind => ind.categories.length > 0);

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
  resolvePublicSkillNode,
  resolveMatchTerms,
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
  warmResolveCache,
  warmDirectRelationshipCache,
  // Admin
  createNode,
  createRelationship,
  mergeNodes,
  getFullGraph,
  // Cache
  invalidateCache,
};
