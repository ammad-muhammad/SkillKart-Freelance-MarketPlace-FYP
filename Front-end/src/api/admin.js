import client from './client';

export const adminAPI = {
  // Get all nodes (paginated/filtered)
  getNodes: (params) => client.get('/admin/taxonomy/nodes', { params }),

  // Caller (TaxonomyAdmin.jsx) already shows its own contextual toast —
  // suppress the global auto-toast to avoid double-toasting.
  // Create node
  createNode: (data) => client.post('/admin/taxonomy/nodes', data, { suppressErrorToast: true }),

  // Update node
  updateNode: (id, data) => client.patch(`/admin/taxonomy/nodes/${id}`, data, { suppressErrorToast: true }),

  // Connect nodes (create relationship)
  createRelationship: (data) => client.post('/admin/taxonomy/relationships', data, { suppressErrorToast: true }),

  // Disconnect nodes (delete relationship)
  deleteRelationship: (data) => client.delete('/admin/taxonomy/relationships', { data, suppressErrorToast: true }),

  // Merge duplicate nodes
  mergeNodes: (data) => client.post('/admin/taxonomy/merge', data, { suppressErrorToast: true }),

  // Get full skill graph details (for visualization / analytics)
  getFullGraph: () => client.get('/skills/graph'),

  // Get AI proposals review queue list
  getProposals: (params) => client.get('/admin/taxonomy/proposals', { params }),

  // Approve/reject AI proposal
  reviewProposal: (id, data) => client.post(`/admin/taxonomy/proposals/${id}/review`, data, { suppressErrorToast: true }),
};
