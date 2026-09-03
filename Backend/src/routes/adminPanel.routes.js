const express = require('express');
const router = express.Router();

// ─── Middleware ────────────────────────────────────────────────────────────────
const { authenticateAdmin, requirePermission } = require('../middleware/adminAuth.middleware');
const { adminLoginLimiter, adminOtpLimiter, adminApiLimiter } = require('../middleware/adminRateLimit.middleware');
const {
  loginSchema, verifyOtpSchema, suspendSchema,
  adjustWalletSchema, freezeWalletSchema,
  resolveDisputeSchema, broadcastSchema,
  updateSettingSchema, resolveReportSchema,
  dismissReportSchema, hideReviewSchema,
  rejectWithdrawalSchema, paginationSchema
} = require('../middleware/adminValidator.middleware');

// ─── Controllers ──────────────────────────────────────────────────────────────
const authCtrl        = require('../controllers/adminPanel/auth.controller');
const dashCtrl        = require('../controllers/adminPanel/dashboard.controller');
const searchCtrl      = require('../controllers/adminPanel/search.controller');
const usersCtrl       = require('../controllers/adminPanel/users.controller');
const jobsCtrl        = require('../controllers/adminPanel/jobs.controller');
const contractsCtrl   = require('../controllers/adminPanel/contracts.controller');
const disputesCtrl    = require('../controllers/adminPanel/disputes.controller');
const financeCtrl     = require('../controllers/adminPanel/finance.controller');
const modCtrl         = require('../controllers/adminPanel/moderation.controller');

// ─────────────────────────────────────────────────────────────────────────────
// AUTH  (no authenticateAdmin — public)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/auth/login',      adminLoginLimiter, loginSchema,     authCtrl.login);
router.post('/auth/verify-otp', adminOtpLimiter,  verifyOtpSchema, authCtrl.verifyOtp);

// ─── Protected routes ─────────────────────────────────────────────────────────
// All routes below require a valid admin_token cookie
router.use(authenticateAdmin);
router.use(adminApiLimiter);

// AUTH (authenticated)
router.post  ('/auth/logout',                  authCtrl.logout);
router.get   ('/auth/session',                 authCtrl.getSession);
router.get   ('/auth/sessions',                authCtrl.getSessionHistory);
router.post  ('/auth/force-logout/:sessionId', authCtrl.forceLogout);

// DASHBOARD
router.get('/dashboard/stats',           dashCtrl.getStats);
router.get('/dashboard/today',           dashCtrl.getTodayStats);
router.get('/dashboard/recent-activity', dashCtrl.getRecentActivity);
router.get('/dashboard/growth',          dashCtrl.getGrowth);
router.get('/dashboard/health',          dashCtrl.getHealth);

// GLOBAL SEARCH
router.get('/search', searchCtrl.globalSearch);

// USERS  (single route for all, filter by role=freelancer|client|all)
router.get   ('/users',                       paginationSchema, usersCtrl.getUsers);
router.get   ('/users/export',                usersCtrl.exportUsers);
router.get   ('/users/:id',                   usersCtrl.getUserById);
router.patch ('/users/:id',                   requirePermission('users.write'), usersCtrl.editUser);
router.patch ('/users/:id/suspend',           suspendSchema, requirePermission('users.write'), usersCtrl.suspendUser);
router.patch ('/users/:id/unsuspend',         requirePermission('users.write'), usersCtrl.unsuspendUser);
router.delete('/users/:id',                   requirePermission('users.write'), usersCtrl.deleteUser);
// Full profile management + direct verification grants
router.get   ('/users/:id/profile',           usersCtrl.getUserProfile);
router.patch ('/users/:id/profile',           requirePermission('users.write'), usersCtrl.updateProfile);
router.patch ('/users/:id/avatar',            requirePermission('users.write'), usersCtrl.updateAvatar);
router.patch ('/users/:id/verify-email',      requirePermission('users.write'), usersCtrl.setEmailVerified);
router.patch ('/users/:id/skills/verify',     requirePermission('users.write'), usersCtrl.setSkillVerification);
router.patch ('/users/:id/verification',      requirePermission('users.write'), usersCtrl.setVerification);
router.get   ('/users/:id/contracts',         usersCtrl.getUserContracts);
router.get   ('/users/:id/jobs',              usersCtrl.getUserJobs);
router.get   ('/users/:id/payments',          usersCtrl.getUserPayments);
router.get   ('/users/:id/wallet',            usersCtrl.getUserWallet);
router.get   ('/users/:id/disputes',          usersCtrl.getUserDisputes);
router.get   ('/users/:id/reports',           usersCtrl.getUserReports);
router.get   ('/users/:id/activity',          usersCtrl.getUserActivity);

// JOBS
router.get   ('/jobs',              paginationSchema, jobsCtrl.getJobs);
router.get   ('/jobs/export',       jobsCtrl.exportJobs);
router.get   ('/jobs/:id',          jobsCtrl.getJobById);
router.patch ('/jobs/:id',          requirePermission('jobs.write'), jobsCtrl.editJob);
router.patch ('/jobs/:id/close',    requirePermission('jobs.write'), jobsCtrl.closeJob);
router.patch ('/jobs/:id/reopen',   requirePermission('jobs.write'), jobsCtrl.reopenJob);
router.delete('/jobs/:id',          requirePermission('jobs.write'), jobsCtrl.deleteJob);

// CONTRACTS
router.get  ('/contracts',                     paginationSchema, contractsCtrl.getContracts);
router.get  ('/contracts/export',              contractsCtrl.exportContracts);
router.get  ('/contracts/:id',                 contractsCtrl.getContractById);
router.post ('/contracts/:id/notes',           contractsCtrl.addContractNote);
router.patch('/contracts/:id',                 requirePermission('contracts.write'), contractsCtrl.editContract);
router.patch('/contracts/:id/pause',           requirePermission('contracts.write'), contractsCtrl.pauseContract);
router.patch('/contracts/:id/resume',          requirePermission('contracts.write'), contractsCtrl.resumeContract);
router.patch('/contracts/:id/cancel',          requirePermission('contracts.write'), contractsCtrl.cancelContract);
router.post ('/contracts/:id/force-complete',  requirePermission('contracts.write'), contractsCtrl.forceComplete);
router.post ('/contracts/:id/reassign',        requirePermission('contracts.write'), contractsCtrl.reassignContract);

// DISPUTES (sub-resource of contracts)
router.get  ('/disputes',                             paginationSchema, disputesCtrl.getDisputes);
router.get  ('/disputes/:contractId',                 disputesCtrl.getDisputeById);
router.post ('/disputes/:contractId/resolve',         resolveDisputeSchema, requirePermission('disputes.resolve'), disputesCtrl.resolveDispute);

// PAYMENTS
router.get('/payments',            paginationSchema, financeCtrl.getPayments);
router.get('/payments/summary',    financeCtrl.getPaymentSummary);
router.get('/payments/export',     financeCtrl.exportPayments);
router.get('/payments/:id',        financeCtrl.getPaymentById);
router.post('/payments/:id/refund',  requirePermission('wallets.write'), financeCtrl.refundPayment);
router.post('/payments/:id/release', requirePermission('wallets.write'), financeCtrl.releaseEscrow);

// WALLETS
router.get   ('/wallets',                    financeCtrl.getWallets);
router.get   ('/wallets/:userId',            financeCtrl.getWalletByUser);
router.patch ('/wallets/:userId/adjust',     adjustWalletSchema,  requirePermission('wallets.write'), financeCtrl.adjustWallet);
router.patch ('/wallets/:userId/freeze',     freezeWalletSchema,  requirePermission('wallets.write'), financeCtrl.freezeWallet);
router.patch ('/wallets/:userId/unfreeze',   requirePermission('wallets.write'), financeCtrl.unfreezeWallet);

// WITHDRAWALS
router.get  ('/withdrawals',           paginationSchema, financeCtrl.getWithdrawals);
router.get  ('/withdrawals/export',    financeCtrl.exportWithdrawals);
router.patch('/withdrawals/:id/approve',    requirePermission('withdrawals.write'), financeCtrl.approveWithdrawal);
router.patch('/withdrawals/:id/reject',     rejectWithdrawalSchema, requirePermission('withdrawals.write'), financeCtrl.rejectWithdrawal);
router.patch('/withdrawals/:id/complete',   requirePermission('withdrawals.write'), financeCtrl.completeWithdrawal);

// TRANSACTIONS
router.get('/transactions',        financeCtrl.getTransactions);
router.get('/transactions/export', financeCtrl.exportTransactions);

// CHAT MODERATION + admin↔user messaging (as "SkillKart Support")
router.get ('/chat',                            paginationSchema, modCtrl.getConversations);
router.post('/chat/send',                       modCtrl.sendAdminMessage);
router.get ('/chat/:conversationId/messages',   modCtrl.getConversationMessages);
router.post('/chat/:conversationId/reply',      modCtrl.replyAsAdmin);

// REVIEWS
router.get   ('/reviews',             paginationSchema, modCtrl.getReviews);
router.patch ('/reviews/:id/hide',    hideReviewSchema, requirePermission('reviews.write'), modCtrl.hideReview);
router.patch ('/reviews/:id/restore', requirePermission('reviews.write'), modCtrl.restoreReview);
router.delete('/reviews/:id',         requirePermission('reviews.write'), modCtrl.deleteReview);

// NOTIFICATIONS
router.post('/notifications/broadcast', broadcastSchema, requirePermission('notifications.write'), modCtrl.broadcastNotification);

// REPORTS
router.get  ('/reports',              paginationSchema, modCtrl.getReports);
router.get  ('/reports/:id',          modCtrl.getReportById);
router.patch('/reports/:id/assign',   modCtrl.assignReport);
router.patch('/reports/:id/resolve',  resolveReportSchema, requirePermission('reports.write'), modCtrl.resolveReport);
router.patch('/reports/:id/dismiss',  dismissReportSchema, requirePermission('reports.write'), modCtrl.dismissReport);

// MONITORING
router.get  ('/monitoring/system',        paginationSchema, modCtrl.getSystemLogs);
router.get  ('/monitoring/email',         paginationSchema, modCtrl.getEmailLogs);
router.get  ('/monitoring/api',           paginationSchema, modCtrl.getApiLogs);
router.get  ('/monitoring/errors',        paginationSchema, modCtrl.getErrorLogs);
router.patch('/monitoring/errors/:id/resolve', modCtrl.markErrorResolved);

// AUDIT LOGS (immutable — read only)
router.get('/audit-logs', paginationSchema, modCtrl.getAuditLogs);

// ANALYTICS
router.get('/analytics', modCtrl.getAnalytics);

// SETTINGS
router.get  ('/settings',        modCtrl.getSettings);
router.patch('/settings/:key',   updateSettingSchema, requirePermission('settings.write'), modCtrl.updateSetting);

module.exports = router;
