const mongoose = require('mongoose');

const adminAuditLogSchema = new mongoose.Schema({
  adminEmail: {
    type: String,
    required: true,
    index: true
  },
  adminRole: {
    type: String,
    default: 'super_admin'
  },
  action: {
    type: String,
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: [
      'auth', 'user', 'job', 'contract', 'dispute', 'payment',
      'wallet', 'withdrawal', 'review', 'report', 'notification',
      'settings', 'chat', 'analytics', 'monitoring', 'export'
    ],
    required: true,
    index: true
  },
  resource: {
    type: String,
    required: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  previousValue: {
    type: mongoose.Schema.Types.Mixed
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  notes: {
    type: String
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info',
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
adminAuditLogSchema.index({ adminEmail: 1, createdAt: -1 });
adminAuditLogSchema.index({ category: 1, createdAt: -1 });
adminAuditLogSchema.index({ severity: 1, createdAt: -1 });
adminAuditLogSchema.index({ resourceId: 1, createdAt: -1 });

module.exports = mongoose.model('AdminAuditLog', adminAuditLogSchema);
