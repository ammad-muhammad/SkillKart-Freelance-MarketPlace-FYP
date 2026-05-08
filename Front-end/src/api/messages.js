import client from './client';

export const messagesAPI = {
  // Get all conversations
  getConversations: () => client.get('/messages/conversations'),

  // Get messages for a specific conversation
  getMessages: (conversationId) => client.get(`/messages/${conversationId}`),

  // Send a new message
  sendMessage: (recipientId, content, attachments = []) => 
    client.post('/messages/send', { recipientId, content, attachments }),

  // Start conversation from a profile (or gig)
  startConversation: (userId, initialMessage) =>
    client.post('/messages/send', { recipientId: userId, content: initialMessage })
};
