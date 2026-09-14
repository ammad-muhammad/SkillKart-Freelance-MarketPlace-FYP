const mongoose = require('mongoose');

const timeLogSchema = new mongoose.Schema({
  contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true, index: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  
  duration: { type: Number, required: true }, // in milliseconds
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  date: { type: Date, required: true },
  
  source: { type: String, enum: ['timer', 'manual'], required: true },
  timezone: { type: String },
  notes: { type: String },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'billed'],
    default: 'pending',
    index: true
  }
}, { timestamps: true });

// contractId and status already carry single-field indexes above, but every
// real query filters on BOTH together (settling pending logs for a contract,
// dispute/admin views, the drawdown cron) — a compound index serves those
// directly instead of relying on index intersection.
timeLogSchema.index({ contractId: 1, status: 1 });

module.exports = mongoose.model('TimeLog', timeLogSchema);
