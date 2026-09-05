const express = require('express');
const { authenticate: protect } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const { requestCancellationValidation, raiseDisputeValidation } = require('../validators/contract.validator');
const contractController = require('../controllers/contract.controller');

const router = express.Router();

// All contract routes require authentication
router.use(protect);

router.get('/my', contractController.getMyContracts);
router.get('/:id', contractController.getContract);
router.post('/:id/cancel', requestCancellationValidation, validate, contractController.requestCancellation); // Dispute
router.post('/:id/end-request', contractController.requestEndContract);
router.post('/:id/end-respond', contractController.respondEndContract);
router.post('/:id/dispute', raiseDisputeValidation, validate, contractController.raiseDispute);
router.get('/:id/history', contractController.getContractHistory);

module.exports = router;
