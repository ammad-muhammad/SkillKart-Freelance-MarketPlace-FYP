import client from './client';

// AI generation can legitimately take a while — especially when the backend
// falls back to a LOCAL model (Ollama) after cloud providers are rate-limited.
// Override the default 30s axios timeout so these requests aren't cut short.
const AI_TIMEOUT = 120000;

/**
 * Public AI tools backed by the real Gemini→Groq→Claude→Ollama provider router.
 */
export const aiAPI = {
  // Conversational Buddy assistant. history: [{ role:'user'|'assistant', content }]
  buddy: (message, history = []) =>
    client.post('/ai/buddy', { message, history }, { timeout: AI_TIMEOUT }),

  // AI budget estimate for a project brief.
  estimateCost: (project) =>
    client.post('/ai/cost-estimate', project, { timeout: AI_TIMEOUT }),

  // Infer category + skills + budget from a free-text description (auto-fill).
  suggestBrief: (description, title = '') =>
    client.post('/ai/suggest-brief', { description, title }, { timeout: AI_TIMEOUT }),

  // Public (no-auth) skill validation + related suggestions, for type-ahead in
  // free tools like the Cost Estimator. Mirrors skillsAPI.validate but works
  // for logged-out visitors.
  validateSkill: (input) =>
    client.post('/ai/validate-skill', { input }, { timeout: AI_TIMEOUT }),
};
