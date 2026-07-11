const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  category: {
    type: String,
    enum: ['fees', 'security', 'email', 'features', 'general', 'maintenance'],
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  valueType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'json'],
    required: true
  },
  lastUpdatedBy: {
    type: String // Admin email
  }
}, {
  timestamps: true
});

systemSettingsSchema.index({ category: 1 });

const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);

// Default settings to seed on first startup (assigned AFTER model creation)
SystemSettings.DEFAULT_SETTINGS = [
  {
    key: 'platform_fee_rate',
    value: 0.05,
    category: 'fees',
    description: 'Platform fee percentage (e.g. 0.05 = 5%)',
    valueType: 'number'
  },
  {
    key: 'maintenance_mode',
    value: false,
    category: 'maintenance',
    description: 'When true, the platform shows a maintenance page to users',
    valueType: 'boolean'
  },
  {
    key: 'max_login_attempts',
    value: 5,
    category: 'security',
    description: 'Maximum failed login attempts before account lock',
    valueType: 'number'
  },
  {
    key: 'otp_expiry_minutes',
    value: 10,
    category: 'security',
    description: 'OTP expiry time in minutes',
    valueType: 'number'
  },
  {
    key: 'enable_email_notifications',
    value: true,
    category: 'features',
    description: 'Enable or disable all email notifications',
    valueType: 'boolean'
  },
  {
    key: 'enable_ai_features',
    value: true,
    category: 'features',
    description: 'Enable or disable AI-powered features',
    valueType: 'boolean'
  },
  {
    key: 'withdrawal_min_amount',
    value: 10,
    category: 'fees',
    description: 'Minimum withdrawal amount in USD',
    valueType: 'number'
  },
  {
    key: 'escrow_release_days',
    value: 3,
    category: 'general',
    description: 'Days after contract completion before escrow auto-releases',
    valueType: 'number'
  }
];

module.exports = SystemSettings;
