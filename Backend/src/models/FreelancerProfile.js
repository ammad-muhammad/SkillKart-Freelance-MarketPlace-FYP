const mongoose = require('mongoose');

const freelancerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    location: {
      country: String,
      city: String,
      timezone: String,
    },
    bio: {
      type: String,
      maxlength: 2000,
    },
    hourlyRate: {
      type: Number,
      min: 0,
    },
    skills: [
      {
        name: {
          type: String,
          required: true,
        },
        level: {
          type: String,
          enum: ['beginner', 'intermediate', 'expert'],
          default: 'intermediate',
        },
      },
    ],
    experience: [
      {
        title: String,
        company: String,
        startDate: Date,
        endDate: Date,
        current: Boolean,
        description: String,
      },
    ],
    education: [
      {
        degree: String,
        institution: String,
        startDate: Date,
        endDate: Date,
        fieldOfStudy: String,
      },
    ],
    portfolio: [
      {
        title: String,
        description: String,
        url: String,
        fileId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'FileUpload',
        },
      },
    ],
    resume: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FileUpload',
    },
    avatar: {
      type: String,
    },
    languages: [
      {
        language: String,
        proficiency: {
          type: String,
          enum: ['basic', 'conversational', 'fluent', 'native'],
        },
      },
    ],
    availability: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'hourly'],
      default: 'full-time',
    },
    totalProposals: {
      type: Number,
      default: 0,
    },
    totalJobsCompleted: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
freelancerProfileSchema.index({ userId: 1 });
freelancerProfileSchema.index({ 'skills.name': 1 });
freelancerProfileSchema.index({ hourlyRate: 1 });
freelancerProfileSchema.index({ rating: -1 });
freelancerProfileSchema.index({ fullName: 'text', title: 'text', bio: 'text' });

module.exports = mongoose.model('FreelancerProfile', freelancerProfileSchema);
