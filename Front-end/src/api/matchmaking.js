import client from './client';

export const matchmakingAPI = {
    /**
     * POST /matchmaking – send project data inline and get ranked freelancers.
     * This is a deterministic, code-driven scoring engine — no AI provider is
     * called. AiMatchmaking.jsx already shows its own inline error state, so
     * suppress the global auto-toast to avoid double-messaging on failure.
     * @param {object} projectData – { title, description, skills, budget, timeline }
     */
    matchByProject: (projectData) => client.post('/matchmaking', projectData, { suppressErrorToast: true }),

    /**
     * GET /matchmaking?projectId=xxx – match by an already-saved project id.
     * @param {string} projectId
     */
    matchById: (projectId) => client.get('/matchmaking', { params: { projectId }, suppressErrorToast: true }),
};
