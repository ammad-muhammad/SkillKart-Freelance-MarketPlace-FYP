import client from './client';

export const skillTestAPI = {
  // Generate a new skill test
  generateTest: () => 
    client.get('/skill-tests/generate'),

  // Submit test answers
  submitTest: (answers) => 
    client.post('/skill-tests/submit', { answers }),

  // Save partial progress
  saveProgress: (answers) =>
    client.post('/skill-tests/save-progress', { answers }),

  // Get test history
  getHistory: () => 
    client.get('/skill-tests/history')
};
