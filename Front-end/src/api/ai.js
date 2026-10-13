import client from './client';

// AI generation can legitimately take a while — especially when the backend
// falls back to a LOCAL model (Ollama) after cloud providers are rate-limited.
// Override the default 30s axios timeout so these requests aren't cut short.
const AI_TIMEOUT = 120000;

/**
 * Public AI tools backed by the real Gemini→DeepSeek→Qwen→Groq→Claude→Ollama provider router.
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
  // free tools like the Cost Estimator. Fires on every keystroke → suppress the
  // global error toast (the input handles failures inline/silently).
  validateSkill: (input) =>
    client.post('/ai/validate-skill', { input }, { timeout: AI_TIMEOUT, suppressErrorToast: true }),
    
  // Semantic skill search: given a broad query, returns a list of specific skills
  expandSearchSkills: (query) =>
    client.post('/ai/expand-skills', { query }, { timeout: AI_TIMEOUT, suppressErrorToast: true }),

  // Generic "generate with AI" for a free-text field. `context` is a flat
  // object of whatever's already on the form (title, category, skills, tier,
  // name, ...); `existingText` seeds an expand/polish instead of a from-scratch draft.
  generateText: (fieldLabel, context = {}, existingText = '') =>
    client.post('/ai/generate-text', { fieldLabel, context, existingText }, { timeout: AI_TIMEOUT }),
};
