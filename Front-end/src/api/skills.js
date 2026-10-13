import client from './client';

export const skillsAPI = {
  // Fires on every keystroke in TagInput → suppress the global error toast.
  validate: (input) => client.post('/skills/validate', { input }, { suppressErrorToast: true }),

  // Public — returns the full universal taxonomy grouped by industry.
  getTaxonomy: () => client.get('/skills/taxonomy'),

  // Public — returns the full hierarchical tree: Industry -> Categories -> Skills
  getTaxonomyTree: () => client.get('/skills/tree'),

  // Public — resolve a term/slug to its canonical SkillNode
  resolve: (q) => client.get('/skills/resolve', { params: { q } }),

  // Public — get descendants of a node slug
  getDescendants: (slug) => client.get(`/skills/${slug}/descendants`),

  // Public — expand search query using graph relationships to get related skills list
  expand: (query) => client.post('/skills/expand', { query }),
};
