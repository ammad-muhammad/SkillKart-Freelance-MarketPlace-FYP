const User = require('../../models/User');
const FreelancerProfile = require('../../models/FreelancerProfile');
const ClientProfile = require('../../models/ClientProfile');
const Contract = require('../../models/Contract');
const Job = require('../../models/Job');
const Payment = require('../../models/Payment');
const Report = require('../../models/Report');
const AdminAuditLog = require('../../models/AdminAuditLog');
const { auditLog } = require('../../utils/adminAudit');
const { exportToCSV, exportToExcel, exportToPDF, sendExportResponse } = require('../../utils/exportHelper');

const USER_EXPORT_COLUMNS = [
  { key: '_id', label: 'ID' },
  { key: 'email', label: 'Email' },
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'username', label: 'Username' },
  { key: 'role', label: 'Role' },
  { key: 'isBlocked', label: 'Suspended' },
  { key: 'isEmailVerified', label: 'Email Verified' },
  { key: 'createdAt', label: 'Joined' }
];

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * GET /users
 * ?role=all|freelancer|client&search=&isBlocked=&deletedAt=&dateFrom=&dateTo=&sortBy=createdAt&order=desc&page=1&limit=20
 */
const getUsers = async (req, res) => {
  try {
    const {
      role, search, isBlocked, showDeleted,
      dateFrom, dateTo,
      sortBy = 'createdAt', order = 'desc',
      page = 1, limit = 20
    } = req.query;

    const filter = {};

    // Role filter
    if (role && role !== 'all') {
      filter.role = role;
    }

    // Deleted / active toggle
    if (showDeleted === 'true') {
      filter.deletedAt = { $ne: null };
    } else {
      filter.deletedAt = null;
    }

    // Suspension filter
    if (isBlocked !== undefined && isBlocked !== '') {
      filter.isBlocked = isBlocked === 'true';
    }

    // Date range
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   filter.createdAt.$lte = new Date(dateTo);
    }

    // Text search
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { email: regex },
        { firstName: regex },
        { lastName: regex },
        { username: regex }
      ];
    }

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const sort  = { [sortBy]: order === 'asc' ? 1 : -1 };

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -passwordResetToken')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('[Users] getUsers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load users' });
  }
};

// ─── Detail ───────────────────────────────────────────────────────────────────

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -passwordResetToken')
      .lean();

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Fetch profile based on role
    let profile = null;
    if (user.role === 'freelancer') {
      profile = await FreelancerProfile.findOne({ userId: user._id }).lean();
    } else if (user.role === 'client') {
      profile = await ClientProfile.findOne({ userId: user._id }).lean();
    }

    // Quick stats
    const [contractCount, jobCount, paymentCount, reportCount] = await Promise.all([
      Contract.countDocuments({
        $or: [{ clientId: user._id }, { freelancerId: user._id }]
      }),
      Job.countDocuments({ postedBy: user._id }),
      Payment.countDocuments({
        $or: [{ clientId: user._id }, { freelancerId: user._id }]
      }),
      Report.countDocuments({
        $or: [{ reportedBy: user._id }, { reportedUser: user._id }]
      })
    ]);

    return res.status(200).json({
      success: true,
      user: { ...user, profile },
      stats: { contractCount, jobCount, paymentCount, reportCount }
    });
  } catch (err) {
    console.error('[Users] getUserById error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load user' });
  }
};

// ─── Edit ─────────────────────────────────────────────────────────────────────

const editUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const allowedFields = ['firstName', 'lastName', 'phone', 'role', 'isEmailVerified'];
    const prev = {};
    const next = {};

    allowedFields.forEach(f => {
      if (req.body[f] !== undefined) {
        prev[f] = user[f];
        user[f] = req.body[f];
        next[f] = req.body[f];
      }
    });

    await user.save();

    auditLog(req, {
      action: 'user.edit',
      category: 'user',
      resource: 'User',
      resourceId: user._id,
      previousValue: prev,
      newValue: next,
      severity: 'info'
    });

    return res.status(200).json({ success: true, message: 'User updated', user });
  } catch (err) {
    console.error('[Users] editUser error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};

// ─── Suspend / Unsuspend ──────────────────────────────────────────────────────

const suspendUser = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isBlocked) return res.status(400).json({ success: false, message: 'User already suspended' });

    user.isBlocked      = true;
    user.blockedReason  = reason;
    user.suspendedAt    = new Date();
    user.suspendedReason = reason;
    user.suspendedBy    = req.admin.email;
    await user.save();

    auditLog(req, {
      action: 'user.suspend',
      category: 'user',
      resource: 'User',
      resourceId: user._id,
      newValue: { reason },
      severity: 'warning'
    });

    return res.status(200).json({ success: true, message: 'User suspended' });
  } catch (err) {
    console.error('[Users] suspendUser error:', err);
    return res.status(500).json({ success: false, message: 'Failed to suspend user' });
  }
};

const unsuspendUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.isBlocked) return res.status(400).json({ success: false, message: 'User is not suspended' });

    user.isBlocked       = false;
    user.blockedReason   = null;
    user.suspendedAt     = null;
    user.suspendedReason = null;
    user.suspendedBy     = null;
    await user.save();

    auditLog(req, {
      action: 'user.unsuspend',
      category: 'user',
      resource: 'User',
      resourceId: user._id,
      severity: 'info'
    });

    return res.status(200).json({ success: true, message: 'User unsuspended' });
  } catch (err) {
    console.error('[Users] unsuspendUser error:', err);
    return res.status(500).json({ success: false, message: 'Failed to unsuspend user' });
  }
};

// ─── Soft Delete ──────────────────────────────────────────────────────────────

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.deletedAt) return res.status(400).json({ success: false, message: 'User already deleted' });

    user.deletedAt  = new Date();
    user.deletedBy  = req.admin.email;
    user.isActive   = false;
    user.isBlocked  = true;
    await user.save();

    auditLog(req, {
      action: 'user.delete',
      category: 'user',
      resource: 'User',
      resourceId: user._id,
      notes: 'Soft delete — data preserved',
      severity: 'critical'
    });

    return res.status(200).json({ success: true, message: 'User soft-deleted' });
  } catch (err) {
    console.error('[Users] deleteUser error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};

// ─── Sub-resources ────────────────────────────────────────────────────────────

const getUserContracts = async (req, res) => {
  try {
    const contracts = await Contract.find({
      $or: [{ clientId: req.params.id }, { freelancerId: req.params.id }]
    })
      .populate('clientId', 'email firstName lastName')
      .populate('freelancerId', 'email firstName lastName')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({ success: true, contracts });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load contracts' });
  }
};

const getUserJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ postedBy: req.params.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({ success: true, jobs });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load jobs' });
  }
};

const getUserPayments = async (req, res) => {
  try {
    const payments = await Payment.find({
      $or: [{ clientId: req.params.id }, { freelancerId: req.params.id }]
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({ success: true, payments });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load payments' });
  }
};

const getUserWallet = async (req, res) => {
  try {
    const [freelancer, client] = await Promise.all([
      FreelancerProfile.findOne({ userId: req.params.id }).select('walletBalance totalEarnings isFrozenWallet walletFrozenBy walletFrozenAt').lean(),
      ClientProfile.findOne({ userId: req.params.id }).select('walletBalance totalSpent isFrozenWallet walletFrozenBy walletFrozenAt').lean()
    ]);

    return res.status(200).json({
      success: true,
      wallet: freelancer || client || null
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load wallet' });
  }
};

const getUserDisputes = async (req, res) => {
  try {
    const contracts = await Contract.find({
      $or: [{ clientId: req.params.id }, { freelancerId: req.params.id }],
      'dispute.status': { $in: ['pending', 'investigating', 'resolved'] }
    })
      .select('title status dispute createdAt')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({ success: true, disputes: contracts });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load disputes' });
  }
};

const getUserReports = async (req, res) => {
  try {
    const reports = await Report.find({
      $or: [{ reportedBy: req.params.id }, { reportedUser: req.params.id }]
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({ success: true, reports });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load reports' });
  }
};

const getUserActivity = async (req, res) => {
  try {
    const logs = await AdminAuditLog.find({ resourceId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({ success: true, activity: logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load activity' });
  }
};

// ─── Export ───────────────────────────────────────────────────────────────────

const exportUsers = async (req, res) => {
  try {
    const { format = 'csv', role, search } = req.query;
    const filter = { deletedAt: null };
    if (role && role !== 'all') filter.role = role;
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ email: regex }, { firstName: regex }, { lastName: regex }];
    }

    const users = await User.find(filter)
      .select('email firstName lastName username role isBlocked isEmailVerified createdAt')
      .sort({ createdAt: -1 })
      .lean();

    let buffer;
    if (format === 'excel') {
      buffer = await exportToExcel(users, USER_EXPORT_COLUMNS, 'Users');
    } else if (format === 'pdf') {
      buffer = await exportToPDF(users, USER_EXPORT_COLUMNS, 'SkillKart — Users Export');
    } else {
      buffer = exportToCSV(users, USER_EXPORT_COLUMNS);
    }

    auditLog(req, {
      action: `export.${format}`,
      category: 'export',
      resource: 'User',
      notes: `Exported ${users.length} users`,
      severity: 'info'
    });

    sendExportResponse(res, buffer, format, 'users');
  } catch (err) {
    console.error('[Users] export error:', err);
    return res.status(500).json({ success: false, message: 'Export failed' });
  }
};

module.exports = {
  getUsers,
  getUserById,
  editUser,
  suspendUser,
  unsuspendUser,
  deleteUser,
  getUserContracts,
  getUserJobs,
  getUserPayments,
  getUserWallet,
  getUserDisputes,
  getUserReports,
  getUserActivity,
  exportUsers
};
