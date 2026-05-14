import client from './client';

export const skillTestAPI = {
  // Generate a new skill test
  generateTest: (force = false) => 
    client.get(`/skill-tests/generate${force ? '?force=true' : ''}`),

  // Submit test answers
  submitTest: (answers) => 
    client.post('/skill-tests/submit', { answers }),

  // Get test history
  getHistory: () => 
    client.get('/skill-tests/history')
};
