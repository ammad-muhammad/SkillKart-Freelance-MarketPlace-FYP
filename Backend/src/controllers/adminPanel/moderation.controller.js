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
const { parsePagination } = require('../../utils/helpers');
const { recalculateRating } = require('../../services/rating.service');

// ─── Chat Moderation ──────────────────────────────────────────────────────────

const getConversations = async (req, res) => {
  try {
    const { search, userId } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};

    // Filter by a specific participant (userId), or resolve an email/name search
    // to participant ids first (participants is an array of ObjectId refs, so we
    // can't regex it directly).
    if (userId) {
      filter.participants = userId;
    } else if (search) {
      const User = require('../../models/User');
      const regex = new RegExp(search.trim(), 'i');
      const matched = await User.find({ $or: [{ email: regex }, { firstName: regex }, { lastName: regex }] }).select('_id').lean();
      filter.participants = { $in: matched.map(u => u._id) };
    }

    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .populate('participants', 'email firstName lastName profilePicture')
        .sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      Conversation.countDocuments(filter)
    ]);

    // messageCount per conversation for the list column
    const withCounts = await Promise.all(conversations.map(async (c) => ({
      ...c,
      messageCount: await Message.countDocuments({ conversationId: c._id })
    })));

    return res.status(200).json({ success: true, conversations: withCounts, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('[Chat] getConversations error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load conversations' });
  }
};

const getConversationMessages = async (req, res) => {
  try {
    const { q } = req.query;
    const filter = { conversationId: req.params.conversationId };
    // Message-level search within a conversation
    if (q) filter.content = new RegExp(q.trim(), 'i');

    const [conversation, messages] = await Promise.all([
      Conversation.findById(req.params.conversationId)
        .populate('participants', 'email firstName lastName profilePicture')
        .lean(),
      Message.find(filter)
        .populate('sender', 'email firstName lastName profilePicture')
        .sort({ createdAt: 1 })
        .lean()
    ]);

    return res.status(200).json({ success: true, conversation, messages });
  } catch (err) {
    console.error('[Chat] getConversationMessages error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load messages' });
  }
};

// ─── Admin → user messaging (as "SkillKart Support") ───────────────────────────
// Admins have no User id, so all admin-sent messages are attributed to a single
// dedicated support User. The recipient sees/replies in their normal inbox.
const { getSupportUser } = require('../../services/supportUser.service');
const notifications = require('../../services/notification.service');

// Post a message into a conversation as the support user, bumping unread for the
// other participants and firing their new-message notification.
const postSupportMessage = async (conversation, supportUser, content, attachments) => {
  const message = await Message.create({
    conversationId: conversation._id,
    sender: supportUser._id,
    content,
    attachments: attachments || []
  });

  conversation.lastMessage = message._id;
  const recipients = (conversation.participants || [])
    .map(p => (p._id || p).toString())
    .filter(id => id !== String(supportUser._id));

  recipients.forEach(rid => {
    const current = conversation.unreadCount?.get?.(rid) || 0;
    conversation.unreadCount?.set?.(rid, current + 1);
  });
  await conversation.save();

  // Notify each recipient (fire-and-forget)
  const User = require('../../models/User');
  recipients.forEach(rid => {
    User.findById(rid).select('role').lean()
      .then(r => notifications.onNewMessage(rid, { senderName: 'SkillKart Support', role: r?.role }))
      .catch(() => {});
  });

  return message;
};

/**
 * POST /chat/send  { userId, content, attachments? }
 * Start or continue the support↔user thread with a specific user.
 */
const sendAdminMessage = async (req, res) => {
  try {
    const { userId, content, attachments } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'userId is required' });
    if (!content || !content.trim()) return res.status(400).json({ success: false, message: 'Message content is required' });

    const User = require('../../models/User');
    const target = await User.findById(userId).select('_id role').lean();
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });

    const support = await getSupportUser();
    if (String(support._id) === String(userId)) {
      return res.status(400).json({ success: false, message: 'Cannot message the support account' });
    }

    let conversation = await Conversation.findOne({ participants: { $all: [support._id, userId] } });
    if (!conversation) {
      conversation = await Conversation.create({ participants: [support._id, userId] });
    }

    const message = await postSupportMessage(conversation, support, content.trim(), attachments);

    auditLog(req, {
      action: 'chat.admin_message', category: 'chat', resource: 'Conversation', resourceId: conversation._id,
      newValue: { to: userId, preview: content.trim().slice(0, 120) }, severity: 'info'
    });

    return res.status(201).json({ success: true, message: 'Message sent', conversationId: conversation._id, data: message });
  } catch (err) {
    console.error('[Chat] sendAdminMessage error:', err);
    return res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

/**
 * POST /chat/:conversationId/reply  { content, attachments? }
 * Reply into an existing conversation as SkillKart Support (moderation reply).
 */
const replyAsAdmin = async (req, res) => {
  try {
    const { content, attachments } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ success: false, message: 'Message content is required' });

    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found' });

    const support = await getSupportUser();
    // Make sure the support user is a participant so replies belong to the thread.
    if (!conversation.participants.map(p => String(p)).includes(String(support._id))) {
      conversation.participants.push(support._id);
    }

    const message = await postSupportMessage(conversation, support, content.trim(), attachments);

    auditLog(req, {
      action: 'chat.admin_reply', category: 'chat', resource: 'Conversation', resourceId: conversation._id,
      newValue: { preview: content.trim().slice(0, 120) }, severity: 'info'
    });

    return res.status(201).json({ success: true, message: 'Reply sent', data: message });
  } catch (err) {
    console.error('[Chat] replyAsAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to send reply' });
  }
};

// ─── Reviews ──────────────────────────────────────────────────────────────────

const getReviews = async (req, res) => {
  try {
    const { isHidden, minRating, maxRating } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (isHidden !== undefined && isHidden !== '') filter.isHidden = isHidden === 'true';
    if (minRating) filter.rating = { $gte: parseFloat(minRating) };
    if (maxRating) filter.rating = { ...(filter.rating || {}), $lte: parseFloat(maxRating) };

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('reviewerId', 'email firstName lastName')
        .populate('revieweeId', 'email firstName lastName')
        .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Review.countDocuments(filter)
    ]);

    return res.status(200).json({ success: true, reviews, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
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
    // Hiding an abusive/fake review must stop it counting toward the
    // reviewee's score immediately, not just whenever their next unrelated
    // review happens to trigger a recalculation.
    await recalculateRating(review);

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
    await recalculateRating(review);

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
    if (!review.isHidden) await recalculateRating(review); // was already excluded if hidden — no change needed
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
    const { status, priority, category } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate('reportedBy', 'email firstName lastName')
        .populate('reportedUser', 'email firstName lastName')
        .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Report.countDocuments(filter)
    ]);

    return res.status(200).json({ success: true, reports, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
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
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AdminAuditLog.find({ category: 'monitoring' }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AdminAuditLog.countDocuments({ category: 'monitoring' })
    ]);
    return res.status(200).json({ success: true, logs, pagination: { total, page, pages: Math.ceil(total / limit) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load system logs' });
  }
};

const getEmailLogs = async (req, res) => {
  try {
    const { status, provider } = req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const filter = {};
    if (status) filter.status = status;
    if (provider) filter.provider = provider;

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      EmailLog.find(filter).sort({ sentAt: -1 }).skip(skip).limit(limit).lean(),
      EmailLog.countDocuments(filter)
    ]);
    return res.status(200).json({ success: true, logs, pagination: { total, page, pages: Math.ceil(total / limit) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load email logs' });
  }
};

const getApiLogs = async (req, res) => {
  try {
    const { status, path: pathFilter } = req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const filter = {};
    if (status) filter.statusCode = parseInt(status);
    if (pathFilter) filter.path = new RegExp(pathFilter, 'i');

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      ApiLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      ApiLog.countDocuments(filter)
    ]);
    return res.status(200).json({ success: true, logs, pagination: { total, page, pages: Math.ceil(total / limit) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load API logs' });
  }
};

const getErrorLogs = async (req, res) => {
  try {
    const { resolved, type } = req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const filter = {};
    if (resolved !== undefined && resolved !== '') filter.resolved = resolved === 'true';
    if (type) filter.type = type;

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      ErrorLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      ErrorLog.countDocuments(filter)
    ]);
    return res.status(200).json({ success: true, logs, pagination: { total, page, pages: Math.ceil(total / limit) } });
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
    const { adminEmail, category, severity, action, dateFrom, dateTo } = req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
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

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AdminAuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AdminAuditLog.countDocuments(filter)
    ]);

    return res.status(200).json({ success: true, logs, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
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

// Selectable overview windows for the Analytics page's date-range tabs.
const ANALYTICS_RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };

const getAnalytics = async (req, res) => {
  try {
    const User = require('../../models/User');
    const Job = require('../../models/Job');
    const Contract = require('../../models/Contract');
    const Payment = require('../../models/Payment');

    // Which window the frontend's date-range tabs selected — previously
    // collected (setTimeRange) but never actually sent to this endpoint, so
    // every tab showed the exact same all-time data.
    const rangeKey = ANALYTICS_RANGE_DAYS[req.query.range] ? req.query.range : '30d';
    const days = ANALYTICS_RANGE_DAYS[rangeKey];
    const now = new Date();
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousSince = new Date(since.getTime() - days * 24 * 60 * 60 * 1000);

    const [
      usersByRole,
      jobsByStatus,
      contractsByStatus,
      revenueByMonth,
      topFreelancers,
      categoryBreakdown,
      currentTotals,
      previousTotals,
      currentNewUsers,
      previousNewUsers,
      currentJobsWindow,
      previousJobsWindow
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
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$releasedAt' } }, revenue: { $sum: '$platformFee' }, grossVolume: { $sum: '$totalAmount' } } },
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
      ]),
      // Real category breakdown for the market-share chart — replaces a
      // previously fully hardcoded array of fabricated names/counts.
      Job.aggregate([
        { $match: { category: { $exists: true, $ne: null, $ne: '' } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      // Real gross transaction volume + platform fee revenue for the
      // selected window — the frontend previously derived "platform fees"
      // as a fabricated flat 8% of a number that was already the fee total
      // mislabeled as gross revenue (the real fee rate is 0.5%, PLATFORM_FEE_RATE).
      Payment.aggregate([
        { $match: { status: 'released', releasedAt: { $gte: since } } },
        { $group: { _id: null, grossVolume: { $sum: '$totalAmount' }, platformFees: { $sum: '$platformFee' } } }
      ]),
      Payment.aggregate([
        { $match: { status: 'released', releasedAt: { $gte: previousSince, $lt: since } } },
        { $group: { _id: null, grossVolume: { $sum: '$totalAmount' }, platformFees: { $sum: '$platformFee' } } }
      ]),
      // Real period-over-period deltas for the KPI cards — replaces four
      // hardcoded "↑ 18.4% / 22.1% / 14.8% / 3.2%" strings that never
      // changed regardless of what actually happened on the platform.
      User.countDocuments({ deletedAt: null, createdAt: { $gte: since } }),
      User.countDocuments({ deletedAt: null, createdAt: { $gte: previousSince, $lt: since } }),
      Job.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: null, total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } }
      ]),
      Job.aggregate([
        { $match: { createdAt: { $gte: previousSince, $lt: since } } },
        { $group: { _id: null, total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } }
      ])
    ]);

    const totalCategoryJobs = categoryBreakdown.reduce((sum, c) => sum + c.count, 0) || 1;
    const categories = categoryBreakdown.map((c) => ({
      name: c._id,
      count: c.count,
      percentage: Math.round((c.count / totalCategoryJobs) * 100)
    }));

    // One-decimal percent change; a zero prior-period baseline reads as
    // "+100%" if there's any current activity, "0%" otherwise — there's no
    // meaningful ratio to compute against zero.
    const pctChange = (curr, prev) => {
      if (!prev) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 1000) / 10;
    };

    const curr = currentTotals[0] || { grossVolume: 0, platformFees: 0 };
    const prev = previousTotals[0] || { grossVolume: 0, platformFees: 0 };
    const currJobs = currentJobsWindow[0] || { total: 0, completed: 0 };
    const prevJobs = previousJobsWindow[0] || { total: 0, completed: 0 };
    const currCompletionRate = currJobs.total > 0 ? (currJobs.completed / currJobs.total) * 100 : 0;
    const prevCompletionRate = prevJobs.total > 0 ? (prevJobs.completed / prevJobs.total) * 100 : 0;

    return res.status(200).json({
      success: true,
      analytics: {
        range: rangeKey,
        usersByRole,
        jobsByStatus,
        contractsByStatus,
        revenueByMonth,
        topFreelancers,
        categoryBreakdown: categories,
        window: {
          grossVolume: curr.grossVolume,
          platformFees: curr.platformFees,
          newUsers: currentNewUsers,
          completionRate: Math.round(currCompletionRate * 10) / 10,
          completedJobs: currJobs.completed,
          totalJobs: currJobs.total
        },
        deltas: {
          grossVolume: pctChange(curr.grossVolume, prev.grossVolume),
          platformFees: pctChange(curr.platformFees, prev.platformFees),
          newUsers: pctChange(currentNewUsers, previousNewUsers),
          completionRate: pctChange(currCompletionRate, prevCompletionRate)
        }
      }
    });
  } catch (err) {
    console.error('[Analytics] error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load analytics' });
  }
};

module.exports = {
  // Chat
  getConversations, getConversationMessages, sendAdminMessage, replyAsAdmin,
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
