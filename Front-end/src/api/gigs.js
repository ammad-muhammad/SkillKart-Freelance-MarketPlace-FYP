import client from './client';

export const gigsAPI = {
  // Create/update/delete/toggle callers (FreelancerContext) already show their
  // own contextual toast — suppress the global auto-toast to avoid double-toasting.
  createGig: (gigData) =>
    client.post('/gigs', gigData, { suppressErrorToast: true }),

  // List public gigs (Marketplace) — supports category, subcategory, skill, q,
  // minPrice, maxPrice, minRating, sort, page, limit
  listGigs: (params) =>
    client.get('/gigs', { params }),

  // Get a single public gig by id
  getGig: (id) =>
    client.get(`/gigs/${id}`),

  // Order a gig tier (client) → creates a job that enters the escrow flow.
  // tier: 'basic' | 'standard' | 'premium'
  orderGig: (id, tier) =>
    client.post(`/gigs/${id}/order`, { tier }),

  // List my own gigs (Freelancer Dashboard)
  listMyGigs: (params) => 
    client.get('/gigs/my-gigs', { params }),

  // Update gig
  updateGig: (id, gigData) =>
    client.put(`/gigs/${id}`, gigData, { suppressErrorToast: true }),

  // Delete gig
  deleteGig: (id) =>
    client.delete(`/gigs/${id}`, { suppressErrorToast: true }),

  // Toggle gig status
  toggleStatus: (id) =>
    client.patch(`/gigs/${id}/status`, undefined, { suppressErrorToast: true }),

  // Upload gig banner
  uploadBanner: (file) => {
    const formData = new FormData();
    formData.append('banner', file);
    return client.post('/gigs/upload/banner', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};
