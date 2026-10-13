import client from './client';

export const reportsAPI = {
  // File a report about a profile, job, gig or review. It appears in the admin
  // panel's Reports queue. data: { itemType, itemId, category, description }
  create: (data) =>
    client.post('/reports', data, { suppressErrorToast: true }),
};
