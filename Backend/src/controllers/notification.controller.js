const Notification = require('../models/Notification');
const { sendSuccess } = require('../utils/apiResponse');
const { asyncHandler, parsePagination } = require('../utils/helpers');

/**
 * GET /notifications — the caller's notifications, newest first.
 * Query: ?unread=true to only return unread, plus page/limit.
 */
const listNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const query = { userId: req.user._id };
  if (req.query.unread === 'true') query.read = false;

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ userId: req.user._id, read: false }),
  ]);

  sendSuccess(res, {
    message: 'Notifications retrieved',
    data: { items, unreadCount },
    meta: { pagination: { page, limit, total } },
  });
});

/** GET /notifications/unread-count — lightweight badge count. */
const getUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await Notification.countDocuments({ userId: req.user._id, read: false });
  sendSuccess(res, { message: 'Unread count', data: { unreadCount } });
});

/** PATCH /notifications/:id/read — mark one as read (own only). */
const markRead = asyncHandler(async (req, res) => {
  await Notification.updateOne(
    { _id: req.params.id, userId: req.user._id },
    { $set: { read: true, readAt: new Date() } }
  );
  sendSuccess(res, { message: 'Marked as read' });
});

/** PATCH /notifications/read-all — mark all of the caller's as read. */
const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, read: false },
    { $set: { read: true, readAt: new Date() } }
  );
  sendSuccess(res, { message: 'All notifications marked as read' });
});

/** DELETE /notifications/:id — remove one (own only). */
const deleteNotification = asyncHandler(async (req, res) => {
  await Notification.deleteOne({ _id: req.params.id, userId: req.user._id });
  sendSuccess(res, { message: 'Notification deleted' });
});

module.exports = { listNotifications, getUnreadCount, markRead, markAllRead, deleteNotification };
