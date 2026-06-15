import client from './client';

export const testimonialsAPI = {
  // Freelancer: submit/update their own success story
  submit: (text, rating = 5) => client.post('/testimonials', { text, rating }),

  // Freelancer: get their own testimonial (or null)
  getMine: () => client.get('/testimonials/me'),

  // Freelancer: delete their own testimonial
  deleteMine: () => client.delete('/testimonials/me'),

  // Public: approved testimonials for the homepage
  getPublic: (limit = 6) => client.get('/public/testimonials', { params: { limit } }),
};
