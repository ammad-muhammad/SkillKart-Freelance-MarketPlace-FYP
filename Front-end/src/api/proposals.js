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

  // Accept proposal (Client only)
  acceptProposal: (id, message) => 
    client.post(`/proposals/${id}/accept`, { message }),

  // Reject proposal (Client only)
  rejectProposal: (id, reason) => 
    client.post(`/proposals/${id}/reject`, { reason }),

  // Withdraw proposal (Freelancer only)
  withdrawProposal: (id) => 
    client.post(`/proposals/${id}/withdraw`),

  // Delete proposal
  deleteProposal: (id) => 
    client.delete(`/proposals/${id}`)
};