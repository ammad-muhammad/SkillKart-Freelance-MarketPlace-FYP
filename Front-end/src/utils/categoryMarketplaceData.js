import { JOB_CATEGORIES, GIG_SUBCATEGORIES } from '../constants/jobCategories';
import { MOCK_FREELANCERS } from './mockData';

// Normalized slug helper
export const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Comprehensive category dictionary with canonical slugs, aliases, and descriptions
export const CATEGORY_CATALOG = {
  'web-development': {
    name: 'Web Development',
    icon: '🌐',
    description: 'Build fast, responsive websites and full-stack web applications with verified student talent.',
    aliases: ['development-tech', 'web-dev', 'web', 'frontend-development', 'backend-development', 'full-stack-development'],
  },
  'ai-and-machine-learning': {
    name: 'AI & Machine Learning',
    icon: '🤖',
    description: 'Harness cutting-edge artificial intelligence, LLMs, computer vision, and predictive models.',
    aliases: ['ai-emerging-tech', 'ai-machine-learning', 'ai', 'machine-learning', 'artificial-intelligence'],
  },
  'ui-design': {
    name: 'UI/UX Design',
    icon: '🎨',
    description: 'Craft intuitive interfaces, design systems, and wireframes that captivate your users.',
    aliases: ['design-creative', 'ui-ux-design', 'ux-design', 'ui-ux', 'design', 'graphic-design'],
  },
  'seo': {
    name: 'SEO & Marketing',
    icon: '📈',
    description: 'Grow organic traffic, search engine visibility, and social media campaigns with marketing pros.',
    aliases: ['marketing', 'seo-and-marketing', 'digital-marketing', 'social-media-marketing', 'sem'],
  },
  'cybersecurity': {
    name: 'Cybersecurity',
    icon: '🛡️',
    description: 'Protect your infrastructure, audit vulnerabilities, and perform penetration testing.',
    aliases: ['security', 'infosec', 'cyber', 'network-security'],
  },
  'devops-and-cloud': {
    name: 'Cloud Computing & DevOps',
    icon: '☁️',
    description: 'Deploy resilient cloud infrastructure, CI/CD pipelines, and scalable microservices.',
    aliases: ['cloud', 'cloud-computing', 'devops', 'aws', 'azure'],
  },
  'blockchain': {
    name: 'Blockchain & Web3',
    icon: '⛓️',
    description: 'Build decentralized applications, smart contracts, and secure token integrations.',
    aliases: ['web3', 'crypto', 'smart-contracts'],
  },
  'data-science': {
    name: 'Data Science',
    icon: '📊',
    description: 'Transform raw data into actionable insights, dashboards, and automated analytics.',
    aliases: ['data-analytics', 'data', 'big-data', 'machine-learning-data'],
  },
  'mobile-development': {
    name: 'Mobile Development',
    icon: '📱',
    description: 'Native and cross-platform iOS and Android apps built with React Native and Flutter.',
    aliases: ['mobile', 'app-development', 'ios', 'android'],
  },
  'video-editing': {
    name: 'Video & Animation',
    icon: '🎬',
    description: 'High quality video editing, reels, YouTube content, and motion graphics.',
    aliases: ['video', 'animation', 'videography', 'motion-graphics'],
  },
  'content-writing': {
    name: 'Content & Copywriting',
    icon: '✍️',
    description: 'Compelling copywriting, technical articles, blogs, and SEO-optimized text.',
    aliases: ['writing', 'copywriting', 'technical-writing'],
  },
};

// Curated high quality Unsplash tech/design images for mock gigs
const MOCK_GIG_IMAGES = [
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=700&q=80',
];

/**
 * Resolves any category slug to a full, rich category object even if backend has no node.
 */
export function resolveFallbackCategory(slug) {
  const normSlug = slugify(slug);

  // 1. Direct match in CATEGORY_CATALOG
  if (CATEGORY_CATALOG[normSlug]) {
    const entry = CATEGORY_CATALOG[normSlug];
    return buildCategoryObject(entry.name, normSlug, entry.icon, entry.description);
  }

  // 2. Check aliases in CATEGORY_CATALOG
  for (const [canonicalSlug, entry] of Object.entries(CATEGORY_CATALOG)) {
    if (entry.aliases.includes(normSlug)) {
      return buildCategoryObject(entry.name, canonicalSlug, entry.icon, entry.description);
    }
  }

  // 3. Match against JOB_CATEGORIES
  const matchedJobCat = JOB_CATEGORIES.find((c) => slugify(c) === normSlug);
  if (matchedJobCat) {
    return buildCategoryObject(
      matchedJobCat,
      normSlug,
      '💼',
      `Explore verified student freelancers and micro-services in ${matchedJobCat}.`
    );
  }

  // 4. Fallback formatting from the slug itself
  const titleName = normSlug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return buildCategoryObject(
    titleName,
    normSlug,
    '✨',
    `Discover specialized student services and portfolios in ${titleName}.`
  );
}

function buildCategoryObject(name, slug, icon, description) {
  const subList = GIG_SUBCATEGORIES[name] ||
    GIG_SUBCATEGORIES['Web Development'] ||
    ['Consultation', 'Full Project', 'Optimization', 'Bug Fixes', 'Design'];

  const fallbackSkills = subList.map((sub, i) => ({
    _id: `skill-${slugify(sub)}`,
    name: sub,
    slug: slugify(sub),
    icon: icon,
    description: `Professional student services for ${sub} micro-tasks and projects.`,
    totalServices: 8 + ((i * 3) % 15),
    trending: [sub, `${sub} Pro`, 'Fast Delivery', 'Student Verified'],
  }));

  return {
    _id: `cat-${slug}`,
    name,
    slug,
    icon,
    description,
    totalServices: 28,
    totalFreelancers: 18,
    avgRating: 4.9,
    skills: fallbackSkills,
  };
}

/**
 * Generates realistic fallback gigs for a category or skill.
 */
export function getFallbackGigs(categoryName, skillName = null) {
  const subList = GIG_SUBCATEGORIES[categoryName] || ['Solution', 'Service', 'Implementation', 'Design'];
  const focus = skillName || subList[0] || categoryName;

  const templates = [
    {
      title: `Build & Deploy Production-Ready ${focus} with Clean Architecture`,
      basePrice: 3500,
      rating: 4.9,
      reviews: 48,
    },
    {
      title: `Modern ${focus} UI/UX Redesign & Responsive Optimization`,
      basePrice: 2800,
      rating: 5.0,
      reviews: 36,
    },
    {
      title: `Fast 24h Turnaround ${focus} Micro-Task & Bug Fixing`,
      basePrice: 1500,
      rating: 4.8,
      reviews: 29,
    },
    {
      title: `Full-Stack Custom ${focus} Integration with REST APIs`,
      basePrice: 4200,
      rating: 4.9,
      reviews: 52,
    },
    {
      title: `Complete ${focus} Audit, Performance Tuning & Best Practices`,
      basePrice: 2400,
      rating: 4.7,
      reviews: 21,
    },
    {
      title: `End-to-End ${focus} Setup for Startups & University Projects`,
      basePrice: 3200,
      rating: 4.9,
      reviews: 43,
    },
  ];

  return templates.map((tmpl, idx) => {
    const fl = MOCK_FREELANCERS[idx % MOCK_FREELANCERS.length];
    return {
      id: `fallback-gig-${idx + 1}`,
      title: tmpl.title,
      image: MOCK_GIG_IMAGES[idx % MOCK_GIG_IMAGES.length],
      price: tmpl.basePrice,
      rating: tmpl.rating,
      reviews: tmpl.reviews,
      freelancerId: fl.id,
      freelancerName: fl.name,
      freelancerAvatar: null,
      category: categoryName,
      subcategory: focus,
      skills: [focus, categoryName, 'Verified Talent'],
    };
  });
}

/**
 * Returns mock freelancers formatted for marketplace cards.
 */
export function getFallbackFreelancers() {
  return MOCK_FREELANCERS.map((f) => ({
    id: f.id,
    name: f.name,
    title: f.role,
    rating: f.rating,
    reviews: f.reviewCount,
    price: f.hourlyRate,
    avatar: null,
    seed: f.name,
    skills: f.skills,
  }));
}
