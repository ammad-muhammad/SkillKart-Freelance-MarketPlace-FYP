const mongoose = require('mongoose');

const taxonomyProposalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['industry', 'category', 'profession', 'skill', 'technology', 'tool', 'concept'],
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    aliases: [{
      type: String,
      trim: true
    }],
    synonyms: [{
      type: String,
      trim: true
    }],
    weight: {
      type: Number,
      default: 1.0
    },
    icon: {
      type: String,
      default: ''
    },
    color: {
      type: String,
      default: ''
    },
    relationships: [{
      targetName: {
        type: String,
        required: true,
        trim: true
      },
      type: {
        type: String,
        required: true
      },
      weight: {
        type: Number,
        default: 1.0
      }
    }],
    sourceType: {
      type: String,
      enum: ['gig_creation', 'job_posting', 'profile_update', 'periodic_analysis'],
      required: true
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'approved', 'rejected'],
      default: 'pending_review'
    },
    aiReasoning: {
      type: String,
      default: ''
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Create compound index for uniqueness in pending proposals
taxonomyProposalSchema.index({ name: 1, type: 1, status: 1 });

module.exports = mongoose.model('TaxonomyProposal', taxonomyProposalSchema);
