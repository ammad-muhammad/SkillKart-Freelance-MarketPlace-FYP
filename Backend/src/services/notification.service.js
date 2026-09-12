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
  WITHDRAWAL_REQUESTED: 'withdrawal_requested',
  WITHDRAWAL_COMPLETED: 'withdrawal_completed',
  ESCROW_REFUNDED: 'escrow_refunded',
  REVIEW_SUBMITTED: 'review_submitted',
  JOB_CANCELLED: 'job_cancelled',
  CONTRACT_DISPUTED: 'contract_disputed',
  MILESTONE_AUTO_RELEASED: 'milestone_auto_released',
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
  link: '/profile',
  jobId: job?._id,
});

const onJobCancelled = (userId, { job }) => notify(userId, {
  type: TYPES.JOB_CANCELLED,
  title: 'Project Cancelled',
  message: `The project "${job?.title}" has been cancelled.`,
  link: '/messages',
  jobId: job?._id,
});

const onContractDisputed = (userId, { contractId, actorName, reason }) => notify(userId, {
  type: TYPES.CONTRACT_DISPUTED,
  title: 'Contract Dispute Raised',
  message: `${actorName} has requested to cancel the contract. Reason: ${reason}. This contract is now under review.`,
  link: `/contract/${contractId}`,
});

const onProjectCompleted = (freelancerId, { job }) => notify(freelancerId, {
  type: TYPES.PROJECT_COMPLETED,
  title: 'Project Completed! 🎉',
  message: `The client has accepted your delivery for "${job?.title}". Payment has been released!`,
  link: `/freelancer/projects/${job?._id}`,
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

const onContractStatusChanged = (userId, { contractId, status }) => notify(userId, {
  type: 'contract_status_changed',
  title: 'Contract Update',
  message: `The status of your contract has been updated to ${status}.`,
  link: `/contract/${contractId}`,
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
};
