const mongoose = require('mongoose');

/**
 * AdminUser — RBAC-ready model.
 * NOT used for authentication today (credentials stay in .env).
 * Schema exists so multi-admin RBAC can be enabled by:
 *   1. Setting config.adminPanel.useRBAC = true
 *   2. Populating this collection
 *   3. Switching adminAuth.middleware.js to lookup here
 */
const adminUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  passwordHash: {
    type: String,
    required: true,
    select: false
  },
  role: {
    type: String,
    enum: ['super_admin', 'finance_admin', 'support_admin', 'moderator', 'analytics_viewer'],
    default: 'super_admin'
  },
  permissions: {
    type: [String],
    default: []
    // Examples: 'users.read', 'users.write', 'payments.read', 'payments.write',
    //           'wallets.write', 'disputes.resolve', 'settings.write', 'analytics.read'
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  lastLoginAt: {
    type: Date
  },
  createdBy: {
    type: String // Admin email of creator
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AdminUser', adminUserSchema);
