const express = require('express');
const { authenticate: protect } = require('../middleware/auth.middleware');
const timeTrackingController = require('../controllers/timeTracking.controller');

const router = express.Router();

router.use(protect);

router.post('/:contractId/start', timeTrackingController.startTimer);
router.post('/:contractId/stop', timeTrackingController.stopTimer);
router.post('/:contractId/manual', timeTrackingController.addManualLog);
router.get('/:contractId', timeTrackingController.getContractLogs);

module.exports = router;
