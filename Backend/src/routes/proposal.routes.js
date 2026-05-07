const express = require('express');
const router = express.Router();
const proposalController = require('../controllers/proposal.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validation.middleware');
const {
  createProposalValidation,
  updateProposalValidation,
  getProposalValidation,
  deleteProposalValidation,
  listProposalsValidation,
  acceptProposalValidation,
  rejectProposalValidation,
  withdrawProposalValidation
} = require('../validators/job.validator');

/**
 * All routes require authentication
 */
router.use(authenticate);

/**
 * Proposal routes
 */

/**
 * @swagger
 * /api/v1/proposals:
 *   get:
 *     summary: List proposals
 *     tags: [Proposals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of proposals retrieved successfully
 */
router.get('/',
  listProposalsValidation,
  validate,
  proposalController.listProposals
);

// Get proposal by ID
router.get('/:id',
  getProposalValidation,
  validate,
  proposalController.getProposalById
);

/**
 * Freelancer routes
 */

/**
 * @swagger
 * /api/v1/proposals:
 *   post:
 *     summary: Submit a new proposal for a job
 *     tags: [Proposals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jobId
 *               - bidAmount
 *               - coverLetter
 *             properties:
 *               jobId:
 *                 type: string
 *               bidAmount:
 *                 type: number
 *               coverLetter:
 *                 type: string
 *     responses:
 *       201:
 *         description: Proposal submitted successfully
 */
router.post('/',
  requireRole('freelancer'),
  createProposalValidation,
  validate,
  proposalController.createProposal
);

// Update proposal
router.put('/:id',
  requireRole('freelancer'),
  updateProposalValidation,
  validate,
  proposalController.updateProposal
);

// Withdraw proposal
router.post('/:id/withdraw',
  requireRole('freelancer'),
  withdrawProposalValidation,
  validate,
  proposalController.withdrawProposal
);

// Delete proposal
router.delete('/:id',
  requireRole('freelancer'),
  deleteProposalValidation,
  validate,
  proposalController.deleteProposal
);

/**
 * Client routes
 */

// Accept proposal
router.post('/:id/accept',
  requireRole('client'),
  acceptProposalValidation,
  validate,
  proposalController.acceptProposal
);

// Reject proposal
router.post('/:id/reject',
  requireRole('client'),
  rejectProposalValidation,
  validate,
  proposalController.rejectProposal
);

module.exports = router;
