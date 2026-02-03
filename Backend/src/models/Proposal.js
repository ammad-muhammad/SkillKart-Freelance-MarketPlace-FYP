const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    coverLetter: {
      type: String,
      required: true,
      maxlength: 3000,
    },
    proposedBudget: {
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
      type: {
        type: String,
        enum: ['fixed', 'hourly'],
        required: true,
      },
      currency: {
        type: String,
        default: 'USD',
      },
    },
    deliveryTime: {
      value: {
        type: Number,
        required: true,
      },
      unit: {
        type: String,
        enum: ['days', 'weeks', 'months'],
        required: true,
      },
    },
    attachments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FileUpload',
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
      default: 'pending',
      index: true,
    },
    clientViewed: {
      type: Boolean,
      default: false,
    },
    viewedAt: {
      type: Date,
    },
    respondedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
proposalSchema.index({ jobId: 1, freelancerId: 1 }, { unique: true });
proposalSchema.index({ freelancerId: 1, status: 1 });
proposalSchema.index({ jobId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Proposal', proposalSchema);
