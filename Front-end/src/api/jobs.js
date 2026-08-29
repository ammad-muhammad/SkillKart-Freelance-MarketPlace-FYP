import client from './client';

export const jobsAPI = {
  // Create a new job post. Callers (PostProject.jsx, ClientContext.addProject)
  // already show their own contextual error toast (mapping field errors,
  // wallet-balance messages, etc.) — suppress the global auto-toast so
  // failures (e.g. insufficient wallet balance) don't double-toast.
  createJob: (jobData) =>
    client.post('/jobs', jobData, { suppressErrorToast: true }),

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

  // Update job. Caller (ClientContext.updateProject) already shows its own
  // error toast — suppress the global auto-toast to avoid double-toasting
  // (e.g. the wallet-balance gate on publishing a draft).
  updateJob: (id, jobData) =>
    client.put(`/jobs/${id}`, jobData, { suppressErrorToast: true }),

  // Close job
  closeJob: (id, reason) => 
    client.post(`/jobs/${id}/close`, { reason }),

  // Delete job
  deleteJob: (id) => 
    client.delete(`/jobs/${id}`),

  recommendCategory: (data) =>
    client.post('/jobs/ai/recommend-category', data),

  recommendSubcategory: (data) =>
    client.post('/jobs/ai/recommend-subcategory', data),



  // Leave a review for a completed job
  reviewJob: (id, data) =>
    client.post(`/jobs/${id}/review`, data),
};