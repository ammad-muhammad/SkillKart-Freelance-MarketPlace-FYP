const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const { sendMessageValidation } = require('../validators/message.validator');
const { uploadSingle } = require('../middleware/upload.middleware');
const upload = { single: uploadSingle };

router.use(authenticate);

router.get('/conversations', messageController.getConversations);
// Upload a chat attachment (any authenticated user). Before /:conversationId.
router.post('/upload', upload.single('file'), messageController.uploadAttachment);
router.post('/send', sendMessageValidation, validate, messageController.sendMessage);
router.get('/:conversationId', messageController.getMessages);

module.exports = router;
