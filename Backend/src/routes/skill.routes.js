const express = require('express');
const router = express.Router();
const { validateSkill } = require('../controllers/skill.controller');
const { authenticate } = require('../middleware/auth.middleware');

/**
 * @swagger
 * /api/v1/skills/validate:
 *   post:
 *     summary: Validate a skill and get suggestions via AI
 *     tags: [Skills]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - input
 *             properties:
 *               input:
 *                 type: string
 *     responses:
 *       200:
 *         description: Skill validated
 */
router.post('/validate', authenticate, validateSkill);

module.exports = router;
