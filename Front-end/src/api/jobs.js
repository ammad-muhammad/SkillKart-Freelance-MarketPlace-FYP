import client from './client';

export const jobsAPI = {
  // Create a new job post
  createJob: (jobData) => 
    client.post('/jobs', jobData),

  // List public marketplace jobs
  listJobs: (params) => 
    client.get('/jobs', { params }),

  // Get client's own projects
  getMyProjects: (params) =>
    client.get('/jobs/my-projects', { params }),



  // Get job by ID
  getJobById: (id) => 
    client.get(`/jobs/${id}`),

  // Search jobs
  searchJobs: (params) =>
    client.get('/jobs/search', { params }),

  // Update job
  updateJob: (id, jobData) => 
    client.put(`/jobs/${id}`, jobData),

  // Close job
  closeJob: (id, reason) => 
    client.post(`/jobs/${id}/close`, { reason }),

  // Delete job
  deleteJob: (id) => 
    client.delete(`/jobs/${id}`),

  recommendCategory: (data) =>
    client.post('/jobs/ai/recommend-category', data),



  // Leave a review for a completed job
  reviewJob: (id, data) =>
    client.post(`/jobs/${id}/review`, data),
};