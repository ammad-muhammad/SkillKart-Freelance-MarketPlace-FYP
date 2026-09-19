const Notification = require('../models/Notification');
const pushService = require('./push.service');

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
  WITHDRAWAL_REQUESTED: 'withdrawal_requested',
  WITHDRAWAL_COMPLETED: 'withdrawal_completed',
  ESCROW_REFUNDED: 'escrow_refunded',
  REVIEW_SUBMITTED: 'review_submitted',
  JOB_CANCELLED: 'job_cancelled',
  CONTRACT_DISPUTED: 'contract_disputed',
  MILESTONE_AUTO_RELEASED: 'milestone_auto_released',
  SYSTEM_WARNING: 'system_warning',
  DISPUTE_RESOLVED: 'dispute_resolved',
  DISPUTE_DISMISSED: 'dispute_dismissed',
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
  // Fire-and-forget: pushService no-ops entirely when Firebase isn't
  // configured, and never throws — safe to call unconditionally for every
  // notification type from this single choke point.
  pushService.sendToUser(userId, { title, body: message, link }).catch(() => {});
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

const onProposalRejected = (freelancerId, { job, canResubmit }) => notify(freelancerId, {
  type: TYPES.PROPOSAL_REJECTED,
  title: canResubmit ? 'Proposal not selected — you can revise it' : 'Proposal not selected',
  message: canResubmit
    ? `Your proposal for "${job?.title || 'a project'}" wasn't selected, but the client is open to a revised resubmission.`
    : `Your proposal for "${job?.title || 'a project'}" wasn't selected this time.`,
  link: '/freelancer/proposals',
  jobId: job?._id,
});

// To the client: the freelancer edited a rejected-but-resubmittable
// proposal and sent it back — it's pending review again.
const onProposalResubmitted = (clientId, { job, freelancerName }) => notify(clientId, {
  type: TYPES.PROPOSAL_RECEIVED,
  title: 'Proposal resubmitted',
  message: `${freelancerName || 'A freelancer'} revised and resubmitted their proposal for "${job?.title || 'your project'}".`,
  link: `/client/projects/${job?._id}/proposals`,
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
  message: `Payment of PKR ${amount} (net of fee) was released for "${job?.title || 'a project'}".`,
  link: '/freelancer/work',
  jobId: job?._id,
});

const onNewMessage = (recipientId, { senderName, role }) => notify(recipientId, {
  type: TYPES.NEW_MESSAGE,
  title: `New message from ${senderName || 'someone'}`,
  message: 'You have a new message.',
  link: role === 'freelancer' ? '/freelancer/messages' : '/client/messages',
});

const onWithdrawalRequested = (freelancerId, { amount, method }) => notify(freelancerId, {
  type: TYPES.WITHDRAWAL_REQUESTED,
  title: 'Withdrawal Initiated 💸',
  message: `Your withdrawal of PKR ${amount} via ${method === 'stripe' ? 'Stripe Connect' : method} has been successfully initiated.`,
  link: '/freelancer/wallet',
});

const onWithdrawalCompleted = (freelancerId, { amount }) => notify(freelancerId, {
  type: TYPES.WITHDRAWAL_COMPLETED,
  title: 'Withdrawal Completed 💸',
  message: `Your withdrawal of PKR ${amount} has been successfully processed.`,
  link: '/freelancer/wallet',
});

const onEscrowRefunded = (clientId, { amount, job }) => notify(clientId, {
  type: TYPES.ESCROW_REFUNDED,
  title: 'Escrow Refunded',
  message: `PKR ${amount} has been refunded to your wallet for the cancelled project "${job?.title}".`,
  link: '/client/wallet',
  jobId: job?._id,
});

const onReviewSubmitted = (recipientId, { reviewerName, job }) => notify(recipientId, {
  type: TYPES.REVIEW_SUBMITTED,
  title: 'New Review!',
  message: `${reviewerName} just left you a review for "${job?.title}".`,
  // Recipient could be either role here (reviews go both directions), so
  // there's no single role-specific dashboard page to link to safely — the
  // public job page is valid for any logged-in role.
  link: `/jobs/${job?._id}`,
  jobId: job?._id,
});

const onJobCancelled = (userId, { job }) => notify(userId, {
  type: TYPES.JOB_CANCELLED,
  title: 'Project Cancelled',
  message: `The project "${job?.title}" has been cancelled.`,
  // Same ambiguous-recipient-role reasoning as onReviewSubmitted above.
  link: `/jobs/${job?._id}`,
  jobId: job?._id,
});

// `recipientRole` ('client' | 'freelancer') tells us which dashboard the
// recipient actually has — there's no single unified "/contract/:id" page,
// so the link must vary by which role is being notified.
const onContractDisputed = (userId, { contractId, actorName, reason, recipientRole }) => notify(userId, {
  type: TYPES.CONTRACT_DISPUTED,
  title: 'Contract Dispute Raised',
  message: `${actorName} has requested to cancel the contract. Reason: ${reason}. This contract is now under review.`,
  link: recipientRole === 'client' ? '/client/projects' : '/freelancer/work',
});

const onProjectCompleted = (freelancerId, { job }) => notify(freelancerId, {
  type: TYPES.PROJECT_COMPLETED,
  title: 'Project Completed! 🎉',
  message: `The client has accepted your delivery for "${job?.title}". Payment has been released!`,
  link: '/freelancer/work',
  jobId: job?._id,
});

// To the client: they didn't review a submitted milestone within the
// escrow_release_days window, so it was released to the freelancer automatically.
const onMilestoneAutoReleased = (clientId, { job, milestone }) => notify(clientId, {
  type: TYPES.MILESTONE_AUTO_RELEASED,
  title: 'Milestone auto-released ⏱️',
  message: `You didn't review "${milestone?.title || 'a milestone'}" on "${job?.title || 'a project'}" in time, so its escrow was automatically released to the freelancer.`,
  link: '/client/projects',
  jobId: job?._id,
});

const onContractStatusChanged = (userId, { contractId, status, recipientRole }) => notify(userId, {
  type: 'contract_status_changed',
  title: 'Contract Update',
  message: `The status of your contract has been updated to ${status}.`,
  link: recipientRole === 'client' ? '/client/projects' : '/freelancer/work',
});

// A policy violation (currently: sharing off-platform contact info in chat —
// see message.controller.js) that stops short of a block. Kept generic
// (just a message, no job/link) so it can cover other policy-warning cases
// later without a new helper per violation type.
const onSystemWarning = (userId, { message }) => notify(userId, {
  type: TYPES.SYSTEM_WARNING,
  title: 'Platform Warning',
  message,
});

// Admin dispute resolution (adminPanel/disputes.controller.js) — an admin
// action, so unlike every financial helper above (which reacts to something
// the OTHER party already did), both sides need telling here since neither
// went through their own flow. `amount` is the RECIPIENT'S OWN share — for
// `split` the two sides see different numbers, never the shared total.
const DISPUTE_RESOLUTION_COPY = {
  release_freelancer: {
    freelancer: (amount) => `Your dispute was resolved — PKR ${amount} was released to you from escrow.`,
    client: (amount) => `Your dispute was resolved: PKR ${amount} was released to the freelancer from escrow.`,
  },
  refund_client: {
    client: (amount) => `Your dispute was resolved — PKR ${amount} was refunded to your wallet.`,
    freelancer: () => 'Your dispute was resolved: the client was refunded from escrow.',
  },
  split: {
    freelancer: (amount) => `Your dispute was resolved with a split — PKR ${amount} was released to you from escrow.`,
    client: (amount) => `Your dispute was resolved with a split — PKR ${amount} was refunded to your wallet.`,
  },
};

const onDisputeResolved = (userId, { job, resolution, amount, recipientRole }) => notify(userId, {
  type: TYPES.DISPUTE_RESOLVED,
  title: 'Dispute Resolved',
  message: DISPUTE_RESOLUTION_COPY[resolution]?.[recipientRole]?.(amount)
    || `Your dispute over "${job?.title || 'a project'}" has been resolved.`,
  link: recipientRole === 'client' ? '/client/projects' : '/freelancer/work',
  jobId: job?._id,
});

// resume/reject — the dispute was reviewed and dismissed with no money
// movement; the underlying work/milestone just continues as before.
const onDisputeDismissed = (userId, { job, recipientRole }) => notify(userId, {
  type: TYPES.DISPUTE_DISMISSED,
  title: 'Dispute Reviewed',
  message: `The dispute over "${job?.title || 'a project'}" was reviewed and dismissed — work continues as normal.`,
  link: recipientRole === 'client' ? '/client/projects' : '/freelancer/work',
  jobId: job?._id,
});

module.exports = {
  TYPES,
  notify,
  onProposalReceived,
  onProposalAccepted,
  onProposalRejected,
  onProposalResubmitted,
  onGigOrdered,
  onDepositFunded,
  onWorkDelivered,
  onRevisionRequested,
  onPaymentReleased,
  onProjectCompleted,
  onNewMessage,
  onWithdrawalRequested,
  onWithdrawalCompleted,
  onEscrowRefunded,
  onReviewSubmitted,
  onJobCancelled,
  onContractDisputed,
  onContractStatusChanged,
  onMilestoneAutoReleased,
  onSystemWarning,
  onDisputeResolved,
  onDisputeDismissed,
};
