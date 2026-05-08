import client from './client';

export const jobsAPI = {
  // Create a new job post
  createJob: (jobData) => 
    client.post('/jobs', jobData),

  // List all jobs (with optional filters)
  listJobs: (params) => 
    client.get('/jobs', { params }),

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
    client.delete(`/jobs/${id}`)
};