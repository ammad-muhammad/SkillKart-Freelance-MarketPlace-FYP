import client from './client';

export const jobsAPI = {
  list: (params) => client.get('/jobs', { params }),
  search: (query) => client.get('/jobs/search', { params: { q: query } }),
  getById: (id) => client.get(`/jobs/${id}`),
  create: (jobData) => client.post('/jobs', jobData),
  update: (id, jobData) => client.put(`/jobs/${id}`, jobData),
  close: (id) => client.post(`/jobs/${id}/close`),
  delete: (id) => client.delete(`/jobs/${id}`)
};