import client from './client';

export const freelancersAPI = {
  search: (params) => client.get('/freelancers/search', { params }),
  getLocations: () => client.get('/freelancers/locations'),
  getById: (id) => client.get(`/freelancers/${id}`),
  getProfile: () => client.get('/freelancers/profile/me'),
  checkUsername: (username) =>
    client.get(`/freelancers/check-username?username=${encodeURIComponent(username)}`),
  // These callers (FreelancerContext) already show their own contextual
  // toast — suppress the global auto-toast to avoid double-toasting.
  updateProfile: (profileData) => client.put('/freelancers/profile/me', profileData, { suppressErrorToast: true }),
  addPortfolio: (item) => client.post('/freelancers/portfolio', item, { suppressErrorToast: true }),
  updatePortfolio: (itemId, item) => client.put(`/freelancers/portfolio/${itemId}`, item, { suppressErrorToast: true }),
  deletePortfolio: (itemId) => client.delete(`/freelancers/portfolio/${itemId}`, { suppressErrorToast: true }),
  parseCV: (formData) => client.post('/freelancers/parse-cv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  submitProfile: (data) => client.post('/freelancers/profile/submit', data),
  uploadPortfolioMedia: (formData) => client.post('/freelancers/portfolio/media', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadAvatar: (formData) => client.post('/freelancers/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getSavedJobs: () => client.get('/freelancers/saved-jobs'),
  toggleSavedJob: (jobId) => client.post(`/freelancers/saved-jobs/${jobId}`, undefined, { suppressErrorToast: true })
};