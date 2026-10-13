const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  attachments: [mongoose.Schema.Types.Mixed],
  // 'custom_offer' messages are rendered as an offer card; `content` is only
  // a plain-text summary (conversation previews, push text).
  type: { type: String, enum: ['text', 'custom_offer'], default: 'text' },
  customOfferId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomOffer' },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

// message.controller.js loads a conversation's messages via
// Message.find({ conversationId }).sort({ createdAt: 1 }) — every page load.
messageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
