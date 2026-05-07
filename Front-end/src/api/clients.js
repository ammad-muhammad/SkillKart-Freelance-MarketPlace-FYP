import client from './client';

export const clientsAPI = {
  getProfile: () => client.get('/clients/profile/me'),
  updateProfile: (profileData) => client.put('/clients/profile/me', profileData),
  submitVerification: (documents) => client.post('/clients/verification/submit', { documents }),
  
  // Onboarding
  getOnboardingDraft: () => client.get('/clients/onboarding/draft'),
  saveOnboardingDraft: (data) => client.post('/clients/onboarding/draft', data),
  submitOnboarding: (data) => client.post('/clients/onboarding/submit', data)
};