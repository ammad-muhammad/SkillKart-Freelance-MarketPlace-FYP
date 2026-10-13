const mongoose = require('mongoose');

const adminSessionSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  loginAt: {
    type: Date,
    default: Date.now
  },
  lastActivityAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
    // Indexed via the TTL index below (expireAfterSeconds) — don't also declare
    // index:true here or Mongoose warns about a duplicate index.
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  logoutAt: {
    type: Date
  },
  logoutReason: {
    type: String,
    enum: ['manual', 'expired', 'inactivity', 'forced']
  },
  // RBAC-ready fields
  adminRole: {
    type: String,
    enum: ['super_admin', 'finance_admin', 'support_admin', 'moderator', 'analytics_viewer'],
    default: 'super_admin'
  },
  permissions: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

// Compound indexes
adminSessionSchema.index({ email: 1, isActive: 1 });
adminSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL auto-cleanup

module.exports = mongoose.model('AdminSession', adminSessionSchema);
