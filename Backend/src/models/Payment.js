const mongoose = require('mongoose');

/**
 * Payment / escrow record — one per hired job.
 *
 * Flow (50/50 escrow):
 *   deposit_pending → deposit_paid    (client pays 50% to start work)
 *                   → released        (client pays remaining 50% on accepting
 *                                       delivery; SkillKart releases the full
 *                                       amount minus the 0.5% platform fee to
 *                                       the freelancer — recorded payout)
 *                   → refunded        (cancelled)
 *
 * Amounts are stored in whole currency units (PKR), not cents.
 */
const paymentSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['job_escrow', 'wallet_deposit'], default: 'job_escrow' },

  totalAmount: { type: Number, required: true },     // agreed project amount
  depositAmount: { type: Number, required: true },   // 50% upfront
  finalAmount: { type: Number, required: true },     // remaining 50%
  feeRate: { type: Number, default: 0.005 },         // 0.5% platform fee
  platformFee: { type: Number, default: 0 },         // computed on release
  freelancerPayout: { type: Number, default: 0 },    // total - fee (recorded)
  currency: { type: String, default: 'PKR' },

  status: {
    type: String,
    enum: ['deposit_pending', 'deposit_paid', 'released', 'refunded'],
    default: 'deposit_pending'
  },

  // Stripe references (test mode). For the dummy/simulated path these hold the
  // synthetic session ids so the confirm step still works end-to-end.
  stripe: {
    depositSessionId: String,
    finalSessionId: String,
    depositPaymentIntent: String,
    finalPaymentIntent: String,
    simulated: { type: Boolean, default: false }  // true when no real Stripe key
  },

  depositPaidAt: Date,
  releasedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
