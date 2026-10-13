import client from './client';

// Same multi-provider AI router chain (Gemini→DeepSeek→...→Ollama) every other
// AI call site gets 120s for — the default 30s axios timeout was cutting off
// the one-shot, high-stakes proctored test before a cloud→local fallback
// cascade could finish, silently failing an attempt that may have succeeded
// server-side. See Front-end/src/api/ai.js's AI_TIMEOUT.
const SKILL_TEST_TIMEOUT = 120000;

export const skillTestAPI = {
  // Generate a new skill test (mixed baseline or skill-specific). `level` is
  // the one the freelancer picked — 'easy' | 'intermediate' | 'expert' — and
  // decides the question count and difficulty on the server.
  generateTest: (skill = null, force = false, level = null) => {
    const params = new URLSearchParams();
    if (skill) params.append('skill', skill);
    if (force) params.append('force', 'true');
    if (level) params.append('level', level);
    return client.get(`/skill-tests/generate?${params.toString()}`, { timeout: SKILL_TEST_TIMEOUT });
  },

  // The single proctoring knob (SKILL_TEST_PROCTOR_STRICTNESS, 0–1) — 0 turns
  // proctoring off, otherwise it sets the tab-switch strike limit.
  getProctoringConfig: () =>
    client.get('/skill-tests/proctoring-config'),

  // Submit test answers, along with any browser (tab / blur / full-screen)
  // violations logged during the attempt and the tab strike total
  // ({ browserStrikes }). Older app builds also send { movements, cameraStrikes }.
  submitTest: (answers, violations = [], proctoring = null) =>
    client.post('/skill-tests/submit', { answers, violations, proctoring }, { timeout: SKILL_TEST_TIMEOUT }),

  // Get test history
  getHistory: () => 
    client.get('/skill-tests/history')
};
