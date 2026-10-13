const mongoose = require('mongoose');
const os = require('os');
const User = require('../../models/User');
const Job = require('../../models/Job');
const Contract = require('../../models/Contract');
const Payment = require('../../models/Payment');
const Withdrawal = require('../../models/Withdrawal');
const FreelancerProfile = require('../../models/FreelancerProfile');
const ClientProfile = require('../../models/ClientProfile');
const Message = require('../../models/Message');
const Report = require('../../models/Report');
const AdminAuditLog = require('../../models/AdminAuditLog');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const fiveMinAgo = () => new Date(Date.now() - 5 * 60 * 1000);

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /dashboard/stats
 * Full summary cards — cached-friendly, heavy aggregation
 */
const getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalFreelancers,
      totalClients,
      activeUsers,
      newUsersToday,
      totalJobs,
      activeJobs,
      closedJobs,
      activeContracts,
      pendingContracts,
      completedContracts,
      cancelledContracts,
      openDisputes,
      resolvedDisputes,
      totalPayments,
      pendingWithdrawals,
      completedWithdrawals,
      openReports,
      totalMessages,
      revenueAgg,
      escrowAgg,
      feesTodayAgg,
      freelancerWalletAgg,
      clientWalletAgg
    ] = await Promise.all([
      User.countDocuments({ deletedAt: null }),
      User.countDocuments({ role: 'freelancer', deletedAt: null }),
      User.countDocuments({ role: 'client', deletedAt: null }),
      User.countDocuments({ lastActive: { $gte: fiveMinAgo() }, deletedAt: null }),
      User.countDocuments({ createdAt: { $gte: todayStart() }, deletedAt: null }),
      Job.countDocuments(),
      Job.countDocuments({ status: { $in: ['open', 'in-progress'] } }),
      Job.countDocuments({ status: { $in: ['completed', 'closed', 'cancelled'] } }),
      Contract.countDocuments({ status: 'active' }),
      Contract.countDocuments({ status: { $in: ['pending', 'under_review'] } }),
      Contract.countDocuments({ status: 'completed' }),
      Contract.countDocuments({ status: 'cancelled' }),
      Contract.countDocuments({ 'dispute.status': 'pending' }),
      Contract.countDocuments({ 'dispute.status': 'resolved' }),
      Payment.countDocuments(),
      Withdrawal.countDocuments({ status: 'pending' }),
      Withdrawal.countDocuments({ status: 'completed' }),
      Report.countDocuments({ status: 'pending' }),
      Message.countDocuments(),
      Payment.aggregate([
        { $match: { status: 'released' } },
        { $group: { _id: null, total: { $sum: '$platformFee' } } }
      ]),
      Payment.aggregate([
        { $match: { status: { $in: ['deposit_paid', 'escrow_funded'] } } },
        { $group: { _id: null, total: { $sum: '$depositAmount' } } }
      ]),
      Payment.aggregate([
        { $match: { status: 'released', releasedAt: { $gte: todayStart() } } },
        { $group: { _id: null, total: { $sum: '$platformFee' } } }
      ]),
      FreelancerProfile.aggregate([
        { $group: { _id: null, total: { $sum: '$walletBalance' } } }
      ]),
      ClientProfile.aggregate([
        { $group: { _id: null, total: { $sum: '$walletBalance' } } }
      ])
    ]);

    const platformRevenue  = revenueAgg[0]?.total  || 0;
    const escrowBalance    = escrowAgg[0]?.total    || 0;
    const platformFeesToday = feesTodayAgg[0]?.total || 0;
    const totalWalletBalance = (freelancerWalletAgg[0]?.total || 0) + (clientWalletAgg[0]?.total || 0);

    return res.status(200).json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          freelancers: totalFreelancers,
          clients: totalClients,
          active: activeUsers,
          newToday: newUsersToday
        },
        jobs: {
          total: totalJobs,
          active: activeJobs,
          closed: closedJobs
        },
        contracts: {
          active: activeContracts,
          pending: pendingContracts,
          completed: completedContracts,
          cancelled: cancelledContracts
        },
        disputes: {
          open: openDisputes,
          resolved: resolvedDisputes
        },
        finance: {
          platformRevenue,
          escrowBalance,
          platformFeesToday,
          totalWalletBalance,
          totalPayments,
          pendingWithdrawals,
          completedWithdrawals
        },
        moderation: {
          openReports
        },
        communication: {
          totalMessages
        }
      }
    });
  } catch (err) {
    console.error('[Dashboard] getStats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load stats' });
  }
};

/**
 * GET /dashboard/today
 * Quick-overview widgets for "today" — fast polling endpoint
 */
const getTodayStats = async (req, res) => {
  try {
    const start = todayStart();

    const [
      newUsers,
      newJobs,
      newContracts,
      completedContracts,
      paymentsProcessed,
      withdrawalsRequested,
      newReports
    ] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: start }, deletedAt: null }),
      Job.countDocuments({ createdAt: { $gte: start } }),
      Contract.countDocuments({ createdAt: { $gte: start } }),
      Contract.countDocuments({ completedAt: { $gte: start } }),
      Payment.countDocuments({ updatedAt: { $gte: start }, status: 'released' }),
      Withdrawal.countDocuments({ createdAt: { $gte: start } }),
      Report.countDocuments({ createdAt: { $gte: start } })
    ]);

    return res.status(200).json({
      success: true,
      today: {
        date: start.toISOString().split('T')[0],
        newUsers,
        newJobs,
        newContracts,
        completedContracts,
        paymentsProcessed,
        withdrawalsRequested,
        newReports
      }
    });
  } catch (err) {
    console.error('[Dashboard] getTodayStats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load today stats' });
  }
};

/**
 * GET /dashboard/recent-activity
 * Last 50 admin audit log entries
 */
const getRecentActivity = async (req, res) => {
  try {
    const logs = await AdminAuditLog.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({ success: true, activity: logs });
  } catch (err) {
    console.error('[Dashboard] getRecentActivity error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load activity' });
  }
};

/**
 * GET /dashboard/growth?period=daily|weekly|monthly&dateFrom=&dateTo=
 * Growth data for charts
 */
const getGrowth = async (req, res) => {
  try {
    const { period = 'daily' } = req.query;

    const groupFormat = {
      daily:   { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      weekly:  { $dateToString: { format: '%Y-W%V', date: '$createdAt' } },
      monthly: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
    }[period] || { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };

    const daysBack = period === 'monthly' ? 365 : period === 'weekly' ? 90 : 30;
    const dateFrom = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    const [userGrowth, jobGrowth, contractGrowth, revenueGrowth] = await Promise.all([
      User.aggregate([
        { $match: { createdAt: { $gte: dateFrom }, deletedAt: null } },
        { $group: { _id: groupFormat, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Job.aggregate([
        { $match: { createdAt: { $gte: dateFrom } } },
        { $group: { _id: groupFormat, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Contract.aggregate([
        { $match: { createdAt: { $gte: dateFrom } } },
        { $group: { _id: groupFormat, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Payment.aggregate([
        { $match: { status: 'released', releasedAt: { $gte: dateFrom } } },
        { $group: { _id: { $dateToString: { format: period === 'monthly' ? '%Y-%m' : '%Y-%m-%d', date: '$releasedAt' } }, revenue: { $sum: '$platformFee' } } },
        { $sort: { _id: 1 } }
      ])
    ]);

    return res.status(200).json({
      success: true,
      period,
      growth: {
        users: userGrowth,
        jobs: jobGrowth,
        contracts: contractGrowth,
        revenue: revenueGrowth
      }
    });
  } catch (err) {
    console.error('[Dashboard] getGrowth error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load growth data' });
  }
};

/**
 * GET /dashboard/health
 * System health check
 */
const getHealth = async (req, res) => {
  try {
    const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const dbStatus = dbState[mongoose.connection.readyState] || 'unknown';

    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem  = os.freemem();

    return res.status(200).json({
      success: true,
      health: {
        status:         'ok',
        uptime:         Math.floor(process.uptime()),
        uptimeFormatted: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`,
        database: {
          status: dbStatus,
          healthy: dbStatus === 'connected'
        },
        memory: {
          heapUsedMB:  Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
          rssMAB:      Math.round(memUsage.rss / 1024 / 1024),
          systemTotalGB: (totalMem / 1024 / 1024 / 1024).toFixed(2),
          systemFreeGB:  (freeMem / 1024 / 1024 / 1024).toFixed(2)
        },
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('[Dashboard] getHealth error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load health' });
  }
};

module.exports = { getStats, getTodayStats, getRecentActivity, getGrowth, getHealth };
