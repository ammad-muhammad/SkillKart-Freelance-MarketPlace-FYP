import client from './client';

export const proposalsAPI = {
  // Submit a new proposal
  submitProposal: (proposalData) =>
    client.post('/proposals', proposalData),

  // AI-draft a cover letter for a job (freelancer only)
  draftProposal: (jobId) =>
    client.post('/proposals/ai/draft', { jobId }),

  // Read-only precheck: would submitProposal/updateProposal's skill gate let
  // this freelancer through for this job right now? Lets JobDetails.jsx gate
  // opening the Apply/Resubmit modal itself instead of writing a whole
  // proposal only to hit the same 403 on submit.
  checkEligibility: (jobId) =>
    client.get(`/proposals/eligibility/${jobId}`),

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
  // `expectedPrice` is the price the client saw when they opened the Accept
  // dialog — the server rejects if the live proposal price has since moved
  // (e.g. the freelancer edited their pending bid in the meantime).
  acceptProposal: (id, message, milestones, expectedPrice) =>
    client.post(`/proposals/${id}/accept`, {
      message,
      ...(milestones ? { milestones } : {}),
      ...(expectedPrice !== undefined && expectedPrice !== null ? { expectedPrice } : {})
    }, { suppressErrorToast: true }),

  // Reject proposal (Client only). `allowResubmit` lets the freelancer edit
  // and resend this same proposal instead of it being a dead end.
  rejectProposal: (id, reason, allowResubmit) =>
    client.post(`/proposals/${id}/reject`, { reason, allowResubmit }, { suppressErrorToast: true }),

  // Withdraw proposal (Freelancer only)
  withdrawProposal: (id) => 
    client.post(`/proposals/${id}/withdraw`),

  // Delete proposal
  deleteProposal: (id) => 
    client.delete(`/proposals/${id}`)
};