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

  // End contract manually (for hourly)
  endContract: (id) =>
    client.post(`/contracts/${id}/end`),

  // Get contract history
  getContractHistory: (id, params) => 
    client.get(`/contracts/${id}/history`, { params })
};
