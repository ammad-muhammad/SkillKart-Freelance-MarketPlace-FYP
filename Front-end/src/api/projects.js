import client from './client';

export const projectsAPI = {
    /** POST /projects – submit a new project/job posting */
    create: (projectData) => client.post('/projects', projectData),

    /** GET /projects?page=&limit=&status= */
    list: (params) => client.get('/projects', { params }),

    /** GET /projects/:id */
    getById: (id) => client.get(`/projects/${id}`),

    /** PUT /projects/:id */
    update: (id, data) => client.put(`/projects/${id}`, data),

    /** DELETE /projects/:id */
    remove: (id) => client.delete(`/projects/${id}`),
};
