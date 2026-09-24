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
  // 'pending_payment' is gig-order-only: the order exists (so it has an id to
  // pay against) but its 50% deposit hasn't landed yet. It only becomes
  // 'in-progress' — visible to the freelancer, counted in gig stats — once the
  // deposit is paid (services/gigOrder.service.js's activateGigOrder).
  status: {
    type: String,
    enum: ['draft', 'open', 'pending_payment', 'in-progress', 'completed', 'cancelled', 'expired', 'closed'],
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
  // Set when this gig order came from accepting a freelancer's custom offer in
  // chat instead of a fixed package — gigTier is then unset and gigId is only
  // present if the freelancer attached the offer to one of their gigs.
  customOfferId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomOffer' },
  // What the client actually wants built — collected when the order is placed
  // (mandatory for package orders, optional extra notes for a custom offer,
  // whose own description is already the agreed scope). `description` above
  // stays the gig's/offer's own text.
  // `default: undefined` on the nested arrays (here and on `delivery`) so a
  // job without them doesn't get an empty `{ links: [] }` stub saved — that
  // stub made `job.delivery` truthy on every gig order, i.e. "delivered" the
  // moment it was created. Older rows still carry the stub, so readers check
  // `delivery.submittedAt`, never just `delivery`.
  requirements: {
    description: String,
    referenceLinks: { type: [String], default: undefined },
    submittedAt: Date
  },
  // True when the client cancelled a gig order before paying the deposit —
  // lets the freelancer's lists skip orders they never had a stake in.
  cancelledBeforePayment: { type: Boolean, default: false },
  // Gig orders have no Contract/Milestone (they stay on the legacy 50/50
  // Stripe flow), so delivery is tracked directly on the job: present =
  // freelancer has delivered and the client should review; cleared by
  // requestGigRevision to send it back for changes.
  delivery: {
    message: String,
    links: { type: [String], default: undefined },
    submittedAt: Date
  },
  statsRolledUp: { type: Boolean, default: false },
  completedAt: Date,
  deletedAt: Date // set by the admin panel's soft-delete (adminPanel/jobs.controller.js:deleteJob)
}, { timestamps: true });

jobSchema.index({ clientId: 1 });
jobSchema.index({ hiredFreelancer: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ category: 1 });

module.exports = mongoose.model('Job', jobSchema);