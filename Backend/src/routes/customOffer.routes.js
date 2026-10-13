const express = require('express');
const router = express.Router();
const offerController = require('../controllers/customOffer.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validation.middleware');
const {
  createOfferValidation,
  offerIdValidation,
  acceptOfferValidation,
} = require('../validators/customOffer.validator');

router.use(authenticate);

/**
 * @swagger
 * /api/v1/offers:
 *   post:
 *     summary: Send a custom offer to a client in an existing chat (freelancer)
 *     tags: [Custom Offers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [conversationId, title, description, price, deliveryDays]
 *             properties:
 *               conversationId: { type: string }
 *               gigId: { type: string, description: Optional — base the offer on one of your gigs }
 *               title: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               deliveryDays: { type: integer }
 *               revisions: { type: integer }
 *     responses:
 *       201:
 *         description: Offer sent (also posted into the chat as an offer card)
 */
router.post('/',
  requireRole('freelancer'),
  createOfferValidation,
  validate,
  offerController.createOffer
);

/**
 * @swagger
 * /api/v1/offers/{id}/accept:
 *   post:
 *     summary: Accept a custom offer (client) — creates an order awaiting the 50% deposit
 *     tags: [Custom Offers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               requirements:
 *                 type: object
 *                 properties:
 *                   description: { type: string }
 *                   referenceLinks: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: Offer accepted; `order` is the new job to fund
 */
router.post('/:id/accept',
  requireRole('client'),
  acceptOfferValidation,
  validate,
  offerController.acceptOffer
);

router.post('/:id/decline',
  requireRole('client'),
  offerIdValidation,
  validate,
  offerController.declineOffer
);

router.post('/:id/withdraw',
  requireRole('freelancer'),
  offerIdValidation,
  validate,
  offerController.withdrawOffer
);

module.exports = router;
