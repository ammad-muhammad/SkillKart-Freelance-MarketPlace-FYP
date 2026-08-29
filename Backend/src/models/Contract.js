const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  proposalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['fixed', 'hourly'], required: true },
  
  fixedPrice: { type: Number },
  hourlyRate: { type: Number },
  weeklyLimit: { type: Number },
  agreedDeadline: { type: Date },

  // Fixed-price milestone tracking. `milestoneMode` is false (the default,
  // single-milestone-covering-the-whole-price) unless the client explicitly
  // split the project into multiple milestones at accept time.
  milestoneMode: { type: Boolean, default: false },
  currentMilestoneOrder: { type: Number, default: 1 },
  
  status: {
    type: String,
    enum: ['active', 'paused', 'in_revision', 'delivered', 'completed', 'pending_cancellation', 'under_review', 'cancelled'],
    default: 'active',
    index: true
  },
  
  revisionNote: { type: String },
  
  paymentStatus: { type: String, index: true },
  
  timer: {
    isActive: { type: Boolean, default: false },
    startedAt: { type: Date },
    accumulatedMs: { type: Number, default: 0 }
  },
  
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },

  endRequest: {
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, enum: ['Work completed', 'Mutual agreement', 'Client no longer requires work', 'Freelancer unavailable', 'Communication issues', 'Other'] },
    additionalDetails: { type: String },
    status: { type: String, enum: ['pending', 'rejected', 'approved'] },
    requestedAt: { type: Date }
  },

  dispute: {
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String },
    description: { type: String },
    status: { type: String, enum: ['pending', 'resolved'] },
    raisedAt: { type: Date },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolutionNotes: { type: String },
    resolvedAt: { type: Date }
  }
}, { timestamps: true });

module.exports = mongoose.model('Contract', contractSchema);
