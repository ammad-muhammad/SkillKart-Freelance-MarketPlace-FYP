import client from './client';

export const proposalsAPI = {
  list: (params) => client.get('/proposals', { params }),
  getById: (id) => client.get(`/proposals/${id}`),
  create: (proposalData) => client.post('/proposals', proposalData),
  update: (id, proposalData) => client.put(`/proposals/${id}`, proposalData),
  accept: (id, message) => client.post(`/proposals/${id}/accept`, { message }),
  reject: (id, reason) => client.post(`/proposals/${id}/reject`, { reason }),
  withdraw: (id) => client.post(`/proposals/${id}/withdraw`),
  delete: (id) => client.delete(`/proposals/${id}`)
};