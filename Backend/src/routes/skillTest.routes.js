const express = require('express');
const router = express.Router();
const skillTestController = require('../controllers/skillTest.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');

router.use(authenticate);
router.use(requireRole('freelancer'));

router.get('/proctoring-config', skillTestController.getProctoringConfig);
router.get('/generate', skillTestController.generateTest);
router.post('/submit', skillTestController.submitTest);
router.get('/history', skillTestController.getTestHistory);

module.exports = router;
