const mongoose = require('mongoose');

const apiLogSchema = new mongoose.Schema({
  method: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true,
    index: true
  },
  statusCode: {
    type: Number,
    required: true,
    index: true
  },
  duration: {
    type: Number // milliseconds
  },
  ip: {
    type: String
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  userAgent: {
    type: String
  },
  requestSize: {
    type: Number // bytes
  },
  responseSize: {
    type: Number // bytes
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

apiLogSchema.index({ statusCode: 1, timestamp: -1 });
apiLogSchema.index({ path: 1, timestamp: -1 });

module.exports = mongoose.model('ApiLog', apiLogSchema);
