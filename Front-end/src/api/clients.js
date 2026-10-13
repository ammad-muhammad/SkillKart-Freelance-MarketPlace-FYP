import client from './client';

export const clientsAPI = {
  // Check if a username is already taken
  checkUsername: (username) =>
    client.get(`/clients/check-username?username=${encodeURIComponent(username)}`),
  getProfile: () => client.get('/clients/profile/me'),
  // Caller (ClientContext.saveProfile) already shows its own contextual toast —
  // suppress the global auto-toast to avoid double-toasting.
  updateProfile: (profileData) => client.put('/clients/profile/me', profileData, { suppressErrorToast: true }),
  submitVerification: (documents) => client.post('/clients/verification/submit', { documents }),
  
  // Onboarding
  getOnboardingDraft: () => client.get('/clients/onboarding/draft'),
  saveOnboardingDraft: (data) => client.post('/clients/onboarding/draft', data),
  submitOnboarding: (data) => client.post('/clients/onboarding/submit', data),

  // Avatar upload
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return client.post('/clients/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Company logo upload
  uploadCompanyLogo: (file) => {
    const formData = new FormData();
    formData.append('logo', file);
    return client.post('/clients/upload/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Saved freelancers. Caller (ClientContext) already shows its own toast —
  // suppress the global auto-toast to avoid double-toasting.
  toggleSavedFreelancer: (freelancerId) =>
    client.post('/clients/saved-freelancers', { freelancerId }, { suppressErrorToast: true }),

  getSavedFreelancers: () => 
    client.get('/clients/saved-freelancers'),

  // Has multiple callers with inconsistent local error handling (ClientProfile.jsx
  // handles it locally, ClientOnboarding.jsx's fetchAISuggestions doesn't) — leave
  // the global auto-toast enabled so the latter isn't left with zero feedback.
  recommendIndustry: (data) =>
    client.post('/clients/ai/recommend-industry', data),

  getPublicById: (id) => client.get(`/public/clients/${id}`)
};