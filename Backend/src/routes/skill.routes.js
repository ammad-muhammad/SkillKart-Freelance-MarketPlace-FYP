const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/skill.controller');
const { authenticate } = require('../middleware/auth.middleware');

/* ─────────────────────────────────────────────────────────────────────
   PUBLIC — no auth
───────────────────────────────────────────────────────────────────── */

// Static taxonomy from constants (memory, instant)
router.get('/taxonomy',  ctrl.getTaxonomy);

// Full live graph (nodes + edges) — for admin UI / visualization
router.get('/graph',     ctrl.getFullGraph);

// Live hierarchical tree (Industry -> Categories -> Skills)
router.get('/tree',      ctrl.getTaxonomyTree);

// Resolve an alias/synonym to canonical node
router.get('/resolve',   ctrl.resolveSkill);

// Expand a search query to a set of related skill names
router.post('/expand',   ctrl.expandQuery);

// Per-slug graph traversal endpoints
router.get('/:slug/ancestors',     ctrl.getAncestors);
router.get('/:slug/descendants',   ctrl.getDescendants);
router.get('/:slug/prerequisites', ctrl.getPrerequisites);
router.get('/:slug/related',       ctrl.getRelated);
router.get('/:slug/recommendations', ctrl.getRecommendations);
router.get('/:slug/learning-path', ctrl.getLearningPath);

/* ─────────────────────────────────────────────────────────────────────
   AUTHENTICATED
───────────────────────────────────────────────────────────────────── */

// Graph-aware skill match score
router.post('/match-score', authenticate, ctrl.calcMatchScore);

// AI skill validation (fires on every keystroke — suppress error toast in client)
router.post('/validate',    authenticate, ctrl.validateSkill);

module.exports = router;
