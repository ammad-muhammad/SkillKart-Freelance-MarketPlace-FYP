const cron = require('node-cron');
const Contract = require('../models/Contract');
const TimeLog = require('../models/TimeLog');
const Milestone = require('../models/Milestone');
const Delivery = require('../models/Delivery');
const Job = require('../models/Job');
const CustomOffer = require('../models/CustomOffer');
const { approveMilestone } = require('./milestone.service');
const { drawDownForTimeLog } = require('./hourlyEscrow.service');
const { expireLapsedVerifications } = require('./verification.service');
const { processScheduledPublications } = require('./cms.service');

/**
 * Runs every Sunday at 23:59 (or customize schedule). Safety-net catch-up for
 * hourly contracts: time logging already tries to draw down against the
 * contract's locked escrow the moment it's logged (see
 * timeTracking.controller.js) — this just retries anything still 'pending'
 * (e.g. left over from a moment the lock was dry) in case the client has
 * since topped up, oldest first, stopping as soon as the lock runs dry again.
 */
const generateWeeklyInvoices = async () => {
  console.log('[CRON] Settling unbilled hourly time logs against escrow...');
  try {
    const contracts = await Contract.find({
      type: 'hourly',
      status: { $in: ['active', 'in_revision'] }
    });

    for (const contract of contracts) {
      const pendingLogs = await TimeLog.find({
        contractId: contract._id,
        status: 'pending'
      }).sort({ startTime: 1 });

      if (pendingLogs.length === 0) continue;

      const job = await Job.findById(contract.jobId);
      let billed = 0;
      for (const log of pendingLogs) {
        try {
          const { amount } = await drawDownForTimeLog({ timeLog: log, contract, job });
          billed += amount;
        } catch (err) {
          if (!err.errors?.insufficientBalance) {
            console.error(`[CRON] Unexpected error settling time log ${log._id} for contract ${contract._id}:`, err.message);
          }
          break; // escrow ran dry again — remaining logs stay pending
        }
      }

      if (billed > 0) {
        console.log(`[CRON] Billed Rs. ${billed} of previously-unbilled time for contract ${contract._id}.`);
      }
    }
  } catch (error) {
    console.error('[CRON] Error settling hourly time logs:', error);
  }
};

/**
 * Runs hourly. Freelancer-protection feature: if a client neither approves
 * nor requests revision on a submitted milestone within `escrow_release_days`
 * (SystemSettings, default 7), the escrow auto-releases to the freelancer —
 * so a client can't "ghost" after receiving finished work. Disputed
 * milestones are excluded (status is 'disputed', not 'submitted', by the
 * time a dispute is raised — see contract.controller.js's raiseDispute).
 */
const autoReleaseStaleMilestones = async () => {
  console.log('[CRON] Checking for milestones past their review deadline...');
  try {
    const stale = await Milestone.find({ status: 'submitted', reviewDeadline: { $lte: new Date() } });
    if (stale.length === 0) return;

    for (const milestone of stale) {
      try {
        const contract = await Contract.findById(milestone.contractId);
        const job = await Job.findById(milestone.jobId);
        if (!contract || !job) continue;

        const { isLastMilestone, freelancerPayout } = await approveMilestone({ milestone, contract, job, auto: true });
        // Keep the Delivery record in sync — otherwise it's left forever
        // 'pending_review' with no way to action it, and a later stale
        // action on it would resolve to whatever milestone the contract has
        // since moved on to instead of this one.
        await Delivery.updateOne(
          { milestoneId: milestone._id, status: 'pending_review' },
          { $set: { status: 'accepted', reviewedAt: new Date() } }
        );
        console.log(`[CRON] Auto-released milestone ${milestone._id} (order ${milestone.order}${isLastMilestone ? ', final' : ''}) — Rs. ${freelancerPayout} to freelancer.`);
      } catch (err) {
        // One bad milestone must not stop the rest of the batch from processing.
        console.error(`[CRON] Failed to auto-release milestone ${milestone._id}:`, err.message);
      }
    }
  } catch (error) {
    console.error('[CRON] Error checking for stale milestones:', error);
  }
};

/**
 * Housekeeping for gig orders + custom offers:
 * - an unpaid ('pending_payment') gig order older than UNPAID_ORDER_TTL_DAYS
 *   is cancelled — a Stripe checkout session only lives 24h, so nothing can
 *   still complete it by then, and it would otherwise sit in the client's
 *   list forever;
 * - a pending custom offer past its expiresAt is marked 'expired' (reads
 *   already treat it as expired; this just makes the stored status agree).
 */
const UNPAID_ORDER_TTL_DAYS = 7;
const cleanupStaleOrdersAndOffers = async () => {
  try {
    const cutoff = new Date(Date.now() - UNPAID_ORDER_TTL_DAYS * 24 * 60 * 60 * 1000);
    const orders = await Job.updateMany(
      { source: 'gig', status: 'pending_payment', createdAt: { $lte: cutoff } },
      { $set: { status: 'cancelled', cancelledBeforePayment: true } }
    );
    const offers = await CustomOffer.updateMany(
      { status: 'pending', expiresAt: { $lte: new Date() } },
      { $set: { status: 'expired' } }
    );
    if (orders.modifiedCount || offers.modifiedCount) {
      console.log(`[CRON] Cancelled ${orders.modifiedCount} stale unpaid gig order(s), expired ${offers.modifiedCount} custom offer(s).`);
    }
  } catch (error) {
    console.error('[CRON] Error cleaning up stale gig orders/offers:', error);
  }
};

/**
 * Runs daily. A skill verification is valid for six months; this flips lapsed
 * ones back to unverified (and notifies the freelancer) so the profile badge,
 * the public profile, search ordering and matchmaking stop treating them as
 * tested. The skill gate itself checks the date in real time and never
 * depended on this job.
 */
const expireSkillVerifications = async () => {
  try {
    const count = await expireLapsedVerifications();
    if (count > 0) {
      console.log(`[CRON] Expired lapsed skill verifications for ${count} freelancer(s).`);
    }
  } catch (error) {
    console.error('[CRON] Error expiring skill verifications:', error);
  }
};

/**
 * Runs hourly. CMS pages scheduled for a future time were recorded as
 * `scheduled` but nothing ever published them; this goes live with every page
 * whose `scheduledPublishAt` has passed.
 */
const publishScheduledCmsPages = async () => {
  try {
    const published = await processScheduledPublications();
    if (published.length > 0) {
      console.log(`[CRON] Published ${published.length} scheduled CMS page(s): ${published.join(', ')}`);
    }
  } catch (error) {
    console.error('[CRON] Error publishing scheduled CMS pages:', error);
  }
};

/**
 * Initialize cron jobs
 */
const initCronJobs = () => {
  // Run every Sunday at 23:59
  cron.schedule('59 23 * * 0', () => {
    generateWeeklyInvoices();
  });
  console.log('[CRON] Weekly billing cron job scheduled.');

  // Run every hour, on the hour
  cron.schedule('0 * * * *', () => {
    autoReleaseStaleMilestones();
  });
  console.log('[CRON] Milestone auto-release cron job scheduled.');

  // Every hour at :30 (offset from the milestone job above)
  cron.schedule('30 * * * *', () => {
    cleanupStaleOrdersAndOffers();
  });
  console.log('[CRON] Unpaid gig order / expired offer cleanup scheduled.');

  // Every day at 02:15 — flip lapsed skill verifications back to unverified
  cron.schedule('15 2 * * *', () => {
    expireSkillVerifications();
  });
  console.log('[CRON] Skill verification expiry scheduled.');

  // Every hour at :45 — go live with CMS pages whose scheduled time has passed
  cron.schedule('45 * * * *', () => {
    publishScheduledCmsPages();
  });
  console.log('[CRON] Scheduled CMS publication scheduled.');
};

module.exports = {
  initCronJobs,
  generateWeeklyInvoices, // exported for testing
  autoReleaseStaleMilestones, // exported for testing
  cleanupStaleOrdersAndOffers, // exported for testing
  expireSkillVerifications, // exported for testing
  publishScheduledCmsPages // exported for testing
};
