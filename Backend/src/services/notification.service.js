const Notification = require('../models/Notification');

/**
 * Notification service — the single entry point the lifecycle uses to create
 * in-app notifications. All helpers are fire-and-forget: they log and swallow
 * errors so a notification failure can NEVER break the underlying action.
 */

const TYPES = {
  PROPOSAL_RECEIVED: 'proposal_received',
  PROPOSAL_ACCEPTED: 'proposal_accepted',
  PROPOSAL_REJECTED: 'proposal_rejected',
  GIG_ORDERED: 'gig_ordered',
  DEPOSIT_FUNDED: 'deposit_funded',
  WORK_DELIVERED: 'work_delivered',
  REVISION_REQUESTED: 'revision_requested',
  PAYMENT_RELEASED: 'payment_released',
  PROJECT_COMPLETED: 'project_completed',
  NEW_MESSAGE: 'new_message',
};

/**
 * Low-level create. Accepts a single recipient.
 * @returns {Promise<void>}
 */
async function notify(userId, { type, title, message = '', link = '', jobId, gigId, proposalId }) {
  if (!userId || !type || !title) return;
  try {
    await Notification.create({ userId, type, title, message, link, jobId, gigId, proposalId });
  } catch (e) {
    // Never let a notification failure bubble up into the request.
    // eslint-disable-next-line no-console
    console.error('[notify] failed:', e.message);
  }
}

/* ── Event helpers (each maps an event → a recipient + copy + deep link) ── */

const onProposalReceived = (clientId, { job, freelancerName }) => notify(clientId, {
  type: TYPES.PROPOSAL_RECEIVED,
  title: 'New proposal received',
  message: `${freelancerName || 'A freelancer'} applied to "${job?.title || 'your project'}".`,
  link: `/client/projects/${job?._id}/proposals`,
  jobId: job?._id,
});

const onProposalAccepted = (freelancerId, { job }) => notify(freelancerId, {
  type: TYPES.PROPOSAL_ACCEPTED,
  title: 'Your proposal was accepted! 🎉',
  message: `You've been hired for "${job?.title || 'a project'}". It starts once the client funds the deposit.`,
  link: '/freelancer/proposals',
  jobId: job?._id,
});

const onProposalRejected = (freelancerId, { job }) => notify(freelancerId, {
  type: TYPES.PROPOSAL_REJECTED,
  title: 'Proposal not selected',
  message: `Your proposal for "${job?.title || 'a project'}" wasn't selected this time.`,
  link: '/freelancer/proposals',
  jobId: job?._id,
});

const onGigOrdered = (freelancerId, { job, gigId }) => notify(freelancerId, {
  type: TYPES.GIG_ORDERED,
  title: 'New gig order! 🛍️',
  message: `A client ordered "${job?.title || 'your gig'}". Work starts once the deposit is funded.`,
  link: '/freelancer/work',
  jobId: job?._id,
  gigId,
});

// To the freelancer: the client funded the deposit → they may now deliver.
const onDepositFunded = (freelancerId, { job }) => notify(freelancerId, {
  type: TYPES.DEPOSIT_FUNDED,
  title: 'Deposit funded — you can start! 💰',
  message: `The client funded the 50% deposit for "${job?.title || 'the project'}". You can deliver your work now.`,
  link: '/freelancer/work',
  jobId: job?._id,
});

// To the client: the freelancer delivered → review it.
const onWorkDelivered = (clientId, { job }) => notify(clientId, {
  type: TYPES.WORK_DELIVERED,
  title: 'Work delivered 📦',
  message: `Your project "${job?.title || ''}" has been delivered. Review and accept it (or request a revision).`,
  link: '/client/projects',
  jobId: job?._id,
});

// To the freelancer: client asked for changes.
const onRevisionRequested = (freelancerId, { job }) => notify(freelancerId, {
  type: TYPES.REVISION_REQUESTED,
  title: 'Revision requested 🔁',
  message: `The client requested changes on "${job?.title || 'the project'}".`,
  link: '/freelancer/work',
  jobId: job?._id,
});

// To the freelancer: final payment released.
const onPaymentReleased = (freelancerId, { job, amount }) => notify(freelancerId, {
  type: TYPES.PAYMENT_RELEASED,
  title: 'You got paid! 🎉',
  message: `Payment of $${amount} (net of fee) was released for "${job?.title || 'a project'}".`,
  link: '/freelancer/work',
  jobId: job?._id,
});

const onNewMessage = (recipientId, { senderName, role }) => notify(recipientId, {
  type: TYPES.NEW_MESSAGE,
  title: `New message from ${senderName || 'someone'}`,
  message: 'You have a new message.',
  link: role === 'freelancer' ? '/freelancer/messages' : '/client/messages',
});

module.exports = {
  TYPES,
  notify,
  onProposalReceived,
  onProposalAccepted,
  onProposalRejected,
  onGigOrdered,
  onDepositFunded,
  onWorkDelivered,
  onRevisionRequested,
  onPaymentReleased,
  onNewMessage,
};
