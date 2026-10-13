import client from './client';

export const reviewsAPI = {
  // Get reviews for a user
  getReviews: (params) =>
    client.get('/reviews', { params }),

  // Create a review
  createReview: (data) =>
    client.post('/reviews', data),

  // Update a review
  updateReview: (id, data) =>
    client.put(`/reviews/${id}`, data),

  // Delete a review
  deleteReview: (id) =>
    client.delete(`/reviews/${id}`),
};
