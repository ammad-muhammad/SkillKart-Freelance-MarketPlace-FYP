const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 1 },
  method: { type: String, required: true, enum: ['bank_transfer', 'paypal', 'stripe'] },
  status: { type: String, required: true, enum: ['pending', 'completed', 'failed', 'cancelled'], default: 'pending' },
  referenceId: { type: String }, // External transaction ID once processed
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
