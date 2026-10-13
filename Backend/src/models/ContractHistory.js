const mongoose = require('mongoose');

const contractHistorySchema = new mongoose.Schema({
  contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true, index: true },
  action: { type: String, required: true },
  previousValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  // A marketplace user (client/freelancer) performing the action. Optional
  // because admin-panel actions are performed by an AdminUser, not a User —
  // those record the admin email in `performedByAdmin` instead. Previously this
  // was required, which made admin ContractHistory.create() calls throw a
  // CastError (email string into an ObjectId field) and silently drop the entry.
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedByAdmin: { type: String }, // admin email for admin-initiated actions
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('ContractHistory', contractHistorySchema);
