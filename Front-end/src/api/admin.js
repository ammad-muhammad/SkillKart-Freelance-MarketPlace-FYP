import client from './client';

export const adminAPI = {
  // Get all nodes (paginated/filtered)
  getNodes: (params) => client.get('/admin/taxonomy/nodes', { params }),

  // Create node
  createNode: (data) => client.post('/admin/taxonomy/nodes', data),

  // Update node
  updateNode: (id, data) => client.patch(`/admin/taxonomy/nodes/${id}`, data),

  // Connect nodes (create relationship)
  createRelationship: (data) => client.post('/admin/taxonomy/relationships', data),

  // Disconnect nodes (delete relationship)
  deleteRelationship: (data) => client.delete('/admin/taxonomy/relationships', { data }),

  // Merge duplicate nodes
  mergeNodes: (data) => client.post('/admin/taxonomy/merge', data),

  // Get full skill graph details (for visualization / analytics)
  getFullGraph: () => client.get('/skills/graph'),

  // Get AI proposals review queue list
  getProposals: (params) => client.get('/admin/taxonomy/proposals', { params }),

  // Approve/reject AI proposal
  reviewProposal: (id, data) => client.post(`/admin/taxonomy/proposals/${id}/review`, data),
};
