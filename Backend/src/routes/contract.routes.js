const express = require('express');
const { authenticate: protect } = require('../middleware/auth.middleware');
const contractController = require('../controllers/contract.controller');

const router = express.Router();

// All contract routes require authentication
router.use(protect);

router.get('/my', contractController.getMyContracts);
router.get('/:id', contractController.getContract);
router.post('/:id/cancel', contractController.requestCancellation);
router.post('/:id/end', contractController.endContract);
router.get('/:id/history', contractController.getContractHistory);

module.exports = router;
