import client from './client';

export const gigsAPI = {
  // Create a new gig
  createGig: (gigData) => 
    client.post('/gigs', gigData),

  // List public gigs (Marketplace)
  listGigs: (params) => 
    client.get('/gigs', { params }),

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
