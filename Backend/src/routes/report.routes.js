const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const { createRateLimiter } = require('../middleware/rateLimit.middleware');
const { createReportValidation } = require('../validators/report.validator');

router.use(authenticate);

// Per signed-in user (not per IP): 10 reports an hour is generous for honest use
// and stops one account from flooding the moderation queue.
const reportLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => String(req.user?._id || 'anonymous'),
  message: { success: false, message: 'You have sent several reports recently. Please try again later.' },
});

/**
 * @swagger
 * /api/v1/reports:
 *   post:
 *     summary: Report a profile, job, gig or review to the moderation team
 *     tags: [Reports]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [itemType, itemId, category, description]
 *             properties:
 *               itemType: { type: string, enum: [profile, job, gig, review] }
 *               itemId: { type: string }
 *               category: { type: string, enum: [spam, abuse, fraud, harassment, inappropriate, other] }
 *               description: { type: string, description: 10-1000 characters }
 *     responses:
 *       201:
 *         description: Report filed (it appears in the admin panel's Reports queue)
 */
router.post('/', reportLimiter, createReportValidation, validate, reportController.createReport);

module.exports = router;
