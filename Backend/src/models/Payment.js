const mongoose = require('mongoose');

/**
 * Payment / escrow record — one per Milestone (or one per hired job, for
 * legacy/hourly rows that predate milestones).
 *
 * Current flow (100% lock per milestone):
 *   deposit_pending → deposit_paid    (client funds 100% of this milestone's
 *                                       amount before the freelancer may
 *                                       start/submit work on it)
 *                   → released        (client approves the delivered work, or
 *                                       the 7-day auto-release cron fires;
 *                                       SkillKart releases the full milestone
 *                                       amount minus the platform fee to the
 *                                       freelancer's wallet — recorded payout)
 *                   → refunded        (dispute resolved in the client's favor)
 *
 * `depositAmount`/`finalAmount` are legacy 50/50-split fields kept only so old
 * code paths that still read them don't break — for every new milestone-flow
 * row both are simply set equal to `totalAmount` (100% at once, not a split).
 *
 * Amounts are stored in whole currency units (PKR), not cents.
 */
const paymentSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', index: true },
  contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', index: true },
  milestoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Milestone', index: true },
  proposalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal' },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['job_escrow', 'wallet_deposit', 'hourly_invoice'], default: 'job_escrow' },

  totalAmount: { type: Number, required: true },     // this milestone's 100% amount
  depositAmount: { type: Number, required: true },   // legacy field — equals totalAmount for new rows
  finalAmount: { type: Number, required: true },     // legacy field — equals totalAmount for new rows
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
