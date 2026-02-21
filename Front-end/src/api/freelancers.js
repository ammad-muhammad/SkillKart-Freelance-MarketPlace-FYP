import client from './client';

export const freelancersAPI = {
  search: (params) => client.get('/freelancers/search', { params }),
  getById: (id) => client.get(`/freelancers/${id}`),
  getProfile: () => client.get('/freelancers/profile/me'),
  updateProfile: (profileData) => client.put('/freelancers/profile/me', profileData),
  addPortfolio: (item) => client.post('/freelancers/portfolio', item),
  updatePortfolio: (itemId, item) => client.put(`/freelancers/portfolio/${itemId}`, item),
  deletePortfolio: (itemId) => client.delete(`/freelancers/portfolio/${itemId}`)
};