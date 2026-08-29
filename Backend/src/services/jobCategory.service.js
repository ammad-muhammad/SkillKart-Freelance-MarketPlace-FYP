const { JOB_CATEGORIES } = require('../utils/constants');
const { getAIProvider } = require('./ai');

const sanitizeCategory = (value) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  const exact = JOB_CATEGORIES.find((c) => c === trimmed);
  if (exact) return exact;
  const ci = JOB_CATEGORIES.find((c) => c.toLowerCase() === trimmed.toLowerCase());
  return ci || null;
};

const keywordFallback = (title = '', description = '', skills = []) => {
  const text = `${title} ${description} ${(skills || []).join(' ')}`.toLowerCase();

  if (/mobile|ios|android|flutter|react native|swift|kotlin/.test(text)) return 'Mobile Development';
  if (/ui\/ux|ui ux|figma|design system|wireframe|prototype/.test(text)) return 'UI/UX Design';
  if (/machine learning|ml |ai |data science|tensorflow|pytorch|nlp/.test(text)) return 'Data Science & AI';
  if (/blog|copywriting|content writing|article|seo writing/.test(text)) return 'Content & Writing';
  if (/video edit|animation|motion graphics|after effects|premiere/.test(text)) return 'Video & Animation';
  if (/marketing|social media|ppc|google ads|facebook ads/.test(text)) return 'Digital Marketing';
  if (/security|penetration|cyber|vulnerability/.test(text)) return 'Cybersecurity';
  if (/devops|kubernetes|docker|aws|azure|gcp|ci\/cd/.test(text)) return 'DevOps & Cloud';
  if (/react|node|vue|angular|full stack|backend|frontend|web app|website/.test(text)) return 'Web Development';

  return 'Other';
};

const recommendJobCategory = async (title = '', description = '', skills = []) => {
  const fallback = keywordFallback(title, description, skills);

  try {
    const ai = getAIProvider();
    if (typeof ai.recommendJobCategory !== 'function') {
      return { category: fallback, suggestions: [fallback, 'Web Development', 'Other'].filter((c, i, a) => a.indexOf(c) === i) };
    }

    const result = await ai.recommendJobCategory(title, description, skills);
    const category = sanitizeCategory(result?.category) || fallback;
    const suggestions = (result?.suggestions || [])
      .map(sanitizeCategory)
      .filter(Boolean)
      .filter((s, i, arr) => arr.indexOf(s) === i);

    if (!suggestions.includes(category)) {
      suggestions.unshift(category);
    }

    return {
      category,
      suggestions: suggestions.slice(0, 3).length ? suggestions.slice(0, 3) : [category, fallback]
    };
  } catch (error) {
    console.warn('recommendJobCategory fallback:', error.message);
    return { category: fallback, suggestions: [fallback, 'Web Development', 'Other'] };
  }
};

// Unlike category, subcategory has no fixed taxonomy to validate against — it's
// a free-text refinement (e.g. "Frontend Development" under "Web Development"),
// so we just trust the AI's short strings rather than sanitizing against a list.
const cleanSubcategory = (value) => {
  if (!value || typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, 60);
};

const recommendJobSubcategory = async (title = '', description = '', skills = [], category = '') => {
  try {
    const ai = getAIProvider();
    if (typeof ai.recommendJobSubcategory !== 'function') {
      return { subcategory: '', suggestions: [] };
    }

    const result = await ai.recommendJobSubcategory(title, description, skills, category);
    const subcategory = cleanSubcategory(result?.subcategory);
    const suggestions = (result?.suggestions || [])
      .map(cleanSubcategory)
      .filter(Boolean)
      .filter((s, i, arr) => arr.indexOf(s) === i);

    if (subcategory && !suggestions.includes(subcategory)) {
      suggestions.unshift(subcategory);
    }

    return { subcategory, suggestions: suggestions.slice(0, 3) };
  } catch (error) {
    console.warn('recommendJobSubcategory fallback:', error.message);
    return { subcategory: '', suggestions: [] };
  }
};

module.exports = {
  JOB_CATEGORIES,
  sanitizeCategory,
  recommendJobCategory,
  recommendJobSubcategory
};
