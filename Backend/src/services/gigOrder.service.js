const Job = require('../models/Job');
const Gig = require('../models/Gig');
const Payment = require('../models/Payment');
const notifications = require('./notification.service');
const { stripHtml } = require('../utils/sanitizeInput');
const { BadRequestError, ForbiddenError } = require('../utils/apiError');

/**
 * Gig-order lifecycle helpers shared by both ways a gig order is born —
 * ordering a package (gig.controller.js's createGigOrder) and accepting a
 * freelancer's custom offer in chat (customOffer.controller.js's acceptOffer).
 *
 * An order is created as 'pending_payment' so it has an id to pay against,
 * and only goes live ('in-progress') once its 50% deposit actually lands —
 * see activateGigOrder, called from every place a deposit can be confirmed.
 */

/**
 * Normalize a requirements payload (already shape-checked by
 * validators/gigOrder.validator.js) into what's stored on Job.requirements.
 * Returns undefined when nothing was provided.
 */
function buildRequirements(input) {
  if (!input) return undefined;
  const description = stripHtml(String(input.description || '')).trim();
  const referenceLinks = Array.isArray(input.referenceLinks)
    ? [...new Set(input.referenceLinks.map((l) => String(l).trim()).filter(Boolean))].slice(0, 5)
    : [];
  if (!description && referenceLinks.length === 0) return undefined;
  return { description, referenceLinks, submittedAt: new Date() };
}

/**
 * Create the Job that represents a gig order, in 'pending_payment'.
 */
async function createGigOrderJob({
  clientId, freelancerId, title, description, price, duration,
  skills, category, subcategory, gigId, gigTier, customOfferId, requirements,
}) {
  return Job.create({
    title,
    description,
    clientId,
    hiredFreelancer: freelancerId,
    budget: { min: price, max: price, type: 'fixed' },
    skills: Array.isArray(skills) ? skills : [],
    category,
    subcategory,
    duration: duration || '',
    status: 'pending_payment',
    source: 'gig',
    gigId: gigId || undefined,
    gigTier: gigTier || undefined,
    customOfferId: customOfferId || undefined,
    requirements,
  });
}

/**
 * Flip a gig order from 'pending_payment' to 'in-progress' once its deposit
 * is paid. Atomic claim, so the wallet path, the browser's Stripe redirect
 * (confirmPayment) and the Stripe webhook can all call it for the same
 * deposit and only one of them runs the side effects.
 *
 * A 'cancelled' order whose cancellation happened before payment is revived
 * too: that only happens when a Stripe checkout the client had already opened
 * completes after they cancelled — the money was taken, so the order must go
 * ahead rather than silently swallow it.
 *
 * @returns {Promise<boolean>} true if this call activated the order (the
 *   caller then skips its generic "deposit funded" notification — the
 *   freelancer gets the richer "new order" one from here instead).
 */
async function activateGigOrder(jobOrId) {
  const jobId = jobOrId?._id || jobOrId;
  const activated = await Job.findOneAndUpdate(
    {
      _id: jobId,
      source: 'gig',
      $or: [
        { status: 'pending_payment' },
        { status: 'cancelled', cancelledBeforePayment: true },
      ],
    },
    { $set: { status: 'in-progress', cancelledBeforePayment: false } },
    { new: true }
  );
  if (!activated) return false;

  // Counted only now — an abandoned, never-paid checkout isn't an order.
  if (activated.gigId) {
    await Gig.updateOne({ _id: activated.gigId }, { $inc: { 'stats.orders': 1 } });
  }
  notifications.onGigOrdered(activated.hiredFreelancer, {
    job: activated,
    gigId: activated.gigId,
    hasRequirements: !!activated.requirements?.description,
  });
  return true;
}

/**
 * Whether a gig order is still waiting on its deposit. Covers orders placed
 * before 'pending_payment' existed too — those were created straight into
 * 'in-progress' with no deposit, so it has to be read off the Payment row.
 */
async function isAwaitingDeposit(job) {
  if (job.source !== 'gig') return false;
  if (job.status === 'pending_payment') return true;
  if (job.status !== 'in-progress' || job.delivery?.submittedAt) return false;
  const payment = await Payment.findOne({ jobId: job._id, type: 'job_escrow' }).select('status').lean();
  return !payment || payment.status === 'deposit_pending';
}

/**
 * Client cancels a gig order they haven't paid for yet. Nothing has moved, so
 * there's nothing to refund — the order is just marked cancelled (kept, not
 * deleted, so a Stripe checkout completing late still has a Job to land on;
 * see activateGigOrder).
 */
async function cancelUnpaidGigOrder(job, userId) {
  if (job.source !== 'gig') throw new BadRequestError('This is not a gig order');
  if (String(job.clientId) !== String(userId)) {
    throw new ForbiddenError('Only the client who placed this order can cancel it');
  }
  if (!(await isAwaitingDeposit(job))) {
    throw new BadRequestError('Only an order that hasn\'t been paid for yet can be cancelled here.');
  }

  const cancelled = await Job.findOneAndUpdate(
    { _id: job._id, status: job.status },
    { $set: { status: 'cancelled', cancelledBeforePayment: true } },
    { new: true }
  );
  if (!cancelled) throw new BadRequestError('This order changed while you were cancelling it — refresh and try again.');

  // Best-effort: stop an already-opened Stripe checkout from being completed.
  const payment = await Payment.findOne({ jobId: job._id, type: 'job_escrow', status: 'deposit_pending' });
  if (payment?.stripe?.depositSessionId && !payment.stripe.simulated) {
    const { expireCheckoutSession } = require('./stripe.service');
    await expireCheckoutSession(payment.stripe.depositSessionId).catch(() => {});
  }

  return cancelled;
}

module.exports = {
  buildRequirements,
  createGigOrderJob,
  activateGigOrder,
  isAwaitingDeposit,
  cancelUnpaidGigOrder,
};
