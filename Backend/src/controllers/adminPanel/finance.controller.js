const Payment = require('../../models/Payment');
const FreelancerProfile = require('../../models/FreelancerProfile');
const ClientProfile = require('../../models/ClientProfile');
const Withdrawal = require('../../models/Withdrawal');
const { auditLog } = require('../../utils/adminAudit');
const { exportToCSV, exportToExcel, exportToPDF, sendExportResponse } = require('../../utils/exportHelper');
const { PLATFORM_FEE_RATE, round2 } = require('../../utils/constants');
const { parsePagination } = require('../../utils/helpers');

const PAYMENT_COLUMNS = [
  { key: '_id', label: 'ID' },
  { key: 'status', label: 'Status' },
  { key: 'totalAmount', label: 'Total' },
  { key: 'platformFee', label: 'Platform Fee' },
  { key: 'currency', label: 'Currency' },
  { key: 'createdAt', label: 'Created' }
];

// ─── Payments ─────────────────────────────────────────────────────────────────

const getPayments = async (req, res) => {
  try {
    const { status, clientId, freelancerId, amountMin, amountMax, dateFrom, dateTo } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (status) filter.status = status;
    if (clientId) filter.clientId = clientId;
    if (freelancerId) filter.freelancerId = freelancerId;
    if (dateFrom || dateTo) { filter.createdAt = {}; if (dateFrom) filter.createdAt.$gte = new Date(dateFrom); if (dateTo) filter.createdAt.$lte = new Date(dateTo); }
    if (amountMin || amountMax) { filter.totalAmount = {}; if (amountMin) filter.totalAmount.$gte = parseFloat(amountMin); if (amountMax) filter.totalAmount.$lte = parseFloat(amountMax); }

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate('clientId', 'email firstName lastName')
        .populate('freelancerId', 'email firstName lastName')
        .populate('contractId', 'type status')
        .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Payment.countDocuments(filter)
    ]);

    return res.status(200).json({ success: true, payments, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load payments' });
  }
};

const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('clientId', 'email firstName lastName')
      .populate('freelancerId', 'email firstName lastName')
      .populate('contractId', 'type status startedAt completedAt')
      .populate('jobId', 'title')
      .lean();
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    return res.status(200).json({ success: true, payment });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load payment' });
  }
};

const getPaymentSummary = async (req, res) => {
  try {
    const [revenue, escrow, refunded] = await Promise.all([
      Payment.aggregate([{ $match: { status: 'released' } }, { $group: { _id: null, total: { $sum: '$platformFee' }, count: { $sum: 1 } } }]),
      Payment.aggregate([{ $match: { status: { $in: ['deposit_paid'] } } }, { $group: { _id: null, total: { $sum: '$depositAmount' }, count: { $sum: 1 } } }]),
      Payment.aggregate([{ $match: { status: 'refunded' } }, { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }])
    ]);

    return res.status(200).json({
      success: true,
      summary: {
        platformRevenue: revenue[0]?.total || 0,
        paymentsReleased: revenue[0]?.count || 0,
        escrowHeld: escrow[0]?.total || 0,
        escrowPayments: escrow[0]?.count || 0,
        totalRefunded: refunded[0]?.total || 0,
        refundCount: refunded[0]?.count || 0
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load summary' });
  }
};

const exportPayments = async (req, res) => {
  try {
    const { format = 'csv' } = req.query;
    const payments = await Payment.find().sort({ createdAt: -1 }).lean();
    const buf = format === 'excel' ? await exportToExcel(payments, PAYMENT_COLUMNS, 'Payments')
              : format === 'pdf'   ? await exportToPDF(payments, PAYMENT_COLUMNS, 'Payments Export')
              : exportToCSV(payments, PAYMENT_COLUMNS);
    auditLog(req, { action: `export.${format}`, category: 'export', resource: 'Payment', notes: `${payments.length} payments` });
    sendExportResponse(res, buf, format, 'payments');
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Export failed' });
  }
};

/**
 * POST /payments/:id/refund — refund escrow to the client (internal ledger).
 * Marks the Payment refunded and credits the client's walletBalance. No live
 * Stripe call — matches how the simulated escrow already works. Audit-logged.
 * Financial history (the Payment doc) is preserved, not deleted.
 */
const refundPayment = async (req, res) => {
  try {
    const { reason } = req.body;
    const existing = await Payment.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (existing.status === 'refunded') return res.status(400).json({ success: false, message: 'Payment already refunded' });
    if (existing.status === 'released') return res.status(400).json({ success: false, message: 'Cannot refund a released payment' });

    const refundAmount = round2(existing.depositAmount || existing.totalAmount);
    const prev = existing.status;

    // Atomic transition — only the request that actually flips the status out of
    // its current state proceeds to credit the wallet. A concurrent second call
    // matches nothing here and is rejected, preventing a double refund.
    const payment = await Payment.findOneAndUpdate(
      { _id: req.params.id, status: { $nin: ['refunded', 'released'] } },
      { $set: { status: 'refunded' } },
      { new: true }
    );
    if (!payment) return res.status(409).json({ success: false, message: 'Payment already processed by another request' });

    await ClientProfile.updateOne(
      { userId: payment.clientId },
      { $inc: { walletBalance: refundAmount } }
    );

    // Cancel the linked contract if any
    if (payment.contractId) {
      const Contract = require('../../models/Contract');
      await Contract.updateOne({ _id: payment.contractId }, { status: 'cancelled' });
    }

    auditLog(req, {
      action: 'payment.refund', category: 'payment', resource: 'Payment',
      resourceId: payment._id, previousValue: { status: prev },
      newValue: { status: 'refunded', refundedToClient: refundAmount }, notes: reason, severity: 'critical'
    });
    return res.status(200).json({ success: true, message: 'Payment refunded to client wallet', refundAmount });
  } catch (err) {
    console.error('[Finance] refund error:', err);
    return res.status(500).json({ success: false, message: 'Failed to refund payment' });
  }
};

/**
 * POST /payments/:id/release — release escrow to the freelancer (internal ledger).
 * Computes the platform fee, credits the freelancer's wallet, marks released.
 */
const releaseEscrow = async (req, res) => {
  try {
    const { reason } = req.body;
    const existing = await Payment.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (existing.status === 'released') return res.status(400).json({ success: false, message: 'Payment already released' });
    if (existing.status === 'refunded') return res.status(400).json({ success: false, message: 'Cannot release a refunded payment' });
    if (!existing.freelancerId) return res.status(400).json({ success: false, message: 'No freelancer on this payment' });

    const fee = round2(existing.totalAmount * (existing.feeRate || PLATFORM_FEE_RATE));
    const payout = round2(existing.totalAmount - fee);
    const prev = existing.status;

    // Atomic transition (see refundPayment) — guards against a concurrent
    // double-release crediting the freelancer twice.
    const payment = await Payment.findOneAndUpdate(
      { _id: req.params.id, status: { $nin: ['released', 'refunded'] } },
      { $set: { status: 'released', platformFee: fee, freelancerPayout: payout, releasedAt: new Date() } },
      { new: true }
    );
    if (!payment) return res.status(409).json({ success: false, message: 'Payment already processed by another request' });

    await FreelancerProfile.updateOne(
      { userId: payment.freelancerId },
      { $inc: { walletBalance: payout, totalEarnings: payout } }
    );

    auditLog(req, {
      action: 'payment.release', category: 'payment', resource: 'Payment',
      resourceId: payment._id, previousValue: { status: prev },
      newValue: { status: 'released', payout, fee }, notes: reason, severity: 'critical'
    });
    return res.status(200).json({ success: true, message: 'Escrow released to freelancer', payout, fee });
  } catch (err) {
    console.error('[Finance] release error:', err);
    return res.status(500).json({ success: false, message: 'Failed to release escrow' });
  }
};

// ─── Wallets ──────────────────────────────────────────────────────────────────

const getWallets = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const halfLimit = Math.max(1, Math.floor(limit / 2));

    const [freelancers, clients, totalF, totalC] = await Promise.all([
      FreelancerProfile.find({ walletBalance: { $gt: 0 } })
        .populate('userId', 'email firstName lastName')
        .select('userId walletBalance totalEarnings isFrozenWallet walletFrozenAt')
        .skip(skip).limit(halfLimit).lean(),
      ClientProfile.find({ walletBalance: { $gt: 0 } })
        .populate('userId', 'email firstName lastName')
        .select('userId walletBalance totalSpent isFrozenWallet walletFrozenAt')
        .skip(skip).limit(halfLimit).lean(),
      FreelancerProfile.countDocuments({ walletBalance: { $gt: 0 } }),
      ClientProfile.countDocuments({ walletBalance: { $gt: 0 } })
    ]);

    const wallets = [
      ...freelancers.map(f => ({ ...f, userType: 'freelancer' })),
      ...clients.map(c => ({ ...c, userType: 'client' }))
    ];

    return res.status(200).json({ success: true, wallets, total: totalF + totalC });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load wallets' });
  }
};

const getWalletByUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const [fp, cp] = await Promise.all([
      FreelancerProfile.findOne({ userId }).lean(),
      ClientProfile.findOne({ userId }).lean()
    ]);
    const wallet = fp || cp;
    if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });
    return res.status(200).json({ success: true, wallet, type: fp ? 'freelancer' : 'client' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load wallet' });
  }
};

const adjustWallet = async (req, res) => {
  try {
    const { amount, reason, notes } = req.body;
    const userId = req.params.userId;

    let profile = await FreelancerProfile.findOne({ userId });
    let profileType = 'freelancer';
    if (!profile) { profile = await ClientProfile.findOne({ userId }); profileType = 'client'; }
    if (!profile) return res.status(404).json({ success: false, message: 'Wallet not found' });

    const prev = profile.walletBalance;
    profile.walletBalance = Math.max(0, profile.walletBalance + parseFloat(amount));
    await profile.save();

    auditLog(req, {
      action: 'wallet.adjusted',
      category: 'wallet',
      resource: profileType === 'freelancer' ? 'FreelancerProfile' : 'ClientProfile',
      resourceId: profile._id,
      previousValue: { walletBalance: prev },
      newValue: { walletBalance: profile.walletBalance, adjustment: amount, reason },
      notes,
      severity: 'critical'
    });

    return res.status(200).json({ success: true, message: 'Wallet adjusted', newBalance: profile.walletBalance });
  } catch (err) {
    console.error('[Wallet] adjust error:', err);
    return res.status(500).json({ success: false, message: 'Failed to adjust wallet' });
  }
};

const freezeWallet = async (req, res) => {
  try {
    const { reason } = req.body;
    const userId = req.params.userId;

    let profile = await FreelancerProfile.findOne({ userId });
    if (!profile) profile = await ClientProfile.findOne({ userId });
    if (!profile) return res.status(404).json({ success: false, message: 'Wallet not found' });

    profile.isFrozenWallet    = true;
    profile.walletFrozenBy    = req.admin.email;
    profile.walletFrozenAt    = new Date();
    profile.walletFrozenReason = reason;
    await profile.save();

    auditLog(req, { action: 'wallet.frozen', category: 'wallet', resource: 'Profile', resourceId: profile._id, newValue: { reason }, severity: 'warning' });
    return res.status(200).json({ success: true, message: 'Wallet frozen' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to freeze wallet' });
  }
};

const unfreezeWallet = async (req, res) => {
  try {
    const userId = req.params.userId;
    let profile = await FreelancerProfile.findOne({ userId });
    if (!profile) profile = await ClientProfile.findOne({ userId });
    if (!profile) return res.status(404).json({ success: false, message: 'Wallet not found' });

    profile.isFrozenWallet    = false;
    profile.walletFrozenBy    = null;
    profile.walletFrozenAt    = null;
    profile.walletFrozenReason = null;
    await profile.save();

    auditLog(req, { action: 'wallet.unfrozen', category: 'wallet', resource: 'Profile', resourceId: profile._id, severity: 'info' });
    return res.status(200).json({ success: true, message: 'Wallet unfrozen' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to unfreeze wallet' });
  }
};

// ─── Withdrawals ──────────────────────────────────────────────────────────────

const WITHDRAWAL_COLUMNS = [
  { key: '_id', label: 'ID' },
  { key: 'status', label: 'Status' },
  { key: 'amount', label: 'Amount' },
  { key: 'method', label: 'Method' },
  { key: 'createdAt', label: 'Requested' }
];

const getWithdrawals = async (req, res) => {
  try {
    const { status, method } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (status) filter.status = status;
    if (method) filter.method = method;

    const [withdrawals, total] = await Promise.all([
      Withdrawal.find(filter)
        .populate('userId', 'email firstName lastName')
        .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Withdrawal.countDocuments(filter)
    ]);

    return res.status(200).json({ success: true, withdrawals, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load withdrawals' });
  }
};

const updateWithdrawalStatus = (newStatus) => async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) return res.status(404).json({ success: false, message: 'Withdrawal not found' });

    const prev = withdrawal.status;
    withdrawal.status = newStatus;
    if (req.body.reason) withdrawal.notes = req.body.reason;
    if (req.body.referenceId) withdrawal.referenceId = req.body.referenceId;
    await withdrawal.save();

    auditLog(req, {
      action: `withdrawal.${newStatus}`,
      category: 'withdrawal',
      resource: 'Withdrawal',
      resourceId: withdrawal._id,
      previousValue: { status: prev },
      newValue: { status: newStatus },
      severity: newStatus === 'completed' ? 'info' : 'warning'
    });

    return res.status(200).json({ success: true, message: `Withdrawal ${newStatus}`, withdrawal });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Failed to ${newStatus} withdrawal` });
  }
};

const approveWithdrawal   = updateWithdrawalStatus('completed');
const rejectWithdrawal    = updateWithdrawalStatus('cancelled');
const processingWithdrawal = updateWithdrawalStatus('pending'); // back to pending for manual processing
const completeWithdrawal  = updateWithdrawalStatus('completed');

const exportWithdrawals = async (req, res) => {
  try {
    const { format = 'csv' } = req.query;
    const data = await Withdrawal.find().sort({ createdAt: -1 }).lean();
    const buf = format === 'excel' ? await exportToExcel(data, WITHDRAWAL_COLUMNS, 'Withdrawals')
              : format === 'pdf'   ? await exportToPDF(data, WITHDRAWAL_COLUMNS, 'Withdrawals Export')
              : exportToCSV(data, WITHDRAWAL_COLUMNS);
    auditLog(req, { action: `export.${format}`, category: 'export', resource: 'Withdrawal', notes: `${data.length} withdrawals` });
    sendExportResponse(res, buf, format, 'withdrawals');
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Export failed' });
  }
};

// ─── Transactions (Unified) ───────────────────────────────────────────────────

const TRANSACTION_COLUMNS = [
  { key: 'type', label: 'Type' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
  { key: 'currency', label: 'Currency' },
  { key: 'createdAt', label: 'Date' }
];

const getTransactions = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const halfLimit = Math.max(1, Math.floor(limit / 2));

    const [payments, withdrawals, paymentCount, withdrawalCount] = await Promise.all([
      Payment.find()
        .populate('clientId', 'email firstName lastName')
        .populate('freelancerId', 'email firstName lastName')
        .sort({ createdAt: -1 }).skip(skip).limit(halfLimit).lean(),
      Withdrawal.find()
        .populate('userId', 'email firstName lastName')
        .sort({ createdAt: -1 }).skip(skip).limit(halfLimit).lean(),
      Payment.countDocuments(),
      Withdrawal.countDocuments()
    ]);
    const total = paymentCount + withdrawalCount;

    const transactions = [
      ...payments.map(p => ({ ...p, transactionType: 'payment' })),
      ...withdrawals.map(w => ({ ...w, transactionType: 'withdrawal', amount: w.amount, currency: 'PKR' }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({
      success: true, transactions,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load transactions' });
  }
};

const exportTransactions = async (req, res) => {
  try {
    const { format = 'csv' } = req.query;
    const [payments, withdrawals] = await Promise.all([
      Payment.find().sort({ createdAt: -1 }).lean(),
      Withdrawal.find().sort({ createdAt: -1 }).lean()
    ]);

    const data = [
      ...payments.map(p => ({ type: 'Payment', amount: p.totalAmount, status: p.status, currency: p.currency, createdAt: p.createdAt })),
      ...withdrawals.map(w => ({ type: 'Withdrawal', amount: w.amount, status: w.status, currency: 'PKR', createdAt: w.createdAt }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const buf = format === 'excel' ? await exportToExcel(data, TRANSACTION_COLUMNS, 'Transactions')
              : format === 'pdf'   ? await exportToPDF(data, TRANSACTION_COLUMNS, 'Transactions Export')
              : exportToCSV(data, TRANSACTION_COLUMNS);
    auditLog(req, { action: `export.${format}`, category: 'export', resource: 'Transaction', notes: `${data.length} transactions` });
    sendExportResponse(res, buf, format, 'transactions');
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Export failed' });
  }
};

module.exports = {
  // Payments
  getPayments, getPaymentById, getPaymentSummary, exportPayments,
  refundPayment, releaseEscrow,
  // Wallets
  getWallets, getWalletByUser, adjustWallet, freezeWallet, unfreezeWallet,
  // Withdrawals
  getWithdrawals, approveWithdrawal, rejectWithdrawal, processingWithdrawal, completeWithdrawal, exportWithdrawals,
  // Transactions
  getTransactions, exportTransactions
};
