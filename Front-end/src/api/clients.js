import client from './client';

export const clientsAPI = {
  getProfile: () => client.get('/clients/profile/me'),
  updateProfile: (profileData) => client.put('/clients/profile/me', profileData),
  submitVerification: (documents) => client.post('/clients/verification/submit', { documents })
};