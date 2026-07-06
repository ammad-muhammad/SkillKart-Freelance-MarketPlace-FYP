import client from './client';

export const deliveriesAPI = {
  // Freelancer submits delivery
  submitDelivery: (contractId, payload) => 
    client.post(`/deliveries/${contractId}/submit`, payload),

  // Client reviews delivery (accept / request_revision)
  reviewDelivery: (deliveryId, payload) => 
    client.post(`/deliveries/${deliveryId}/review`, payload),

  // Get deliveries for a contract
  getContractDeliveries: (contractId) =>
    client.get(`/deliveries/${contractId}`)
};
