import client from './client';

export const freelancersAPI = {
  search: (params) => client.get('/freelancers/search', { params }),
  getById: (id) => client.get(`/freelancers/${id}`),
  getProfile: () => client.get('/freelancers/profile/me'),
  updateProfile: (profileData) => client.put('/freelancers/profile/me', profileData),
  addPortfolio: (item) => client.post('/freelancers/portfolio', item),
  updatePortfolio: (itemId, item) => client.put(`/freelancers/portfolio/${itemId}`, item),
  deletePortfolio: (itemId) => client.delete(`/freelancers/portfolio/${itemId}`),
  parseCV: (formData) => client.post('/freelancers/parse-cv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  submitProfile: (data) => client.post('/freelancers/profile/submit', data),
  getSavedJobs: () => client.get('/freelancers/saved-jobs'),
  toggleSavedJob: (jobId) => client.post(`/freelancers/saved-jobs/${jobId}`)
};