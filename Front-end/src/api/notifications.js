import client from './client';

export const notificationsAPI = {
  // List notifications (newest first). params: { unread, page, limit }
  list: (params) => client.get('/notifications', { params }),

  // Lightweight unread badge count.
  unreadCount: () => client.get('/notifications/unread-count', { suppressErrorToast: true }),

  markRead: (id) => client.patch(`/notifications/${id}/read`),

  markAllRead: () => client.patch('/notifications/read-all'),

  remove: (id) => client.delete(`/notifications/${id}`),

  clearAll: () => client.delete('/notifications/clear-all'),
};
