import client from './client';

export const skillTestAPI = {
  // Generate a new skill test (mixed baseline or skill-specific)
  generateTest: (skill = null, force = false) => {
    const params = new URLSearchParams();
    if (skill) params.append('skill', skill);
    if (force) params.append('force', 'true');
    return client.get(`/skill-tests/generate?${params.toString()}`);
  },

  // Submit test answers, along with any browser/camera proctoring violations logged during the attempt
  submitTest: (answers, violations = []) =>
    client.post('/skill-tests/submit', { answers, violations }),

  // Get test history
  getHistory: () => 
    client.get('/skill-tests/history')
};
