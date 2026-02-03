const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    skills: [
      {
        type: String,
        required: true,
      },
    ],
    budget: {
      type: {
        type: String,
        enum: ['fixed', 'hourly'],
        required: true,
      },
      min: {
        type: Number,
        min: 0,
      },
      max: {
        type: Number,
        min: 0,
      },
      currency: {
        type: String,
        default: 'USD',
      },
    },
    duration: {
      type: String,
      enum: ['less-than-week', '1-4-weeks', '1-3-months', '3-6-months', '6-months-plus'],
    },
    experienceLevel: {
      type: String,
      enum: ['entry', 'intermediate', 'expert'],
      required: true,
    },
    projectType: {
      type: String,
      enum: ['one-time', 'ongoing'],
      default: 'one-time',
    },
    attachments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FileUpload',
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'active', 'closed', 'cancelled', 'in-progress', 'completed'],
      default: 'active',
      index: true,
    },
    proposals: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
    hiredFreelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    deadline: {
      type: Date,
    },
    postedAt: {
      type: Date,
      default: Date.now,
    },
    closedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
jobSchema.index({ clientId: 1, status: 1 });
jobSchema.index({ status: 1, postedAt: -1 });
jobSchema.index({ category: 1, status: 1 });
jobSchema.index({ skills: 1 });
jobSchema.index({ title: 'text', description: 'text', category: 'text' });

// Compound index for filtering
jobSchema.index({ status: 1, category: 1, 'budget.type': 1 });

module.exports = mongoose.model('Job', jobSchema);
