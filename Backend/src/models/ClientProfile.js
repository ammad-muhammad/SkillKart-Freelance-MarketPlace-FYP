const mongoose = require('mongoose');

const clientProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    fullName: {
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
      maxlength: 1000,
    },
    website: {
      type: String,
      trim: true,
    },
    companySize: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '500+'],
    },
    industry: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
    },
    totalJobsPosted: {
      type: Number,
      default: 0,
    },
    totalHires: {
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
  },
  {
    timestamps: true,
  }
);

// Indexes
clientProfileSchema.index({ userId: 1 });
clientProfileSchema.index({ companyName: 'text', industry: 'text' });

module.exports = mongoose.model('ClientProfile', clientProfileSchema);
