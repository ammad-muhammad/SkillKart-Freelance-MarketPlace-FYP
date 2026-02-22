const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  coverLetter: { type: String, required: true },
  proposedRate: { type: Number, required: true },
  estimatedDuration: String,
  attachments: [String],
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
    default: 'pending'
  },
  clientResponse: String,
  respondedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Proposal', proposalSchema);