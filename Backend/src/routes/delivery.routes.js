const express = require('express');
const { authenticate: protect } = require('../middleware/auth.middleware');
const deliveryController = require('../controllers/delivery.controller');

const router = express.Router();

router.use(protect);

router.post('/:contractId/submit', deliveryController.submitDelivery);
router.post('/:deliveryId/review', deliveryController.reviewDelivery);
router.get('/:contractId', deliveryController.getContractDeliveries);

module.exports = router;
