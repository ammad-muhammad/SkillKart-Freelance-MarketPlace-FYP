import client from './client';

export const clientsAPI = {
  getProfile: () => client.get('/clients/profile/me'),
  updateProfile: (profileData) => client.put('/clients/profile/me', profileData),
  submitVerification: (documents) => client.post('/clients/verification/submit', { documents }),
  
  // Onboarding
  getOnboardingDraft: () => client.get('/clients/onboarding/draft'),
  saveOnboardingDraft: (data) => client.post('/clients/onboarding/draft', data),
  submitOnboarding: (data) => client.post('/clients/onboarding/submit', data),

  // Avatar upload
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return client.post('/clients/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Saved freelancers
  toggleSavedFreelancer: (freelancerId) => 
    client.post('/clients/saved-freelancers', { freelancerId }),

  getSavedFreelancers: () => 
    client.get('/clients/saved-freelancers')
};