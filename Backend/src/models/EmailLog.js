const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  to: {
    type: String,
    required: true,
    index: true
  },
  subject: {
    type: String,
    required: true
  },
  template: {
    type: String
  },
  status: {
    type: String,
    enum: ['sent', 'failed', 'queued', 'skipped'],
    default: 'sent',
    index: true
  },
  errorMessage: {
    type: String
  },
  sentAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  triggeredBy: {
    type: String // userId or 'system' or 'admin'
  },

  // ── Multi-provider observability fields (all optional, non-breaking) ──
  provider: {
    type: String // 'smtp' | 'resend' | ...
  },
  duration: {
    type: Number // milliseconds spent delivering
  },
  retryCount: {
    type: Number,
    default: 0
  },
  requestId: {
    type: String // provider-specific request id (Resend returns one)
  },
  messageId: {
    type: String // provider-specific message id
  },
  errorCode: {
    type: String // error classification code / status
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed // context: userId, feature, source, ...
  },
  originalRecipient: {
    type: String // the real recipient when sandbox mode redirected delivery
  },
  sandbox: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

emailLogSchema.index({ status: 1, sentAt: -1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
