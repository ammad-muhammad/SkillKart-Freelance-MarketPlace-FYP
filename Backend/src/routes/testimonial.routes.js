const express = require('express');
const router = express.Router();
const testimonialController = require('../controllers/testimonial.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');

// Freelancer-owned: submit / view / delete their own success story.
router.use(authenticate);

router.get('/me', requireRole('freelancer'), testimonialController.getMyTestimonial);
router.post('/', requireRole('freelancer'), testimonialController.submitTestimonial);
router.delete('/me', requireRole('freelancer'), testimonialController.deleteMyTestimonial);

module.exports = router;
