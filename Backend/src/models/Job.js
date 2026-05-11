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
  deadline: Date
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);