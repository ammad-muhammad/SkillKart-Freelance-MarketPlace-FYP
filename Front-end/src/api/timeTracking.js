import client from './client';

export const timeTrackingAPI = {
  // Caller (FreelancerWork.jsx toggleTimer) already shows its own toast —
  // suppress the global auto-toast to avoid double-toasting.
  startTimer: (contractId) =>
    client.post(`/time-tracking/${contractId}/start`, undefined, { suppressErrorToast: true }),

  stopTimer: (contractId, data) =>
    client.post(`/time-tracking/${contractId}/stop`, data, { suppressErrorToast: true }),

  addManualLog: (contractId, data) =>
    client.post(`/time-tracking/${contractId}/manual`, data),

  getContractLogs: (contractId, params) =>
    client.get(`/time-tracking/${contractId}`, { params })
};
