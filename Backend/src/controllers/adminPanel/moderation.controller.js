const Conversation = require('../../models/Conversation');
const Message = require('../../models/Message');
const Review = require('../../models/Review');
const Notification = require('../../models/Notification');
const Report = require('../../models/Report');
const AdminAuditLog = require('../../models/AdminAuditLog');
const ApiLog = require('../../models/ApiLog');
const EmailLog = require('../../models/EmailLog');
const ErrorLog = require('../../models/ErrorLog');
const SystemSettings = require('../../models/SystemSettings');
const { auditLog } = require('../../utils/adminAudit');

// ─── Chat Moderation ──────────────────────────────────────────────────────────

const getConversations = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (search) filter.$or = [{ 'participants.email': new RegExp(search, 'i') }];

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .populate('participants', 'email firstName lastName profilePicture')
        .sort({ updatedAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Conversation.countDocuments(filter)
    ]);

    return res.status(200).json({ success: true, conversations, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load conversations' });
  }
};

const getConversationMessages = async (req, res) => {
  try {
    const messages = await Message.find({ conversationId: req.params.conversationId })
      .populate('senderId', 'email firstName lastName')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({ success: true, messages });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load messages' });
  }
};

// ─── Reviews ──────────────────────────────────────────────────────────────────

const getReviews = async (req, res) => {
  try {
    const { isHidden, minRating, maxRating, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (isHidden !== undefined && isHidden !== '') filter.isHidden = isHidden === 'true';
    if (minRating) filter.rating = { $gte: parseFloat(minRating) };
    if (maxRating) filter.rating = { ...(filter.rating || {}), $lte: parseFloat(maxRating) };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('reviewerId', 'email firstName lastName')
        .populate('revieweeId', 'email firstName lastName')
        .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Review.countDocuments(filter)
    ]);

    return res.status(200).json({ success: true, reviews, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load reviews' });
  }
};

const hideReview = async (req, res) => {
  try {
    const { reason } = req.body;
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    if (review.isHidden) return res.status(400).json({ success: false, message: 'Review already hidden' });

    review.isHidden   = true;
    review.hiddenBy   = req.admin.email;
    review.hiddenAt   = new Date();
    review.hiddenReason = reason;
    await review.save();

    auditLog(req, { action: 'review.hidden', category: 'review', resource: 'Review', resourceId: review._id, newValue: { reason }, severity: 'info' });
    return res.status(200).json({ success: true, message: 'Review hidden' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to hide review' });
  }
};

const restoreReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

    review.isHidden    = false;
    review.hiddenBy    = null;
    review.hiddenAt    = null;
    review.hiddenReason = null;
    await review.save();

    auditLog(req, { action: 'review.restored', category: 'review', resource: 'Review', resourceId: review._id, severity: 'info' });
    return res.status(200).json({ success: true, message: 'Review restored' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to restore review' });
  }
};

const deleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    auditLog(req, { action: 'review.deleted', category: 'review', resource: 'Review', resourceId: req.params.id, severity: 'warning' });
    return res.status(200).json({ success: true, message: 'Review deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete review' });
  }
};

// ─── Notifications ────────────────────────────────────────────────────────────

const broadcastNotification = async (req, res) => {
  try {
    const { target, userId, title, message } = req.body;
    const User = require('../../models/User');

    let userFilter = { deletedAt: null };
    if (target === 'freelancer') userFilter.role = 'freelancer';
    else if (target === 'client') userFilter.role = 'client';
    else if (target === 'user' && userId) userFilter = { _id: userId };

    const users = await User.find(userFilter).select('_id').lean();

    const notifications = users.map(u => ({
      userId: u._id,
      type: 'admin_broadcast',
      title,
      message,
      isRead: false,
      data: { from: 'admin', target }
    }));

    await Notification.insertMany(notifications, { ordered: false });

    auditLog(req, {
      action: 'notification.broadcast',
      category: 'notification',
      resource: 'Notification',
      newValue: { target, title, recipientCount: users.length },
      notes: `Sent to ${users.length} users`,
      severity: 'info'
    });

    return res.status(200).json({ success: true, message: `Notification sent to ${users.length} user(s)` });
  } catch (err) {
    console.error('[Notifications] broadcast error:', err);
    return res.status(500).json({ success: false, message: 'Failed to broadcast notification' });
  }
};

// ─── Reports ──────────────────────────────────────────────────────────────────

const getReports = async (req, res) => {
  try {
    const { status, priority, category, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate('reportedBy', 'email firstName lastName')
        .populate('reportedUser', 'email firstName lastName')
        .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Report.countDocuments(filter)
    ]);

    return res.status(200).json({ success: true, reports, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load reports' });
  }
};

const getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('reportedBy', 'email firstName lastName')
      .populate('reportedUser', 'email firstName lastName')
      .lean();
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    return res.status(200).json({ success: true, report });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load report' });
  }
};

const assignReport = async (req, res) => {
  try {
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { assignedTo: req.admin.email, status: 'investigating' },
      { new: true }
    );
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    auditLog(req, { action: 'report.assigned', category: 'report', resource: 'Report', resourceId: report._id, severity: 'info' });
    return res.status(200).json({ success: true, message: 'Report assigned' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to assign report' });
  }
};

const resolveReport = async (req, res) => {
  try {
    const { resolution } = req.body;
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved', resolution, resolvedBy: req.admin.email, resolvedAt: new Date() },
      { new: true }
    );
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    auditLog(req, { action: 'report.resolved', category: 'report', resource: 'Report', resourceId: report._id, newValue: { resolution }, severity: 'info' });
    return res.status(200).json({ success: true, message: 'Report resolved' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to resolve report' });
  }
};

const dismissReport = async (req, res) => {
  try {
    const { reason } = req.body;
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status: 'dismissed', resolution: reason, resolvedBy: req.admin.email, resolvedAt: new Date() },
      { new: true }
    );
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    auditLog(req, { action: 'report.dismissed', category: 'report', resource: 'Report', resourceId: report._id, newValue: { reason }, severity: 'info' });
    return res.status(200).json({ success: true, message: 'Report dismissed' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to dismiss report' });
  }
};

// ─── Monitoring ───────────────────────────────────────────────────────────────

const getSystemLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      AdminAuditLog.find({ category: 'monitoring' }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      AdminAuditLog.countDocuments({ category: 'monitoring' })
    ]);
    return res.status(200).json({ success: true, logs, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load system logs' });
  }
};

const getEmailLogs = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      EmailLog.find(filter).sort({ sentAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      EmailLog.countDocuments(filter)
    ]);
    return res.status(200).json({ success: true, logs, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load email logs' });
  }
};

const getApiLogs = async (req, res) => {
  try {
    const { status, path: pathFilter, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.statusCode = parseInt(status);
    if (pathFilter) filter.path = new RegExp(pathFilter, 'i');

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      ApiLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      ApiLog.countDocuments(filter)
    ]);
    return res.status(200).json({ success: true, logs, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load API logs' });
  }
};

const getErrorLogs = async (req, res) => {
  try {
    const { resolved, type, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (resolved !== undefined && resolved !== '') filter.resolved = resolved === 'true';
    if (type) filter.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      ErrorLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      ErrorLog.countDocuments(filter)
    ]);
    return res.status(200).json({ success: true, logs, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load error logs' });
  }
};

const markErrorResolved = async (req, res) => {
  try {
    await ErrorLog.findByIdAndUpdate(req.params.id, { resolved: true });
    return res.status(200).json({ success: true, message: 'Error marked resolved' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update error log' });
  }
};

// ─── Audit Logs ───────────────────────────────────────────────────────────────

const getAuditLogs = async (req, res) => {
  try {
    const { adminEmail, category, severity, action, dateFrom, dateTo, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (adminEmail) filter.adminEmail = new RegExp(adminEmail, 'i');
    if (category) filter.category = category;
    if (severity) filter.severity = severity;
    if (action) filter.action = new RegExp(action, 'i');
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   filter.createdAt.$lte = new Date(dateTo);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      AdminAuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      AdminAuditLog.countDocuments(filter)
    ]);

    return res.status(200).json({ success: true, logs, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load audit logs' });
  }
};

// ─── System Settings ──────────────────────────────────────────────────────────

const getSettings = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = {};
    if (category) filter.category = category;

    const settings = await SystemSettings.find(filter).lean();
    return res.status(200).json({ success: true, settings });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load settings' });
  }
};

const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    const setting = await SystemSettings.findOne({ key });
    if (!setting) return res.status(404).json({ success: false, message: `Setting "${key}" not found` });

    const prev = setting.value;
    setting.value = value;
    setting.lastUpdatedBy = req.admin.email;
    await setting.save();

    const isMaintenance = key === 'maintenance_mode';

    auditLog(req, {
      action: isMaintenance ? 'maintenance.toggled' : 'setting.updated',
      category: 'settings',
      resource: 'SystemSettings',
      resourceId: setting._id,
      previousValue: { value: prev },
      newValue: { value },
      severity: isMaintenance ? 'critical' : 'info'
    });

    return res.status(200).json({ success: true, message: 'Setting updated', setting });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update setting' });
  }
};

// ─── Analytics ────────────────────────────────────────────────────────────────

const getAnalytics = async (req, res) => {
  try {
    const User = require('../../models/User');
    const Job = require('../../models/Job');
    const Contract = require('../../models/Contract');
    const Payment = require('../../models/Payment');

    const [
      usersByRole,
      jobsByStatus,
      contractsByStatus,
      revenueByMonth,
      topFreelancers
    ] = await Promise.all([
      User.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      Job.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Contract.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Payment.aggregate([
        { $match: { status: 'released' } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$releasedAt' } }, revenue: { $sum: '$platformFee' } } },
        { $sort: { _id: 1 } },
        { $limit: 12 }
      ]),
      Payment.aggregate([
        { $match: { status: 'released' } },
        { $group: { _id: '$freelancerId', totalEarnings: { $sum: '$freelancerPayout' }, jobCount: { $sum: 1 } } },
        { $sort: { totalEarnings: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: { email: '$user.email', firstName: '$user.firstName', lastName: '$user.lastName', totalEarnings: 1, jobCount: 1 } }
      ])
    ]);

    return res.status(200).json({
      success: true,
      analytics: {
        usersByRole,
        jobsByStatus,
        contractsByStatus,
        revenueByMonth,
        topFreelancers
      }
    });
  } catch (err) {
    console.error('[Analytics] error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load analytics' });
  }
};

module.exports = {
  // Chat
  getConversations, getConversationMessages,
  // Reviews
  getReviews, hideReview, restoreReview, deleteReview,
  // Notifications
  broadcastNotification,
  // Reports
  getReports, getReportById, assignReport, resolveReport, dismissReport,
  // Monitoring
  getSystemLogs, getEmailLogs, getApiLogs, getErrorLogs, markErrorResolved,
  // Audit Logs
  getAuditLogs,
  // Settings
  getSettings, updateSetting,
  // Analytics
  getAnalytics
};
