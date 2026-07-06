const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  budget: {
    min: Number,
    max: Number,
    type: { type: String, enum: ['fixed', 'hourly'] }
  },
  skills: [String],
  category: String,
  subcategory: String,
  experienceLevel: { type: String, enum: ['entry', 'intermediate', 'expert'] },
  duration: String,
  status: {
    type: String,
    enum: ['draft', 'open', 'in-progress', 'completed', 'cancelled', 'expired', 'closed'],
    default: 'open'
  },
  attachments: [String],
  proposals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Proposal' }],
  hiredFreelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', index: true },
  deadline: Date,
  // When this job was created by ORDERING a gig (vs a client-posted project),
  // these link it back to the source gig + chosen pricing tier. A gig order
  // reuses the whole job lifecycle (escrow → deliver → complete → stats).
  source: { type: String, enum: ['project', 'gig'], default: 'project' },
  gigId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gig' },
  gigTier: { type: String, enum: ['basic', 'standard', 'premium'] },
  statsRolledUp: { type: Boolean, default: false },
  completedAt: Date
}, { timestamps: true });

jobSchema.index({ clientId: 1 });
jobSchema.index({ hiredFreelancer: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ category: 1 });

module.exports = mongoose.model('Job', jobSchema);