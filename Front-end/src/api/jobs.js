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

  // Delete job. Caller (ClientContext.deleteProject) already shows its own
  // toast — suppress the global auto-toast to avoid double-toasting.
  deleteJob: (id) =>
    client.delete(`/jobs/${id}`, { suppressErrorToast: true }),

  // Callers (PostProject.jsx) already show their own toast — suppress the
  // global auto-toast to avoid double-toasting.
  recommendCategory: (data) =>
    client.post('/jobs/ai/recommend-category', data, { suppressErrorToast: true }),

  recommendSubcategory: (data) =>
    client.post('/jobs/ai/recommend-subcategory', data, { suppressErrorToast: true }),



  // Leave a review for a completed job
  reviewJob: (id, data) =>
    client.post(`/jobs/${id}/review`, data),

  // Jobs the freelancer is hired on (both custom-project contracts and gig
  // orders) — pass { source: 'gig' } to fetch just gig orders.
  getMyHiredJobs: (params) =>
    client.get('/jobs/my-contracts', { params }),

  // Gig order delivery lifecycle (no Contract/Milestone — legacy 50/50 flow).
  submitGigDelivery: (id, data) =>
    client.post(`/jobs/${id}/gig-delivery`, data),

  // Matches the already-wired ClientContext.requestRevision(id, note) —
  // that function existed with no live backend counterpart until now.
  requestRevision: (id, note) =>
    client.post(`/jobs/${id}/gig-revision`, { note }),
};