import client from './client';

/**
 * Public, unauthenticated data: real platform stats + taxonomy with live counts.
 */
export const publicAPI = {
  // Real platform-wide metrics (freelancers, gigs, jobs, etc.)
  getStats: () => client.get('/public/stats'),

  // Categories with real active-gig counts
  getCategories: () => client.get('/public/categories'),

  // Real aggregates for one category (by slug)
  getCategoryStats: (slug) => client.get(`/public/categories/${slug}/stats`),

  // Real aggregates for one skill (by name)
  getSkillStats: (skillName) => client.get(`/public/skills/${encodeURIComponent(skillName)}/stats`),

  // Top skills by real active-gig demand
  getTrending: (limit = 9) => client.get('/public/trending', { params: { limit } }),

  // Public freelancer search (reused for category/skill carousels)
  searchFreelancers: (params) => client.get('/public/freelancers/search', { params }),

  // Real top-rated freelancers (for the "success stories" section)
  getTopFreelancers: (limit = 6) => client.get('/public/top-freelancers', { params: { limit } }),

  // Submit the public contact form
  submitContact: (payload) => client.post('/public/contact', payload),

  // Submit the public newsletter subscription
  subscribeNewsletter: (email) => client.post('/public/newsletter', { email }),
};
