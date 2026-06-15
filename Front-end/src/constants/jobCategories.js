/** Platform job categories — must match Backend JOB_CATEGORIES */
export const JOB_CATEGORIES = [
  'Web Development',
  'Mobile Development',
  'UI/UX Design',
  'Data Science & AI',
  'Content & Writing',
  'Video & Animation',
  'Digital Marketing',
  'Cybersecurity',
  'DevOps & Cloud',
  'Other'
];

/**
 * Gig subcategories per canonical category. UI helpers only (no DB source) —
 * but keyed by the canonical category names so the chosen category always
 * matches the backend taxonomy and is countable in aggregations.
 */
export const GIG_SUBCATEGORIES = {
  'Web Development': ['Full Stack', 'Frontend', 'Backend', 'E-Commerce', 'WordPress', 'API Development'],
  'Mobile Development': ['iOS', 'Android', 'React Native', 'Flutter', 'Cross-Platform'],
  'UI/UX Design': ['UI Design', 'UX Design', 'Logo Design', 'Brand Identity', 'Graphic Design', 'Prototyping'],
  'Data Science & AI': ['Machine Learning', 'Data Analysis', 'Data Visualization', 'AI/Chatbots', 'Deep Learning'],
  'Content & Writing': ['Article Writing', 'Copywriting', 'Technical Writing', 'Translation', 'Proofreading'],
  'Video & Animation': ['Video Editing', '2D Animation', '3D Animation', 'Motion Graphics', 'Whiteboard'],
  'Digital Marketing': ['SEO', 'Social Media', 'Email Marketing', 'PPC', 'Content Marketing'],
  'Cybersecurity': ['Penetration Testing', 'Security Audit', 'Compliance', 'Network Security'],
  'DevOps & Cloud': ['CI/CD', 'AWS', 'Azure', 'Kubernetes', 'Infrastructure'],
  'Other': ['Other'],
};
