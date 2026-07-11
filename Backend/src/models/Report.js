const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reportedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  reportedItem: {
    type: {
      type: String,
      enum: ['review', 'message', 'job', 'gig', 'profile', 'other']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  category: {
    type: String,
    enum: ['spam', 'abuse', 'fraud', 'harassment', 'inappropriate', 'other'],
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  evidence: {
    type: [String],
    default: []
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'investigating', 'resolved', 'dismissed'],
    default: 'pending',
    index: true
  },
  assignedTo: {
    type: String // Admin email
  },
  resolution: {
    type: String
  },
  resolvedBy: {
    type: String // Admin email
  },
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

reportSchema.index({ status: 1, priority: 1, createdAt: -1 });
reportSchema.index({ reportedUser: 1, status: 1 });

module.exports = mongoose.model('Report', reportSchema);
