import client from './client';

export const skillsAPI = {
  // Fires on every keystroke in TagInput → suppress the global error toast.
  validate: (input) => client.post('/skills/validate', { input }, { suppressErrorToast: true }),
};
