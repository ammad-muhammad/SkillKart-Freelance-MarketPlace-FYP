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

  // Get the freelancer's contracts (hired jobs + escrow status)
  getMyContracts: (params) =>
    client.get('/jobs/my-contracts', { params }),

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

  // ── Delivery lifecycle ──
  // Freelancer submits work (in-progress → delivered)
  submitDelivery: (id, payload) =>
    client.post(`/jobs/${id}/deliver`, payload),

  // Client accepts delivery (delivered → completed)
  acceptDelivery: (id) =>
    client.post(`/jobs/${id}/accept-delivery`),

  // Client requests a revision (delivered → in-progress)
  requestRevision: (id, note) =>
    client.post(`/jobs/${id}/request-revision`, { note }),

  // Leave a review for a completed job
  reviewJob: (id, data) =>
    client.post(`/jobs/${id}/review`, data),
};