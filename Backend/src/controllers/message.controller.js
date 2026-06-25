const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { sendSuccess, sendCreated } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/helpers');
const { NotFoundError, BadRequestError } = require('../utils/apiError');
const { uploadJobAttachment: uploadAttachmentToCloud } = require('../services/upload.service');
const notifications = require('../services/notification.service');

/**
 * Get all conversations for current user
 */
const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  const conversations = await Conversation.find({
    participants: userId
  })
  .populate('participants', 'firstName lastName profilePicture')
  .populate('lastMessage')
  .sort({ updatedAt: -1 });
  
  sendSuccess(res, { data: conversations });
});

/**
 * Get messages for a conversation
 */
const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;
  
  // Verify user is participant
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId
  });
  
  if (!conversation) throw new NotFoundError('Conversation not found');
  
  const messages = await Message.find({ conversationId })
    .sort({ createdAt: 1 })
    .populate('sender', 'firstName lastName profilePicture');
    
  // Mark as read logic
  await Message.updateMany(
    { conversationId, sender: { $ne: userId }, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } }
  );
  
  // Reset unread count for this user
  conversation.unreadCount.set(userId.toString(), 0);
  await conversation.save();
  
  // Clear any global notifications for messages since the user is actively viewing chats
  const Notification = require('../models/Notification');
  await Notification.updateMany(
    { userId, type: 'new_message', read: false },
    { $set: { read: true, readAt: new Date() } }
  );
  
  sendSuccess(res, { data: messages });
});

/**
 * Send a message
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { recipientId, content, attachments } = req.body;
  const senderId = req.user._id;
  
  // 1. Find or create conversation
  let conversation = await Conversation.findOne({
    participants: { $all: [senderId, recipientId] }
  });
  
  if (!conversation) {
    conversation = await Conversation.create({
      participants: [senderId, recipientId]
    });
  }
  
  // 2. Create message
  const message = await Message.create({
    conversationId: conversation._id,
    sender: senderId,
    content,
    attachments
  });
  
  // 3. Update conversation
  conversation.lastMessage = message._id;
  
  // Increment unread count for recipient
  const currentUnread = conversation.unreadCount.get(recipientId.toString()) || 0;
  conversation.unreadCount.set(recipientId.toString(), currentUnread + 1);
  
  await conversation.save();

  // Notify the recipient (deep-link by their role). Fire-and-forget.
  User.findById(recipientId).select('role').lean()
    .then((recipient) => {
      notifications.onNewMessage(recipientId, {
        senderName: [req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || 'Someone',
        role: recipient?.role,
      });
    })
    .catch(() => { /* non-fatal */ });

  sendCreated(res, 'Message sent', { message });
});

/**
 * Upload a chat attachment (image or document). Any authenticated user.
 * Returns { url, name, mimeType } to attach to a subsequent sendMessage call.
 */
const uploadAttachment = asyncHandler(async (req, res) => {
  if (!req.file) throw new BadRequestError('No file provided');

  const result = await uploadAttachmentToCloud(req.file);

  sendCreated(res, 'Attachment uploaded', {
    url: result.url,
    name: result.originalName,
    mimeType: result.mimeType
  });
});

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  uploadAttachment
};
