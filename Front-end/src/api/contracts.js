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

  // Hourly Contract Workflows
  requestEnd: (id, reason, additionalDetails) => client.post(`/contracts/${id}/end-request`, { reason, additionalDetails }),
  respondEnd: (id, action) => client.post(`/contracts/${id}/end-respond`, { action }),
  raiseDispute: (id, reason, description) => client.post(`/contracts/${id}/dispute`, { reason, description }),

  // End contract manually (for hourly)
  endContract: (id) =>
    client.post(`/contracts/${id}/end`),

  // Get contract history
  getContractHistory: (id, params) => 
    client.get(`/contracts/${id}/history`, { params })
};
