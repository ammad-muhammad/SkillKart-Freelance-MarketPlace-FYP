import client from './client';

export const matchmakingAPI = {
    /**
     * POST /matchmaking – send project data inline and get ranked freelancers.
     * @param {object} projectData – { title, description, skills, budget, timeline }
     */
    matchByProject: (projectData) => client.post('/matchmaking', projectData),

    /**
     * GET /matchmaking?projectId=xxx – match by an already-saved project id.
     * @param {string} projectId
     */
    matchById: (projectId) => client.get('/matchmaking', { params: { projectId } }),
};
