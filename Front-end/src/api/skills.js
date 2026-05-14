import client from './client';

export const skillsAPI = {
  validate: (input) => client.post('/skills/validate', { input }),
};
