const express = require('express');
const router = express.Router();
const matchmakingController = require('../controllers/matchmaking.controller');
const { optionalAuth } = require('../middleware/auth.middleware');

/**
 * AI Matchmaking — public, but uses optionalAuth so a logged-in client's
 * context could be used later. The page itself is publicly accessible.
 */

// POST /api/v1/matchmaking — rank freelancers for an inline project brief
router.post('/', optionalAuth, matchmakingController.matchByProject);

// GET /api/v1/matchmaking?projectId=... — rank against a saved project
router.get('/', optionalAuth, matchmakingController.matchById);

module.exports = router;
