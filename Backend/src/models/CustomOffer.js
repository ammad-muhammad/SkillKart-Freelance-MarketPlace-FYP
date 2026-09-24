const mongoose = require('mongoose');

/**
 * A freelancer's custom offer to a client, sent from an existing chat
 * (customOffer.controller.js). It's how a price/scope agreed in conversation
 * becomes an order: accepting creates a gig-order Job at the offer's price
 * (gigOrder.service.js's createGigOrderJob) that then runs the same 50/50
 * deposit → deliver → release lifecycle as a package order.
 *
 * `status` only covers the offer itself — once accepted, the order's own
 * progress (awaiting payment / in progress / cancelled) is read off `jobId`.
 * A pending offer past `expiresAt` is treated as expired even before
 * anything writes 'expired' to it.
 */
const customOfferSchema = new mongoose.Schema({
  freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  // Optional — lets the freelancer base the offer on one of their gigs
  // (category/skills are copied onto the order from it).
  gigId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gig' },

  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  deliveryDays: { type: Number, required: true },
  revisions: { type: Number, default: 0 },

  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'withdrawn', 'expired'],
    default: 'pending',
    index: true
  },
  expiresAt: { type: Date, required: true },
  respondedAt: Date,
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
}, { timestamps: true });

module.exports = mongoose.model('CustomOffer', customOfferSchema);
