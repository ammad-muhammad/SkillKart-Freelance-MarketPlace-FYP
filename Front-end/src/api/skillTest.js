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

  // The single proctoring knob (SKILL_TEST_PROCTOR_STRICTNESS, 0–1) — the
  // page derives every camera/tab-switch threshold from it.
  getProctoringConfig: () =>
    client.get('/skill-tests/proctoring-config'),

  // Submit test answers, along with any browser/camera proctoring strikes
  // logged during the attempt and the live movement counters
  // ({ movements, cameraStrikes, browserStrikes }).
  submitTest: (answers, violations = [], proctoring = null) =>
    client.post('/skill-tests/submit', { answers, violations, proctoring }, { timeout: SKILL_TEST_TIMEOUT }),

  // Get test history
  getHistory: () => 
    client.get('/skill-tests/history')
};
