const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  coverLetter: { type: String, required: true },
  fixedPrice: { type: Number },
  hourlyRate: { type: Number },
  estimatedDeliveryTime: { type: String },
  estimatedWeeklyHours: { type: Number },
  attachments: [String],
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
    default: 'pending',
    index: true
  },
  clientResponse: String,
  respondedAt: Date,
  // Set true only when the client rejects with "allow resubmit" checked —
  // lets the freelancer edit this same proposal and send it back as pending
  // instead of it being a dead end. Cleared as soon as it's used.
  canResubmit: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Proposal', proposalSchema);