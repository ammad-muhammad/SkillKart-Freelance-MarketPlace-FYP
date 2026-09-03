const User = require('../../models/User');
const { USER_ROLES } = require('../../utils/constants');
const { parsePagination } = require('../../utils/helpers');

// superadmin is granted exclusively via `npm run setup:superadmin` (encrypted, out-of-band) —
// never assignable through the generic user-edit endpoint.
const ADMIN_ASSIGNABLE_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.CONTENT_EDITOR,
  USER_ROLES.FREELANCER,
  USER_ROLES.CLIENT,
  USER_ROLES.PUBLIC_VIEWER
];
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
      sortBy = 'createdAt', order = 'desc'
    } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const filter = { isSystemAccount: { $ne: true } }; // hide the Support system account

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

    const sort  = { [sortBy]: order === 'asc' ? 1 : -1 };

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -passwordResetToken')
        .sort(sort)
        .skip(skip)
        .limit(limit)
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
      Job.countDocuments({ clientId: user._id }),
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

    if (req.body.role !== undefined && !ADMIN_ASSIGNABLE_ROLES.includes(req.body.role)) {
      return res.status(400).json({ success: false, message: 'Invalid or non-assignable role' });
    }

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
    const jobs = await Job.find({ clientId: req.params.id })
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

// ─── Full profile management ────────────────────────────────────────────────────

const { syncFreelancerVerification } = require('../../services/verification.service');

// Fields an admin may write on each profile type. Everything the user can edit
// themselves during onboarding/settings is editable here; computed/financial
// fields (walletBalance, totalEarnings, rating, stripe*) are intentionally NOT
// in these lists — those are managed through the wallet/finance actions.
const FREELANCER_EDITABLE = [
  'bio', 'title', 'coverPhoto', 'phone', 'hourlyRate', 'skills',
  'portfolioLinks', 'portfolio', 'education', 'certifications', 'languages',
  'availability', 'timezone', 'socialLinks', 'experienceLevel',
  'notificationSettings'
];
const CLIENT_EDITABLE = [
  'companyName', 'companyType', 'companyLogo', 'coverPhoto', 'companySize',
  'industry', 'industryType', 'customIndustry', 'role', 'phone', 'website',
  'description', 'location', 'services', 'techStack', 'budgetRange',
  'hiringFrequency', 'timezone', 'socialLinks', 'languages', 'notificationSettings'
];

/**
 * GET /users/:id/profile — full role profile for the admin editor.
 */
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -passwordResetToken').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let profile = null;
    if (user.role === 'freelancer') profile = await FreelancerProfile.findOne({ userId: user._id }).lean();
    else if (user.role === 'client') profile = await ClientProfile.findOne({ userId: user._id }).lean();

    return res.status(200).json({ success: true, user, profile });
  } catch (err) {
    console.error('[Users] getUserProfile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load profile' });
  }
};

/**
 * PATCH /users/:id/profile — edit the full freelancer/client profile.
 * Creates the profile if it doesn't exist yet (e.g. user never onboarded).
 */
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isFreelancer = user.role === 'freelancer';
    const isClient = user.role === 'client';
    if (!isFreelancer && !isClient) {
      return res.status(400).json({ success: false, message: 'Only freelancer/client profiles are editable' });
    }

    const Model = isFreelancer ? FreelancerProfile : ClientProfile;
    const allowed = isFreelancer ? FREELANCER_EDITABLE : CLIENT_EDITABLE;

    let profile = await Model.findOne({ userId: user._id });
    if (!profile) profile = new Model({ userId: user._id });

    const prev = {}, next = {};
    allowed.forEach(f => {
      if (req.body[f] !== undefined) {
        prev[f] = profile[f];
        // Special-case skills: the editor only sends { name, level }, so merge
        // rather than overwrite — otherwise we'd wipe isVerified/verificationScore
        // on skills that were already verified. Existing verification state is
        // preserved by name; brand-new skills start unverified.
        if (f === 'skills' && isFreelancer && Array.isArray(req.body.skills)) {
          const existing = new Map((profile.skills || []).map(s => [String(s.name).toLowerCase(), s]));
          profile.skills = req.body.skills.map(incoming => {
            const match = existing.get(String(incoming.name).toLowerCase());
            if (match) {
              // keep verification fields, update the editable level/name
              match.name = incoming.name;
              if (incoming.level) match.level = incoming.level;
              return match;
            }
            return { name: incoming.name, level: incoming.level || 'Beginner', isVerified: false, verificationScore: 0 };
          });
          next.skills = profile.skills.map(s => ({ name: s.name, level: s.level, isVerified: s.isVerified }));
        } else {
          profile[f] = req.body[f];
          next[f] = req.body[f];
        }
      }
    });
    if (Object.keys(next).length === 0) {
      return res.status(400).json({ success: false, message: 'No editable fields provided' });
    }

    await profile.save();

    // Keep the freelancer's aggregate verification status consistent after edits
    // that affect the profile-completed / skills checklist.
    if (isFreelancer) {
      try { await syncFreelancerVerification(user._id); } catch { /* non-fatal */ }
    }

    auditLog(req, {
      action: 'user.profile.edit', category: 'user', resource: isFreelancer ? 'FreelancerProfile' : 'ClientProfile',
      resourceId: profile._id, previousValue: prev, newValue: next, notes: `Edited ${Object.keys(next).join(', ')}`, severity: 'warning'
    });

    return res.status(200).json({ success: true, message: 'Profile updated', profile });
  } catch (err) {
    console.error('[Users] updateProfile error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to update profile' });
  }
};

/**
 * PATCH /users/:id/avatar — set the user's profile picture from a URL.
 */
const updateAvatar = async (req, res) => {
  try {
    const { profilePicture } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const prev = user.profilePicture;
    user.profilePicture = profilePicture || null;
    await user.save();

    auditLog(req, {
      action: 'user.avatar.update', category: 'user', resource: 'User', resourceId: user._id,
      previousValue: { profilePicture: prev }, newValue: { profilePicture: user.profilePicture }, severity: 'info'
    });
    return res.status(200).json({ success: true, message: 'Avatar updated', profilePicture: user.profilePicture });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update avatar' });
  }
};

/**
 * PATCH /users/:id/verify-email  — directly verify/unverify a user's email
 * without them clicking the OTP. Body: { verified: true|false }.
 */
const setEmailVerified = async (req, res) => {
  try {
    const { verified = true } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const prev = user.isEmailVerified;
    user.isEmailVerified = !!verified;
    user.emailVerifiedAt = verified ? new Date() : null;
    await user.save();

    if (user.role === 'freelancer') {
      try { await syncFreelancerVerification(user._id); } catch { /* non-fatal */ }
    }

    auditLog(req, {
      action: verified ? 'user.email.verify' : 'user.email.unverify', category: 'user', resource: 'User',
      resourceId: user._id, previousValue: { isEmailVerified: prev }, newValue: { isEmailVerified: !!verified }, severity: 'warning'
    });
    return res.status(200).json({ success: true, message: verified ? 'Email verified' : 'Email unverified' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update email verification' });
  }
};

/**
 * PATCH /users/:id/skills/verify — directly pass/fail a freelancer's skill test.
 * Writes the SAME fields the real skill test writes (isVerified, verificationScore,
 * lastTestedAt, expiresAt, level) then re-syncs aggregate verification.
 * Body: { skill?: 'React', verified: true|false, score?: 90, all?: true }
 */
const setSkillVerification = async (req, res) => {
  try {
    const { skill, verified = true, score, all } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role !== 'freelancer') return res.status(400).json({ success: false, message: 'Only freelancers have skills' });

    const profile = await FreelancerProfile.findOne({ userId: user._id });
    if (!profile || !profile.skills?.length) {
      return res.status(400).json({ success: false, message: 'Freelancer has no skills to verify' });
    }

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 6);
    const pct = score != null ? Number(score) : (verified ? 100 : 0);

    const apply = (s) => {
      s.isVerified = !!verified;
      s.verificationScore = pct;
      s.lastTestedAt = new Date();
      s.expiresAt = verified ? expiresAt : undefined;
      if (verified && pct >= 80) s.level = 'Expert';
      else if (verified && pct >= 50) s.level = 'Intermediate';
    };

    let affected = [];
    if (all) {
      profile.skills.forEach(s => { apply(s); affected.push(s.name); });
    } else {
      const target = profile.skills.find(s => String(s.name).toLowerCase() === String(skill).toLowerCase());
      if (!target) return res.status(404).json({ success: false, message: `Skill "${skill}" not found on this freelancer` });
      apply(target);
      affected.push(target.name);
    }

    await profile.save();
    let sync = null;
    try { sync = await syncFreelancerVerification(user._id); } catch { /* non-fatal */ }

    auditLog(req, {
      action: verified ? 'user.skill.verify' : 'user.skill.unverify', category: 'user', resource: 'FreelancerProfile',
      resourceId: profile._id, newValue: { skills: affected, verified: !!verified, score: pct },
      notes: `Admin ${verified ? 'passed' : 'reset'} skill test for: ${affected.join(', ')}`, severity: 'warning'
    });
    return res.status(200).json({ success: true, message: `${affected.length} skill(s) ${verified ? 'verified' : 'reset'}`, verificationStatus: sync?.verificationStatus });
  } catch (err) {
    console.error('[Users] setSkillVerification error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update skill verification' });
  }
};

/**
 * PATCH /users/:id/verification — directly set verification checklist flags and/or
 * the overall verificationStatus (identity/KYC, phone, portfolio, payment, status).
 * Body: { flags?: { identityVerified, phoneVerified, portfolioReviewed, paymentMethodAdded }, status?: 'verified'|'pending'|'unverified' }
 */
const setVerification = async (req, res) => {
  try {
    const { flags, status } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.role === 'freelancer') {
      const profile = await FreelancerProfile.findOne({ userId: user._id }) || new FreelancerProfile({ userId: user._id });
      const prev = { verificationDetails: { ...(profile.verificationDetails || {}) }, verificationStatus: profile.verificationStatus };
      if (flags && typeof flags === 'object') {
        profile.verificationDetails = { ...(profile.verificationDetails || {}), ...flags };
      }
      if (status) profile.verificationStatus = status;
      await profile.save();
      auditLog(req, {
        action: 'user.verification.set', category: 'user', resource: 'FreelancerProfile', resourceId: profile._id,
        previousValue: prev, newValue: { flags, status }, severity: 'critical'
      });
    } else if (user.role === 'client') {
      const profile = await ClientProfile.findOne({ userId: user._id }) || new ClientProfile({ userId: user._id });
      const prev = { verificationStatus: profile.verificationStatus };
      if (status) profile.verificationStatus = status;
      await profile.save();
      auditLog(req, {
        action: 'user.verification.set', category: 'user', resource: 'ClientProfile', resourceId: profile._id,
        previousValue: prev, newValue: { status }, severity: 'critical'
      });
    } else {
      return res.status(400).json({ success: false, message: 'No profile to verify for this role' });
    }

    return res.status(200).json({ success: true, message: 'Verification updated' });
  } catch (err) {
    console.error('[Users] setVerification error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update verification' });
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
  exportUsers,
  getUserProfile,
  updateProfile,
  updateAvatar,
  setEmailVerified,
  setSkillVerification,
  setVerification
};
