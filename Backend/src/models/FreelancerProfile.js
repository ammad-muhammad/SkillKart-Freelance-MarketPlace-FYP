const mongoose = require('mongoose');

const freelancerProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  bio: String,
  title: String,
  coverPhoto: String,
  phone: String,
  hourlyRate: Number,
  skills: [{
    name: String,
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Expert'], default: 'Beginner' },
    isVerified: { type: Boolean, default: false },
    verificationScore: { type: Number, default: 0 },
    lastTestedAt: Date,
    expiresAt: Date
  }],
  portfolioLinks: [String],
  portfolio: [{
    title: String,
    description: String,
    url: String,
    images: [String]
  }],
  education: [{
    institution: String,
    degree: String,
    field: String,
    startDate: Date,
    endDate: Date,
    description: String
  }],
  certifications: [{
    name: String,
    issuer: String,
    issueDate: Date,
    expiryDate: Date,
    url: String,
    credentialId: String
  }],
  languages: [{
    language: String,
    proficiency: { type: String, enum: ['basic', 'conversational', 'fluent', 'native'] }
  }],
  availability: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'not-available'],
    default: 'full-time'
  },
  timezone: String,
  socialLinks: {
    github: String,
    linkedin: String,
    twitter: String,
    website: String
  },
  experienceLevel: { type: String, enum: ['Entry', 'Intermediate', 'Expert'], default: 'Entry' },
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
  rating: { type: Number, default: 0, min: 0, max: 5 },
  completedProjects: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  walletBalance: { type: Number, default: 0 },
  stripeAccountId: { type: String },
  stripeOnboardingComplete: { type: Boolean, default: false },
  verificationDetails: {
    emailVerified: { type: Boolean, default: false },
    onboardingCompleted: { type: Boolean, default: false },
    profileCompleted: { type: Boolean, default: false },
    allSkillTestsPassed: { type: Boolean, default: false },
    identityVerified: { type: Boolean, default: false },
    paymentMethodAdded: { type: Boolean, default: false },
    portfolioReviewed: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false }
  },
  verificationStatus: {
    type: String,
    enum: ['unverified', 'verified', 'pending'],
    default: 'unverified'
  },
  aiClassification: { type: String },
  savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }]
}, { timestamps: true });

module.exports = mongoose.model('FreelancerProfile', freelancerProfileSchema);