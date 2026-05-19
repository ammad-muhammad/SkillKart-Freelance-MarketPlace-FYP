const mongoose = require('mongoose');

const clientProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  companyName: String,
  companyType: { type: String, enum: ['Individual', 'Startup', 'SME', 'Enterprise'] },
  companyLogo: String,
  companySize: String,
  industry: [String],
  industryType: [String],
  customIndustry: String,
  role: String,
  phone: String,
  website: String,
  description: String,
  location: {
    country: String,
    city: String,
    address: String
  },
  
  // Onboarding Data
  isNewToHiring: String,
  services: [String],
  techStack: [String],
  budgetRange: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 }
  },
  hiringFrequency: String,
  technicalUnderstanding: { type: Number, min: 1, max: 10 },
  urgency: String,
  aiAssistance: { type: Boolean, default: true },
  onboardingStatus: { type: String, enum: ['in-progress', 'completed'], default: 'in-progress' },
  timezone: String,
  socialLinks: {
    linkedin: String,
    twitter: String,
    website: String
  },
  notificationSettings: {
    emailNotifications: { type: Boolean, default: true },
    proposalAlerts: { type: Boolean, default: true },
    messageAlerts: { type: Boolean, default: true }
  },
  securitySettings: {
    twoFactorEnabled: { type: Boolean, default: true },
    loginAlerts: { type: Boolean, default: true },
    passwordChangeAlerts: { type: Boolean, default: true },
    recoveryEmail: String,
    recoveryPhone: String
  },
  profileCompletion: { type: Number, default: 0 },
  verificationStatus: {
    type: String,
    enum: ['unverified', 'pending', 'verified', 'rejected'],
    default: 'unverified'
  },
  verificationDocuments: [String],
  languages: [{
    language: String,
    proficiency: { type: String, enum: ['basic', 'conversational', 'fluent', 'native'] }
  }],
  rating: { type: Number, default: 0, min: 0, max: 5 },
  totalProjectsPosted: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  savedFreelancers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('ClientProfile', clientProfileSchema);