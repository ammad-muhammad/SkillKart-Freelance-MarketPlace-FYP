const express = require('express');
const router = express.Router();
const proposalController = require('../controllers/proposal.controller');
const { authenticate } = require('../middleware/auth');
const { roleGuard, requireCompleteProfile } = require('../middleware/roleGuard');
const validateRequest = require('../middleware/validateRequest');
const { createProposalSchema } = require('../validators/proposal.validator');

router.use(authenticate, requireCompleteProfile);

// Freelancer routes
router.post(
  '/',
  roleGuard('freelancer'),
  validateRequest(createProposalSchema),
  proposalController.submitProposal
);

router.get('/my', roleGuard('freelancer'), proposalController.getMyProposals);

router.patch('/:id/withdraw', roleGuard('freelancer'), proposalController.withdrawProposal);

// Client routes
router.get('/job/:jobId', roleGuard('client'), proposalController.getJobProposals);

router.patch('/:id/accept', roleGuard('client'), proposalController.acceptProposal);

router.patch('/:id/reject', roleGuard('client'), proposalController.rejectProposal);

module.exports = router;
