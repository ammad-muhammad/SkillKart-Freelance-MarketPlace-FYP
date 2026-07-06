const cron = require('node-cron');
const Contract = require('../models/Contract');
const TimeLog = require('../models/TimeLog');
const Payment = require('../models/Payment');

/**
 * Runs every Sunday at 23:59 (or customize schedule)
 * Aggregates all 'pending' time logs for active hourly contracts
 * and creates a weekly invoice (Payment record of type 'hourly_invoice').
 */
const generateWeeklyInvoices = async () => {
  console.log('[CRON] Generating weekly invoices for hourly contracts...');
  try {
    // 1. Get all active or in_revision hourly contracts
    const contracts = await Contract.find({
      type: 'hourly',
      status: { $in: ['active', 'in_revision'] }
    });

    for (const contract of contracts) {
      // 2. Find pending time logs
      const pendingLogs = await TimeLog.find({
        contractId: contract._id,
        status: 'pending'
      });

      if (pendingLogs.length === 0) continue;

      // Calculate total duration in ms
      const totalDurationMs = pendingLogs.reduce((sum, log) => sum + log.duration, 0);
      const totalHours = totalDurationMs / (1000 * 60 * 60);

      const amount = totalHours * contract.hourlyRate;
      
      // If there's barely any time, skip (e.g. less than 1 min)
      if (amount <= 0.01) continue;

      // Check if an invoice was already generated for this week?
      // Actually, since we mark the logs as 'billed' right after, we won't generate it twice.

      // 3. Create invoice (Payment)
      const invoice = await Payment.create({
        jobId: contract.jobId,
        contractId: contract._id,
        clientId: contract.clientId,
        freelancerId: contract.freelancerId,
        type: 'hourly_invoice',
        totalAmount: amount,
        depositAmount: 0, // No deposit for hourly
        finalAmount: amount, // The whole amount is due
        feeRate: 0.005, // 0.5% fee
        status: 'deposit_pending', // Actually, for invoice, 'deposit_pending' means 'unpaid'
      });

      // 4. Mark logs as billed
      await TimeLog.updateMany(
        { _id: { $in: pendingLogs.map(l => l._id) } },
        { $set: { status: 'billed', approvedBy: null /* System generated */ } }
      );

      console.log(`[CRON] Generated invoice for contract ${contract._id}, amount: ${amount}`);
    }
  } catch (error) {
    console.error('[CRON] Error generating weekly invoices:', error);
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
};

module.exports = {
  initCronJobs,
  generateWeeklyInvoices // exported for testing
};
