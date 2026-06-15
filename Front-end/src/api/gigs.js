import client from './client';

export const gigsAPI = {
  // Create a new gig
  createGig: (gigData) => 
    client.post('/gigs', gigData),

  // List public gigs (Marketplace) — supports category, subcategory, skill, q,
  // minPrice, maxPrice, minRating, sort, page, limit
  listGigs: (params) =>
    client.get('/gigs', { params }),

  // Get a single public gig by id
  getGig: (id) =>
    client.get(`/gigs/${id}`),

  // List my own gigs (Freelancer Dashboard)
  listMyGigs: (params) => 
    client.get('/gigs/my-gigs', { params }),

  // Update gig
  updateGig: (id, gigData) => 
    client.put(`/gigs/${id}`, gigData),

  // Delete gig
  deleteGig: (id) => 
    client.delete(`/gigs/${id}`),

  // Toggle gig status
  toggleStatus: (id) => 
    client.patch(`/gigs/${id}/status`),

  // Upload gig banner
  uploadBanner: (file) => {
    const formData = new FormData();
    formData.append('banner', file);
    return client.post('/gigs/upload/banner', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};
