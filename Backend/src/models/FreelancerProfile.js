const mongoose = require('mongoose');

const freelancerProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  bio: String,
  title: String,
  hourlyRate: Number,
  skills: [String],
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
    endDate: Date
  }],
  certifications: [{
    name: String,
    issuer: String,
    issueDate: Date,
    url: String
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
  rating: { type: Number, default: 0, min: 0, max: 5 },
  completedProjects: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  verificationStatus: {
    type: String,
    enum: ['unverified', 'verified', 'pending'],
    default: 'unverified'
  },
  aiClassification: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('FreelancerProfile', freelancerProfileSchema);