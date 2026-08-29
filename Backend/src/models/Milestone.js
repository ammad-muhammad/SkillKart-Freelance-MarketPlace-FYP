const mongoose = require('mongoose');

/**
 * Milestone — one unit of escrow-backed work within a fixed-price Contract.
 * Every fixed-price contract has at least one (the degenerate "whole
 * project" case when the client doesn't split into multiple milestones).
 *
 * Lifecycle (sequential — the next milestone isn't funded until this one is
 * released, not all locked upfront):
 *   pending_funding → funded            (client locks 100% of `amount`)
 *                    → submitted         (freelancer submits delivery)
 *                    → in_revision       (client requests changes) → submitted (resubmit)
 *                    → approved/released (client approves, or the 7-day
 *                                          auto-release cron fires)
 *                    → disputed          (either party raises a dispute while
 *                                          submitted; excluded from auto-release
 *                                          until an admin resolves it)
 *                    → refunded          (dispute resolved in the client's favor)
 *
 * A top-level collection (not embedded on Contract) so the auto-release cron
 * and the admin disputes list can query across all milestones cheaply, the
 * same way Contract/Payment already are.
 */
const milestoneSchema = new mongoose.Schema({
  contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true, index: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true }, // denormalized for cheap lookups

  order: { type: Number, required: true }, // 1-based sequence within the contract
  title: { type: String, required: true },
  description: { type: String },
  amount: { type: Number, required: true }, // this milestone's 100% price

  status: {
    type: String,
    enum: ['pending_funding', 'funded', 'submitted', 'in_revision', 'approved', 'disputed', 'released', 'refunded'],
    default: 'pending_funding',
    index: true
  },

  fundedAt: { type: Date },
  submittedAt: { type: Date },
  reviewDeadline: { type: Date, index: true }, // submittedAt + SystemSettings.escrow_release_days; the auto-release cron scans this
  approvedAt: { type: Date },
  releasedAt: { type: Date },

  revisionNote: { type: String },

  dispute: {
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String },
    description: { type: String },
    status: { type: String, enum: ['pending', 'resolved'] },
    raisedAt: { type: Date },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolutionNotes: { type: String },
    resolvedAt: { type: Date }
  }
}, { timestamps: true });

module.exports = mongoose.model('Milestone', milestoneSchema);
