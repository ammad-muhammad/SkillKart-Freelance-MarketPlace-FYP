import client from './client';

// Same multi-provider AI router chain (Gemini→DeepSeek→...→Ollama) every other
// AI call site gets 120s for — the default 30s axios timeout was cutting off
// the one-shot, high-stakes proctored test before a cloud→local fallback
// cascade could finish, silently failing an attempt that may have succeeded
// server-side. See Front-end/src/api/ai.js's AI_TIMEOUT.
const SKILL_TEST_TIMEOUT = 120000;

export const skillTestAPI = {
  // Generate a new skill test (mixed baseline or skill-specific)
  generateTest: (skill = null, force = false) => {
    const params = new URLSearchParams();
    if (skill) params.append('skill', skill);
    if (force) params.append('force', 'true');
    return client.get(`/skill-tests/generate?${params.toString()}`, { timeout: SKILL_TEST_TIMEOUT });
  },

  // Submit test answers, along with any browser/camera proctoring violations logged during the attempt
  submitTest: (answers, violations = []) =>
    client.post('/skill-tests/submit', { answers, violations }, { timeout: SKILL_TEST_TIMEOUT }),

  // Get test history
  getHistory: () => 
    client.get('/skill-tests/history')
};
