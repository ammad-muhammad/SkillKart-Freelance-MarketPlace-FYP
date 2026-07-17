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
  provider: {
    type: String,
    enum: ['smtp', 'gmail'],
    index: true
  },
  status: {
    type: String,
    enum: ['sent', 'failed', 'queued'],
    default: 'sent',
    index: true
  },
  durationMs: {
    type: Number
  },
  attempts: {
    type: Number
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
  }
}, {
  timestamps: true
});

emailLogSchema.index({ status: 1, sentAt: -1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
