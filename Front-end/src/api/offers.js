import client from './client';

/**
 * Custom offers — a freelancer's price/scope offer sent inside a chat.
 * Accepting one creates a gig order awaiting its 50% deposit (pay it with
 * utils/gigOrderCheckout.js, same as a package order). Every caller shows its
 * own contextual toast, so the global auto-toast is suppressed.
 */
export const offersAPI = {
  // Freelancer: { conversationId, gigId?, title, description, price, deliveryDays, revisions }
  create: (data) =>
    client.post('/offers', data, { suppressErrorToast: true }),

  // Client: requirements = { description?, referenceLinks? } (optional notes)
  accept: (offerId, requirements) =>
    client.post(`/offers/${offerId}/accept`, requirements ? { requirements } : {}, { suppressErrorToast: true }),

  decline: (offerId) =>
    client.post(`/offers/${offerId}/decline`, undefined, { suppressErrorToast: true }),

  // Freelancer takes back an offer the client hasn't answered yet
  withdraw: (offerId) =>
    client.post(`/offers/${offerId}/withdraw`, undefined, { suppressErrorToast: true }),
};
