import client from './client';

export const messagesAPI = {
  // Get all conversations
  getConversations: () => client.get('/messages/conversations'),

  // Get messages for a specific conversation
  getMessages: (conversationId) => client.get(`/messages/${conversationId}`),

  // Send a new message. Callers (ClientMessages.jsx, FreelancerMessages.jsx)
  // already show their own contextual toast — suppress the global auto-toast
  // to avoid double-toasting.
  sendMessage: (recipientId, content, attachments = []) =>
    client.post('/messages/send', { recipientId, content, attachments }, { suppressErrorToast: true }),

  // Start conversation from a profile (or gig). `config` lets a caller with
  // its own error handling (e.g. ReviewProposals.jsx) opt out of the global
  // auto-toast via { suppressErrorToast: true } — other callers rely on it.
  startConversation: (userId, initialMessage, config) =>
    client.post('/messages/send', { recipientId: userId, content: initialMessage }, config)
};
