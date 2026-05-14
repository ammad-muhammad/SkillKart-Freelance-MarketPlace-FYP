import client from './client';

export const skillTestAPI = {
  // Generate a new skill test (mixed baseline or skill-specific)
  generateTest: (skill = null, force = false) => {
    const params = new URLSearchParams();
    if (skill) params.append('skill', skill);
    if (force) params.append('force', 'true');
    return client.get(`/skill-tests/generate?${params.toString()}`);
  },

  // Submit test answers
  submitTest: (answers) => 
    client.post('/skill-tests/submit', { answers }),

  // Get test history
  getHistory: () => 
    client.get('/skill-tests/history')
};
