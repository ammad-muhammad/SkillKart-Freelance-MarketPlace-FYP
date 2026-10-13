import client from './client';

export const deliveriesAPI = {
  // Callers (FreelancerWork.jsx, ClientProjects.jsx) already show their own
  // contextual toast — suppress the global auto-toast to avoid double-toasting.
  // Freelancer submits delivery
  submitDelivery: (contractId, payload) =>
    client.post(`/deliveries/${contractId}/submit`, payload, { suppressErrorToast: true }),

  // Client reviews delivery (accept / request_revision)
  reviewDelivery: (deliveryId, payload) =>
    client.post(`/deliveries/${deliveryId}/review`, payload, { suppressErrorToast: true }),

  // Get deliveries for a contract
  getContractDeliveries: (contractId) =>
    client.get(`/deliveries/${contractId}`)
};
