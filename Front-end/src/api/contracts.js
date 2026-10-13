import client from './client';

export const contractsAPI = {
  // Get freelancer's own contracts
  getMyContracts: (params) => 
    client.get('/contracts/my', { params }),

  // Get a specific contract by ID
  getContractById: (id) => 
    client.get(`/contracts/${id}`),

  // Request contract cancellation (dispute)
  requestCancellation: (id, reason) => 
    client.post(`/contracts/${id}/cancel`, { reason }),

  // Hourly Contract Workflows. Callers (ClientProjects.jsx, FreelancerWork.jsx)
  // already show their own contextual toast — suppress the global auto-toast
  // so failures (e.g. "No milestone found for this contract") don't double-toast.
  requestEnd: (id, reason, additionalDetails) => client.post(`/contracts/${id}/end-request`, { reason, additionalDetails }, { suppressErrorToast: true }),
  respondEnd: (id, action) => client.post(`/contracts/${id}/end-respond`, { action }, { suppressErrorToast: true }),
  raiseDispute: (id, reason, description) => client.post(`/contracts/${id}/dispute`, { reason, description }, { suppressErrorToast: true }),

  // End contract manually (for hourly)
  endContract: (id) =>
    client.post(`/contracts/${id}/end`, undefined, { suppressErrorToast: true }),

  // Get contract history
  getContractHistory: (id, params) => 
    client.get(`/contracts/${id}/history`, { params })
};
