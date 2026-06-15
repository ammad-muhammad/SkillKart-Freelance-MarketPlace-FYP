const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const { authenticate } = require('../middleware/auth.middleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate);

router.get('/conversations', messageController.getConversations);
// Upload a chat attachment (any authenticated user). Before /:conversationId.
router.post('/upload', upload.single('file'), messageController.uploadAttachment);
router.post('/send', messageController.sendMessage);
router.get('/:conversationId', messageController.getMessages);

module.exports = router;
