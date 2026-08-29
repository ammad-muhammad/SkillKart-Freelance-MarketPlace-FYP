const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true, index: true },
  // Which milestone this delivery is submitted against. Not schema-required —
  // absent on legacy/hourly deliveries that predate milestones — but the
  // fixed-price submitDelivery controller always sets it going forward.
  milestoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Milestone', index: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  
  version: { type: Number, required: true },
  
  message: { type: String, required: true },
  files: [{ type: String }],
  links: [{ type: String }],
  
  submittedAt: { type: Date, default: Date.now },
  
  status: {
    type: String,
    enum: ['pending_review', 'accepted', 'revision_requested'],
    default: 'pending_review',
    index: true
  },
  
  clientNotes: { type: String },
  reviewedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Delivery', deliverySchema);
