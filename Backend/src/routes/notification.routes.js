const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All notification routes require auth and operate on the caller's own rows.
router.get('/', authenticate, ctrl.listNotifications);
router.get('/unread-count', authenticate, ctrl.getUnreadCount);
router.patch('/read-all', authenticate, ctrl.markAllRead);
router.patch('/:id/read', authenticate, ctrl.markRead);
router.delete('/:id', authenticate, ctrl.deleteNotification);

module.exports = router;
