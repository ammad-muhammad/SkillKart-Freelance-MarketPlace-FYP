import client from './client';

export const timeTrackingAPI = {
  startTimer: (contractId) => 
    client.post(`/time-tracking/${contractId}/start`),

  stopTimer: (contractId, data) => 
    client.post(`/time-tracking/${contractId}/stop`, data),

  addManualLog: (contractId, data) =>
    client.post(`/time-tracking/${contractId}/manual`, data),

  getContractLogs: (contractId, params) =>
    client.get(`/time-tracking/${contractId}`, { params })
};
