const cron = require('node-cron');
const Contract = require('../models/Contract');
const TimeLog = require('../models/TimeLog');
const Milestone = require('../models/Milestone');
const Job = require('../models/Job');
const { approveMilestone } = require('./milestone.service');
const { drawDownForTimeLog } = require('./hourlyEscrow.service');

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
};

module.exports = {
  initCronJobs,
  generateWeeklyInvoices, // exported for testing
  autoReleaseStaleMilestones // exported for testing
};
