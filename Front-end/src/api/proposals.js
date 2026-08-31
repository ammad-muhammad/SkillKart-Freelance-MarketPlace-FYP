import client from './client';

export const proposalsAPI = {
  // Submit a new proposal
  submitProposal: (proposalData) =>
    client.post('/proposals', proposalData),

  // AI-draft a cover letter for a job (freelancer only)
  draftProposal: (jobId) =>
    client.post('/proposals/ai/draft', { jobId }),

  // List proposals (for clients or freelancers)
  listProposals: (params) => 
    client.get('/proposals', { params }),

  // Get proposal details
  getProposal: (id) => 
    client.get(`/proposals/${id}`),

  // Update proposal
  updateProposal: (id, proposalData) => 
    client.put(`/proposals/${id}`, proposalData),

  // Accept proposal (Client only). `milestones`, if provided, is an array of
  // { title, amount } that must sum exactly to the proposal's price — the
  // server locks 100% of milestone 1 (fixed) or one week's estimate (hourly)
  // in escrow immediately as part of this call. Omit it for the default
  // single "Full Project" milestone. Caller (ReviewProposals.jsx) already
  // shows its own toast / guided top-up modal — suppress the global
  // auto-toast to avoid double-toasting.
  acceptProposal: (id, message, milestones) =>
    client.post(`/proposals/${id}/accept`, { message, ...(milestones ? { milestones } : {}) }, { suppressErrorToast: true }),

  // Reject proposal (Client only)
  rejectProposal: (id, reason) =>
    client.post(`/proposals/${id}/reject`, { reason }, { suppressErrorToast: true }),

  // Withdraw proposal (Freelancer only)
  withdrawProposal: (id) => 
    client.post(`/proposals/${id}/withdraw`),

  // Delete proposal
  deleteProposal: (id) => 
    client.delete(`/proposals/${id}`)
};