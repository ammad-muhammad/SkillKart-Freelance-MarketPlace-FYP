const mongoose = require('mongoose');

const errorLogSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true
  },
  stack: {
    type: String
  },
  type: {
    type: String,
    enum: ['unhandledRejection', 'uncaughtException', 'requestError', 'validationError', 'other'],
    default: 'requestError',
    index: true
  },
  route: {
    type: String,
    index: true
  },
  method: {
    type: String
  },
  statusCode: {
    type: Number,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  ip: {
    type: String
  },
  userAgent: {
    type: String
  },
  requestBody: {
    type: mongoose.Schema.Types.Mixed
  },
  resolved: {
    type: Boolean,
    default: false,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

errorLogSchema.index({ type: 1, timestamp: -1 });
errorLogSchema.index({ resolved: 1, timestamp: -1 });

module.exports = mongoose.model('ErrorLog', errorLogSchema);
