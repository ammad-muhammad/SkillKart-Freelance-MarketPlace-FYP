/**
 * seedSkillGraph.js
 * ─────────────────
 * One-time (and idempotent) seed script that populates the Universal Skill
 * Graph in MongoDB.
 *
 * Run:
 *   node Backend/src/scripts/seedSkillGraph.js
 *
 * Safe to re-run — uses upsert on unique `name` field.
 */

const path    = require('path');
const dotenv  = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const SkillNode         = require('../models/SkillNode');
const SkillRelationship = require('../models/SkillRelationship');

const slugify = (s) =>
  String(s).toLowerCase().trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/* ═══════════════════════════════════════════════════════════════════════
   GRAPH DEFINITION
   ═══════════════════════════════════════════════════════════════════════ */

/** All node definitions. `type` drives traversal defaults. */
const NODE_DEFINITIONS = [
  /* ── Industries (top-level) ────────────────────────────────────────── */
  { name: 'Software & Technology',    type: 'industry',  icon: '💻', color: '#6366f1' },
  { name: 'Design',                   type: 'industry',  icon: '🎨', color: '#ec4899' },
  { name: 'Video & Photography',      type: 'industry',  icon: '🎬', color: '#7c3aed' },
  { name: 'Writing & Content',        type: 'industry',  icon: '✍️', color: '#f59e0b' },
  { name: 'Marketing',                type: 'industry',  icon: '📣', color: '#dc2626' },
  { name: 'Business',                 type: 'industry',  icon: '💼', color: '#0f766e' },
  { name: 'Audio & Music',            type: 'industry',  icon: '🎵', color: '#a855f7' },
  { name: 'Architecture & Engineering', type: 'industry', icon: '🏗️', color: '#78716c' },
  { name: 'Finance & Legal',          type: 'industry',  icon: '⚖️', color: '#059669' },

  /* ── Categories ────────────────────────────────────────────────────── */
  // Software & Technology
  { name: 'Web Development',          type: 'category',  icon: '🌐', color: '#6366f1' },
  { name: 'Mobile Development',       type: 'category',  icon: '📱', color: '#0ea5e9' },
  { name: 'Frontend Development',     type: 'category',  icon: '🖥️', color: '#f59e0b' },
  { name: 'Backend Development',      type: 'category',  icon: '⚙️', color: '#1d4ed8' },
  { name: 'Full Stack Development',   type: 'category',  icon: '💻', color: '#7c3aed' },
  { name: 'DevOps & Cloud',           type: 'category',  icon: '☁️', color: '#06b6d4' },
  { name: 'Cybersecurity',            type: 'category',  icon: '🛡️', color: '#ef4444' },
  { name: 'AI & Machine Learning',    type: 'category',  icon: '🤖', color: '#10b981' },
  { name: 'Data Science',             type: 'category',  icon: '📊', color: '#0284c7' },
  { name: 'Blockchain',               type: 'category',  icon: '⛓️', color: '#f59e0b' },
  { name: 'Game Development',         type: 'category',  icon: '🎮', color: '#7c3aed' },
  { name: 'QA & Testing',             type: 'category',  icon: '🧪', color: '#059669' },
  // Design
  { name: 'UI Design',                type: 'category',  icon: '🎨', color: '#ec4899' },
  { name: 'UX Design',                type: 'category',  icon: '🖌️', color: '#a855f7' },
  { name: 'Graphic Design',           type: 'category',  icon: '🖼️', color: '#f97316' },
  { name: 'Logo Design',              type: 'category',  icon: '✏️', color: '#3b82f6' },
  { name: 'Brand Identity',           type: 'category',  icon: '💎', color: '#0f766e' },
  { name: 'Product Design',           type: 'category',  icon: '📐', color: '#7c3aed' },
  { name: 'Illustration',             type: 'category',  icon: '🖊️', color: '#ef4444' },
  { name: 'Motion Graphics',          type: 'category',  icon: '🎞️', color: '#8b5cf6' },
  // Video & Photography
  { name: 'Video Editing',            type: 'category',  icon: '🎬', color: '#1d4ed8' },
  { name: 'Videography',              type: 'category',  icon: '🎥', color: '#0f172a' },
  { name: 'Photography',              type: 'category',  icon: '📷', color: '#78716c' },
  { name: 'Drone Photography',        type: 'category',  icon: '🚁', color: '#0284c7' },
  { name: 'Cinematography',           type: 'category',  icon: '🎞️', color: '#7c2d12' },
  { name: 'Color Grading',            type: 'category',  icon: '🌈', color: '#a855f7' },
  { name: 'Visual Effects (VFX)',     type: 'category',  icon: '✨', color: '#6366f1' },
  { name: 'Animation',                type: 'category',  icon: '🎭', color: '#ec4899' },
  { name: '3D Animation',             type: 'category',  icon: '🧊', color: '#0ea5e9' },
  // Writing & Content
  { name: 'Copywriting',              type: 'category',  icon: '📝', color: '#b45309' },
  { name: 'Technical Writing',        type: 'category',  icon: '📄', color: '#1d4ed8' },
  { name: 'Content Writing',          type: 'category',  icon: '✍️', color: '#f59e0b' },
  { name: 'Ghostwriting',             type: 'category',  icon: '👻', color: '#64748b' },
  { name: 'Script Writing',           type: 'category',  icon: '🎬', color: '#7c3aed' },
  { name: 'Translation',              type: 'category',  icon: '🌍', color: '#0f766e' },
  { name: 'Proofreading',             type: 'category',  icon: '🔍', color: '#059669' },
  // Marketing
  { name: 'SEO',                      type: 'category',  icon: '🔎', color: '#3b82f6' },
  { name: 'SEM',                      type: 'category',  icon: '📈', color: '#0ea5e9' },
  { name: 'Social Media Marketing',   type: 'category',  icon: '📣', color: '#ec4899' },
  { name: 'Email Marketing',          type: 'category',  icon: '📧', color: '#f59e0b' },
  { name: 'Affiliate Marketing',      type: 'category',  icon: '🤝', color: '#10b981' },
  { name: 'PPC Advertising',          type: 'category',  icon: '💰', color: '#dc2626' },
  { name: 'Influencer Marketing',     type: 'category',  icon: '⭐', color: '#f59e0b' },
  { name: 'Branding',                 type: 'category',  icon: '🏆', color: '#7c3aed' },
  // Business
  { name: 'Project Management',       type: 'category',  icon: '📋', color: '#0f766e' },
  { name: 'Virtual Assistance',       type: 'category',  icon: '💼', color: '#1d4ed8' },
  { name: 'Business Consulting',      type: 'category',  icon: '🧠', color: '#0284c7' },
  { name: 'Market Research',          type: 'category',  icon: '🔬', color: '#7c3aed' },
  { name: 'Customer Support',         type: 'category',  icon: '🎧', color: '#059669' },
  { name: 'Recruitment',              type: 'category',  icon: '👥', color: '#f97316' },
  { name: 'Data Entry',               type: 'category',  icon: '⌨️', color: '#64748b' },
  // Audio & Music
  { name: 'Voice Over',               type: 'category',  icon: '🎙️', color: '#7c3aed' },
  { name: 'Audio Editing',            type: 'category',  icon: '🎛️', color: '#0f172a' },
  { name: 'Music Production',         type: 'category',  icon: '🎵', color: '#ec4899' },
  { name: 'Mixing & Mastering',       type: 'category',  icon: '🎚️', color: '#a855f7' },
  { name: 'Podcast Production',       type: 'category',  icon: '🎤', color: '#0ea5e9' },
  { name: 'Sound Design',             type: 'category',  icon: '🔊', color: '#059669' },
  // Architecture & Engineering
  { name: 'CAD Design',               type: 'category',  icon: '📏', color: '#78716c' },
  { name: 'Interior Design',          type: 'category',  icon: '🛋️', color: '#b45309' },
  { name: 'Exterior Design',          type: 'category',  icon: '🏠', color: '#0f766e' },
  { name: 'Structural Design',        type: 'category',  icon: '🏗️', color: '#1d4ed8' },
  { name: 'Mechanical Design',        type: 'category',  icon: '🔧', color: '#475569' },
  // Finance & Legal
  { name: 'Accounting',               type: 'category',  icon: '💹', color: '#059669' },
  { name: 'Bookkeeping',              type: 'category',  icon: '📒', color: '#0284c7' },
  { name: 'Financial Analysis',       type: 'category',  icon: '📉', color: '#dc2626' },
  { name: 'Tax Preparation',          type: 'category',  icon: '🧾', color: '#7c3aed' },
  { name: 'Legal Consulting',         type: 'category',  icon: '⚖️', color: '#44403c' },
  { name: 'Other',                    type: 'category',  icon: '✨', color: '#64748b' },

  /* ── Technologies / Programming Languages ──────────────────────────── */
  { name: 'JavaScript',     type: 'technology', aliases: ['JS', 'ECMAScript', 'JavaScript Development'], weight: 1.0 },
  { name: 'TypeScript',     type: 'technology', aliases: ['TS'],               weight: 0.95 },
  { name: 'Python',         type: 'technology',                                 weight: 1.0 },
  { name: 'PHP',            type: 'technology',                                 weight: 0.85 },
  { name: 'Java',           type: 'technology',                                 weight: 0.85 },
  { name: 'C#',             type: 'technology', aliases: ['CSharp'],           weight: 0.8 },
  { name: 'Go',             type: 'technology', aliases: ['Golang'],            weight: 0.8 },
  { name: 'Ruby',           type: 'technology',                                 weight: 0.75 },
  { name: 'Swift',          type: 'technology',                                 weight: 0.85 },
  { name: 'Kotlin',         type: 'technology',                                 weight: 0.85 },
  { name: 'Rust',           type: 'technology',                                 weight: 0.75 },
  { name: 'SQL',            type: 'technology',                                 weight: 0.9 },
  { name: 'HTML',           type: 'technology',                                 weight: 0.9 },
  { name: 'CSS',            type: 'technology',                                 weight: 0.9 },

  /* ── Frameworks & Libraries ─────────────────────────────────────────── */
  { name: 'React',          type: 'technology', aliases: ['ReactJS', 'React.js'], weight: 1.0 },
  { name: 'Next.js',        type: 'technology', aliases: ['NextJS'],           weight: 0.95 },
  { name: 'Vue.js',         type: 'technology', aliases: ['Vue', 'VueJS'],     weight: 0.9 },
  { name: 'Angular',        type: 'technology', aliases: ['AngularJS'],        weight: 0.9 },
  { name: 'Node.js',        type: 'technology', aliases: ['Node', 'NodeJS'],   weight: 0.95 },
  { name: 'Express.js',     type: 'technology', aliases: ['Express'],          weight: 0.85 },
  { name: 'Django',         type: 'technology',                                 weight: 0.85 },
  { name: 'Flask',          type: 'technology',                                 weight: 0.8 },
  { name: 'FastAPI',        type: 'technology',                                 weight: 0.8 },
  { name: 'Laravel',        type: 'technology',                                 weight: 0.85 },
  { name: 'Ruby on Rails',  type: 'technology', aliases: ['Rails'],             weight: 0.8 },
  { name: 'Spring Boot',    type: 'technology',                                 weight: 0.8 },
  { name: 'React Native',   type: 'technology',                                 weight: 0.9 },
  { name: 'Flutter',        type: 'technology',                                 weight: 0.9 },
  { name: 'GraphQL',        type: 'technology',                                 weight: 0.85 },
  { name: 'REST APIs',      type: 'technology', aliases: ['REST', 'RESTful'],   weight: 0.9 },

  /* ── Tools ──────────────────────────────────────────────────────────── */
  { name: 'Figma',          type: 'tool', weight: 0.95 },
  { name: 'Adobe XD',       type: 'tool', weight: 0.85 },
  { name: 'Adobe Photoshop',type: 'tool', aliases: ['Photoshop', 'PS'], weight: 0.95 },
  { name: 'Adobe Illustrator', type: 'tool', aliases: ['Illustrator', 'AI'], weight: 0.9 },
  { name: 'Adobe Premiere Pro', type: 'tool', aliases: ['Premiere Pro', 'Premiere'], weight: 0.9 },
  { name: 'Adobe After Effects', type: 'tool', aliases: ['After Effects', 'AE'], weight: 0.9 },
  { name: 'DaVinci Resolve', type: 'tool',                               weight: 0.85 },
  { name: 'Final Cut Pro',  type: 'tool',                                weight: 0.8 },
  { name: 'Blender',        type: 'tool',                                weight: 0.85 },
  { name: 'Cinema 4D',      type: 'tool', aliases: ['C4D'],              weight: 0.8 },
  { name: 'Unity',          type: 'tool',                                weight: 0.85 },
  { name: 'Unreal Engine',  type: 'tool', aliases: ['UE5', 'UE4'],      weight: 0.85 },
  { name: 'AutoCAD',        type: 'tool',                                weight: 0.9 },
  { name: 'SolidWorks',     type: 'tool',                                weight: 0.85 },
  { name: 'Revit',          type: 'tool',                                weight: 0.85 },
  { name: 'SketchUp',       type: 'tool',                                weight: 0.8 },
  { name: 'Adobe Lightroom', type: 'tool', aliases: ['Lightroom'],       weight: 0.9 },
  { name: 'Docker',         type: 'tool',                                weight: 0.9 },
  { name: 'Kubernetes',     type: 'tool', aliases: ['K8s'],              weight: 0.85 },
  { name: 'AWS',            type: 'tool', aliases: ['Amazon Web Services'], weight: 0.95 },
  { name: 'Azure',          type: 'tool', aliases: ['Microsoft Azure'],  weight: 0.85 },
  { name: 'Google Cloud',   type: 'tool', aliases: ['GCP'],              weight: 0.85 },
  { name: 'QuickBooks',     type: 'tool',                                weight: 0.85 },
  { name: 'Xero',           type: 'tool',                                weight: 0.8 },
  { name: 'FL Studio',      type: 'tool',                                weight: 0.8 },
  { name: 'Ableton Live',   type: 'tool', aliases: ['Ableton'],          weight: 0.8 },
  { name: 'Logic Pro',      type: 'tool',                                weight: 0.8 },
  { name: 'Pro Tools',      type: 'tool',                                weight: 0.8 },

  /* ── Concepts / Skills ──────────────────────────────────────────────── */
  { name: 'SEO Optimization',    type: 'skill', synonyms: ['Search Engine Optimization', 'SEO Writing'], weight: 0.9 },
  { name: 'Copywriting',         type: 'skill',  weight: 0.9 },
  { name: 'Data Analysis',       type: 'skill',  weight: 0.9 },
  { name: 'Machine Learning',    type: 'skill',  weight: 0.9 },
  { name: 'Deep Learning',       type: 'skill',  weight: 0.85 },
  { name: 'Natural Language Processing', type: 'skill', aliases: ['NLP'], weight: 0.85 },
  { name: 'Computer Vision',     type: 'skill',  weight: 0.85 },
  { name: 'Penetration Testing', type: 'skill',  weight: 0.9 },
  { name: 'Network Security',    type: 'skill',  weight: 0.85 },
  { name: 'Portrait Photography', type: 'skill', weight: 0.85 },
  { name: 'Product Photography', type: 'skill',  weight: 0.85 },
  { name: 'Wedding Photography', type: 'skill',  weight: 0.8 },
  { name: 'Photo Retouching',    type: 'skill',  weight: 0.85 },
  { name: 'Video Color Grading', type: 'skill',  synonyms: ['Color Correction'], weight: 0.85 },
  { name: '2D Animation',        type: 'skill',  weight: 0.85 },
  { name: '3D Modeling',         type: 'skill',  weight: 0.85 },
  { name: 'Motion Graphics Design', type: 'skill', weight: 0.85 },
  { name: 'Podcast Editing',     type: 'skill',  weight: 0.85 },
  { name: 'Voice Recording',     type: 'skill',  weight: 0.8 },
  { name: 'Financial Modeling',  type: 'skill',  weight: 0.85 },
  { name: 'Tax Filing',          type: 'skill',  synonyms: ['Tax Preparation'], weight: 0.85 },
  { name: 'Contract Drafting',   type: 'skill',  weight: 0.85 },
  { name: 'Agile',               type: 'concept', weight: 0.85 },
  { name: 'Scrum',               type: 'concept', weight: 0.8 },
  { name: 'CI/CD',               type: 'concept', weight: 0.85 },
  { name: 'Smart Contracts',     type: 'skill',  weight: 0.85 },
  { name: 'Solidity',            type: 'technology', weight: 0.8 },
  { name: 'Wireframing',         type: 'skill',  weight: 0.85 },
  { name: 'Prototyping',         type: 'skill',  weight: 0.85 },
  { name: 'User Research',       type: 'skill',  weight: 0.85 },
  { name: 'Brand Strategy',      type: 'skill',  weight: 0.85 },
  { name: 'Content Marketing',   type: 'skill',  weight: 0.85 },
  { name: 'Email Campaigns',     type: 'skill',  weight: 0.85 },
  { name: 'Google Ads',          type: 'skill',  weight: 0.9 },
  { name: 'Facebook Ads',        type: 'skill',  weight: 0.9 },
  { name: 'Instagram Marketing', type: 'skill',  weight: 0.85 },
  { name: 'LinkedIn Marketing',  type: 'skill',  weight: 0.85 },
  { name: 'Virtual Assistant',   type: 'skill',  synonyms: ['VA', 'Virtual Assistance'], weight: 0.85 },
  { name: 'Data Entry Specialist', type: 'skill', weight: 0.8 },
  { name: 'Recruiting',          type: 'skill',  synonyms: ['Recruitment', 'Talent Acquisition'], weight: 0.85 },
  { name: 'Customer Service',    type: 'skill',  synonyms: ['Customer Support'], weight: 0.85 },
  { name: 'Structural Engineering', type: 'skill', weight: 0.85 },
  { name: 'Interior Architecture', type: 'skill', weight: 0.85 },
  { name: 'Bookkeeping Skills',  type: 'skill',  weight: 0.85 },
  { name: 'Accounting Skills',   type: 'skill',  weight: 0.85 },
];

/**
 * Relationship definitions — [from_name, type, to_name, weight?]
 * Defines the edges of the graph.
 */
const RELATIONSHIP_DEFINITIONS = [
  /* ── Category → Industry (BELONGS_TO) ─────────────────────────────── */
  ['Web Development',          'BELONGS_TO', 'Software & Technology'],
  ['Mobile Development',       'BELONGS_TO', 'Software & Technology'],
  ['Frontend Development',     'BELONGS_TO', 'Software & Technology'],
  ['Backend Development',      'BELONGS_TO', 'Software & Technology'],
  ['Full Stack Development',   'BELONGS_TO', 'Software & Technology'],
  ['DevOps & Cloud',           'BELONGS_TO', 'Software & Technology'],
  ['Cybersecurity',            'BELONGS_TO', 'Software & Technology'],
  ['AI & Machine Learning',    'BELONGS_TO', 'Software & Technology'],
  ['Data Science',             'BELONGS_TO', 'Software & Technology'],
  ['Blockchain',               'BELONGS_TO', 'Software & Technology'],
  ['Game Development',         'BELONGS_TO', 'Software & Technology'],
  ['QA & Testing',             'BELONGS_TO', 'Software & Technology'],
  ['UI Design',                'BELONGS_TO', 'Design'],
  ['UX Design',                'BELONGS_TO', 'Design'],
  ['Graphic Design',           'BELONGS_TO', 'Design'],
  ['Logo Design',              'BELONGS_TO', 'Design'],
  ['Brand Identity',           'BELONGS_TO', 'Design'],
  ['Product Design',           'BELONGS_TO', 'Design'],
  ['Illustration',             'BELONGS_TO', 'Design'],
  ['Motion Graphics',          'BELONGS_TO', 'Design'],
  ['Video Editing',            'BELONGS_TO', 'Video & Photography'],
  ['Videography',              'BELONGS_TO', 'Video & Photography'],
  ['Photography',              'BELONGS_TO', 'Video & Photography'],
  ['Drone Photography',        'BELONGS_TO', 'Video & Photography'],
  ['Cinematography',           'BELONGS_TO', 'Video & Photography'],
  ['Color Grading',            'BELONGS_TO', 'Video & Photography'],
  ['Visual Effects (VFX)',     'BELONGS_TO', 'Video & Photography'],
  ['Animation',                'BELONGS_TO', 'Video & Photography'],
  ['3D Animation',             'BELONGS_TO', 'Video & Photography'],
  ['Copywriting',              'BELONGS_TO', 'Writing & Content'],
  ['Technical Writing',        'BELONGS_TO', 'Writing & Content'],
  ['Content Writing',          'BELONGS_TO', 'Writing & Content'],
  ['Ghostwriting',             'BELONGS_TO', 'Writing & Content'],
  ['Script Writing',           'BELONGS_TO', 'Writing & Content'],
  ['Translation',              'BELONGS_TO', 'Writing & Content'],
  ['Proofreading',             'BELONGS_TO', 'Writing & Content'],
  ['SEO',                      'BELONGS_TO', 'Marketing'],
  ['SEM',                      'BELONGS_TO', 'Marketing'],
  ['Social Media Marketing',   'BELONGS_TO', 'Marketing'],
  ['Email Marketing',          'BELONGS_TO', 'Marketing'],
  ['Affiliate Marketing',      'BELONGS_TO', 'Marketing'],
  ['PPC Advertising',          'BELONGS_TO', 'Marketing'],
  ['Influencer Marketing',     'BELONGS_TO', 'Marketing'],
  ['Branding',                 'BELONGS_TO', 'Marketing'],
  ['Project Management',       'BELONGS_TO', 'Business'],
  ['Virtual Assistance',       'BELONGS_TO', 'Business'],
  ['Business Consulting',      'BELONGS_TO', 'Business'],
  ['Market Research',          'BELONGS_TO', 'Business'],
  ['Customer Support',         'BELONGS_TO', 'Business'],
  ['Recruitment',              'BELONGS_TO', 'Business'],
  ['Data Entry',               'BELONGS_TO', 'Business'],
  ['Voice Over',               'BELONGS_TO', 'Audio & Music'],
  ['Audio Editing',            'BELONGS_TO', 'Audio & Music'],
  ['Music Production',         'BELONGS_TO', 'Audio & Music'],
  ['Mixing & Mastering',       'BELONGS_TO', 'Audio & Music'],
  ['Podcast Production',       'BELONGS_TO', 'Audio & Music'],
  ['Sound Design',             'BELONGS_TO', 'Audio & Music'],
  ['CAD Design',               'BELONGS_TO', 'Architecture & Engineering'],
  ['Interior Design',          'BELONGS_TO', 'Architecture & Engineering'],
  ['Exterior Design',          'BELONGS_TO', 'Architecture & Engineering'],
  ['Structural Design',        'BELONGS_TO', 'Architecture & Engineering'],
  ['Mechanical Design',        'BELONGS_TO', 'Architecture & Engineering'],
  ['Accounting',               'BELONGS_TO', 'Finance & Legal'],
  ['Bookkeeping',              'BELONGS_TO', 'Finance & Legal'],
  ['Financial Analysis',       'BELONGS_TO', 'Finance & Legal'],
  ['Tax Preparation',          'BELONGS_TO', 'Finance & Legal'],
  ['Legal Consulting',         'BELONGS_TO', 'Finance & Legal'],

  /* ── Cross-category relationships ──────────────────────────────────── */
  // Design skills appear in multiple categories
  ['Figma',               'USED_IN', 'UI Design',          0.95],
  ['Figma',               'USED_IN', 'UX Design',          0.95],
  ['Figma',               'USED_IN', 'Product Design',     0.85],
  ['Figma',               'RELATED_TO', 'Wireframing',     0.9],
  ['Figma',               'RELATED_TO', 'Prototyping',     0.9],
  ['Adobe Photoshop',     'USED_IN', 'Graphic Design',     0.95],
  ['Adobe Photoshop',     'USED_IN', 'Photography',        0.9],
  ['Adobe Photoshop',     'USED_IN', 'UI Design',          0.75],
  ['Adobe Photoshop',     'RELATED_TO', 'Photo Retouching', 0.9],
  ['Adobe Photoshop',     'RELATED_TO', 'Illustration',    0.7],
  ['Adobe Illustrator',   'USED_IN', 'Graphic Design',     0.95],
  ['Adobe Illustrator',   'USED_IN', 'Logo Design',        0.95],
  ['Adobe Illustrator',   'USED_IN', 'Brand Identity',     0.85],
  ['Adobe Illustrator',   'USED_IN', 'Illustration',       0.9],
  ['Adobe Lightroom',     'USED_IN', 'Photography',        0.95],
  ['Adobe Lightroom',     'RELATED_TO', 'Color Grading',   0.8],
  ['Adobe Lightroom',     'RELATED_TO', 'Photo Retouching', 0.85],

  // Photography cross-cutting
  ['Photography',         'RELATED_TO', 'Videography',     0.7],
  ['Photography',         'RELATED_TO', 'Drone Photography', 0.75],
  ['Photography',         'RELATED_TO', 'Cinematography',  0.6],
  ['Portrait Photography','BELONGS_TO', 'Photography',     1.0],
  ['Product Photography', 'BELONGS_TO', 'Photography',     1.0],
  ['Wedding Photography', 'BELONGS_TO', 'Photography',     1.0],
  ['Photo Retouching',    'BELONGS_TO', 'Photography',     1.0],

  // Video cross-cutting
  ['Adobe Premiere Pro',  'USED_IN', 'Video Editing',      0.95],
  ['Adobe After Effects', 'USED_IN', 'Motion Graphics',    0.95],
  ['Adobe After Effects', 'USED_IN', 'Video Editing',      0.85],
  ['Adobe After Effects', 'USED_IN', 'Visual Effects (VFX)', 0.85],
  ['DaVinci Resolve',     'USED_IN', 'Video Editing',      0.9],
  ['DaVinci Resolve',     'USED_IN', 'Color Grading',      0.95],
  ['Blender',             'USED_IN', '3D Animation',       0.9],
  ['Blender',             'USED_IN', 'Animation',          0.8],
  ['Cinema 4D',           'USED_IN', 'Motion Graphics',    0.9],
  ['Cinema 4D',           'USED_IN', '3D Animation',       0.9],
  ['2D Animation',        'BELONGS_TO', 'Animation',       1.0],
  ['3D Modeling',         'RELATED_TO', '3D Animation',    0.85],
  ['Video Color Grading', 'BELONGS_TO', 'Color Grading',   1.0],
  ['Motion Graphics Design', 'BELONGS_TO', 'Motion Graphics', 1.0],

  /* ── Technology BELONGS_TO categories ─────────────────────────────── */
  ['JavaScript',          'BELONGS_TO', 'Web Development',        1.0],
  ['JavaScript',          'BELONGS_TO', 'Frontend Development',   1.0],
  ['JavaScript',          'BELONGS_TO', 'Backend Development',    0.8],
  ['JavaScript',          'BELONGS_TO', 'Mobile Development',     0.7],
  ['TypeScript',          'BELONGS_TO', 'Web Development',        0.95],
  ['TypeScript',          'BELONGS_TO', 'Frontend Development',   0.95],
  ['TypeScript',          'BELONGS_TO', 'Backend Development',    0.85],
  ['Python',              'BELONGS_TO', 'Backend Development',    0.9],
  ['Python',              'BELONGS_TO', 'AI & Machine Learning',  1.0],
  ['Python',              'BELONGS_TO', 'Data Science',           1.0],
  ['PHP',                 'BELONGS_TO', 'Web Development',        0.85],
  ['PHP',                 'BELONGS_TO', 'Backend Development',    0.85],
  ['Java',                'BELONGS_TO', 'Backend Development',    0.85],
  ['Java',                'BELONGS_TO', 'Mobile Development',     0.75],
  ['Swift',               'BELONGS_TO', 'Mobile Development',     0.95],
  ['Kotlin',              'BELONGS_TO', 'Mobile Development',     0.95],
  ['SQL',                 'BELONGS_TO', 'Backend Development',    0.85],
  ['SQL',                 'BELONGS_TO', 'Data Science',           0.9],
  ['HTML',                'BELONGS_TO', 'Web Development',        0.9],
  ['HTML',                'BELONGS_TO', 'Frontend Development',   1.0],
  ['CSS',                 'BELONGS_TO', 'Web Development',        0.9],
  ['CSS',                 'BELONGS_TO', 'Frontend Development',   1.0],

  /* ── Framework DEPENDS_ON / RELATED_TO ────────────────────────────── */
  ['React',               'DEPENDS_ON', 'JavaScript',      1.0],
  ['React',               'RELATED_TO', 'Vue.js',          0.85],
  ['React',               'RELATED_TO', 'Angular',         0.8],
  ['React',               'BELONGS_TO', 'Frontend Development', 1.0],
  ['React',               'BELONGS_TO', 'Web Development',  0.9],
  ['Next.js',             'DEPENDS_ON', 'React',           0.95],
  ['Next.js',             'DEPENDS_ON', 'JavaScript',      0.9],
  ['Next.js',             'BELONGS_TO', 'Frontend Development', 0.9],
  ['Next.js',             'BELONGS_TO', 'Web Development',  0.9],
  ['Vue.js',              'DEPENDS_ON', 'JavaScript',       0.9],
  ['Vue.js',              'BELONGS_TO', 'Frontend Development', 0.9],
  ['Angular',             'DEPENDS_ON', 'TypeScript',       0.9],
  ['Angular',             'BELONGS_TO', 'Frontend Development', 0.9],
  ['Node.js',             'DEPENDS_ON', 'JavaScript',       1.0],
  ['Node.js',             'BELONGS_TO', 'Backend Development', 1.0],
  ['Node.js',             'BELONGS_TO', 'Web Development',  0.85],
  ['Express.js',          'DEPENDS_ON', 'Node.js',          1.0],
  ['Express.js',          'BELONGS_TO', 'Backend Development', 0.95],
  ['Django',              'DEPENDS_ON', 'Python',           1.0],
  ['Django',              'BELONGS_TO', 'Backend Development', 0.9],
  ['FastAPI',             'DEPENDS_ON', 'Python',           1.0],
  ['FastAPI',             'BELONGS_TO', 'Backend Development', 0.9],
  ['Laravel',             'DEPENDS_ON', 'PHP',              1.0],
  ['Laravel',             'BELONGS_TO', 'Backend Development', 0.9],
  ['React Native',        'DEPENDS_ON', 'JavaScript',       0.9],
  ['React Native',        'DEPENDS_ON', 'React',            0.85],
  ['React Native',        'BELONGS_TO', 'Mobile Development', 1.0],
  ['Flutter',             'BELONGS_TO', 'Mobile Development', 1.0],
  ['Flutter',             'RELATED_TO', 'React Native',     0.75],

  /* ── Cloud/DevOps tools ─────────────────────────────────────────────── */
  ['Docker',              'BELONGS_TO', 'DevOps & Cloud',   1.0],
  ['Kubernetes',          'BELONGS_TO', 'DevOps & Cloud',   1.0],
  ['Kubernetes',          'DEPENDS_ON', 'Docker',           0.85],
  ['AWS',                 'BELONGS_TO', 'DevOps & Cloud',   1.0],
  ['Azure',               'BELONGS_TO', 'DevOps & Cloud',   1.0],
  ['Google Cloud',        'BELONGS_TO', 'DevOps & Cloud',   1.0],
  ['CI/CD',               'BELONGS_TO', 'DevOps & Cloud',   0.9],

  /* ── AI / Data Science ─────────────────────────────────────────────── */
  ['Machine Learning',    'BELONGS_TO', 'AI & Machine Learning', 1.0],
  ['Machine Learning',    'BELONGS_TO', 'Data Science',     0.85],
  ['Machine Learning',    'DEPENDS_ON', 'Python',           0.9],
  ['Deep Learning',       'DEPENDS_ON', 'Machine Learning', 0.95],
  ['Deep Learning',       'BELONGS_TO', 'AI & Machine Learning', 1.0],
  ['Natural Language Processing', 'BELONGS_TO', 'AI & Machine Learning', 1.0],
  ['Natural Language Processing', 'DEPENDS_ON', 'Machine Learning', 0.85],
  ['Computer Vision',     'BELONGS_TO', 'AI & Machine Learning', 1.0],
  ['Data Analysis',       'BELONGS_TO', 'Data Science',     1.0],
  ['Data Analysis',       'DEPENDS_ON', 'SQL',              0.75],

  /* ── Blockchain ─────────────────────────────────────────────────────── */
  ['Smart Contracts',     'BELONGS_TO', 'Blockchain',       1.0],
  ['Solidity',            'BELONGS_TO', 'Blockchain',       1.0],
  ['Solidity',            'USED_IN', 'Smart Contracts',     0.95],

  /* ── Game Dev ───────────────────────────────────────────────────────── */
  ['Unity',               'BELONGS_TO', 'Game Development', 1.0],
  ['Unreal Engine',       'BELONGS_TO', 'Game Development', 1.0],
  ['Unity',               'RELATED_TO', 'Unreal Engine',    0.75],

  /* ── CAD ────────────────────────────────────────────────────────────── */
  ['AutoCAD',             'USED_IN', 'CAD Design',          1.0],
  ['AutoCAD',             'USED_IN', 'Structural Design',   0.85],
  ['AutoCAD',             'USED_IN', 'Mechanical Design',   0.85],
  ['SolidWorks',          'USED_IN', 'Mechanical Design',   1.0],
  ['SolidWorks',          'USED_IN', 'CAD Design',          0.85],
  ['Revit',               'USED_IN', 'Interior Design',     0.85],
  ['Revit',               'USED_IN', 'Structural Design',   0.9],
  ['SketchUp',            'USED_IN', 'Interior Design',     0.9],
  ['SketchUp',            'USED_IN', 'Exterior Design',     0.85],
  ['Interior Architecture', 'BELONGS_TO', 'Interior Design', 1.0],
  ['Structural Engineering', 'BELONGS_TO', 'Structural Design', 1.0],

  /* ── Finance / Legal ────────────────────────────────────────────────── */
  ['QuickBooks',          'USED_IN', 'Bookkeeping',         1.0],
  ['QuickBooks',          'USED_IN', 'Accounting',          0.9],
  ['Xero',                'USED_IN', 'Bookkeeping',         1.0],
  ['Bookkeeping Skills',  'BELONGS_TO', 'Bookkeeping',      1.0],
  ['Accounting Skills',   'BELONGS_TO', 'Accounting',       1.0],
  ['Financial Modeling',  'BELONGS_TO', 'Financial Analysis', 1.0],
  ['Tax Filing',          'BELONGS_TO', 'Tax Preparation',  1.0],
  ['Contract Drafting',   'BELONGS_TO', 'Legal Consulting', 1.0],

  /* ── Audio ─────────────────────────────────────────────────────────── */
  ['FL Studio',           'USED_IN', 'Music Production',    0.9],
  ['Ableton Live',        'USED_IN', 'Music Production',    0.9],
  ['Ableton Live',        'USED_IN', 'Mixing & Mastering',  0.85],
  ['Logic Pro',           'USED_IN', 'Music Production',    0.9],
  ['Pro Tools',           'USED_IN', 'Mixing & Mastering',  0.95],
  ['Pro Tools',           'USED_IN', 'Audio Editing',       0.9],
  ['Podcast Editing',     'BELONGS_TO', 'Podcast Production', 1.0],
  ['Voice Recording',     'BELONGS_TO', 'Voice Over',       1.0],
  ['Sound Design',        'RELATED_TO', 'Music Production', 0.7],
  ['Sound Design',        'RELATED_TO', 'Game Development', 0.65],

  /* ── Marketing skills ───────────────────────────────────────────────── */
  ['SEO Optimization',    'BELONGS_TO', 'SEO',              1.0],
  ['Google Ads',          'BELONGS_TO', 'PPC Advertising',  1.0],
  ['Google Ads',          'BELONGS_TO', 'SEM',              0.9],
  ['Facebook Ads',        'BELONGS_TO', 'PPC Advertising',  1.0],
  ['Facebook Ads',        'BELONGS_TO', 'Social Media Marketing', 0.8],
  ['Instagram Marketing', 'BELONGS_TO', 'Social Media Marketing', 1.0],
  ['LinkedIn Marketing',  'BELONGS_TO', 'Social Media Marketing', 1.0],
  ['Content Marketing',   'BELONGS_TO', 'SEO',              0.8],
  ['Content Marketing',   'BELONGS_TO', 'Social Media Marketing', 0.8],
  ['Email Campaigns',     'BELONGS_TO', 'Email Marketing',  1.0],
  ['Brand Strategy',      'BELONGS_TO', 'Branding',         1.0],
  ['Branding',            'RELATED_TO', 'Brand Identity',   0.9],
  ['Branding',            'RELATED_TO', 'Logo Design',      0.8],
  ['Copywriting',         'RELATED_TO', 'SEO',              0.7],

  /* ── Business skills ────────────────────────────────────────────────── */
  ['Agile',               'BELONGS_TO', 'Project Management', 0.9],
  ['Scrum',               'BELONGS_TO', 'Project Management', 0.9],
  ['Scrum',               'RELATED_TO', 'Agile',            0.95],
  ['Virtual Assistant',   'BELONGS_TO', 'Virtual Assistance', 1.0],
  ['Data Entry Specialist','BELONGS_TO', 'Data Entry',      1.0],
  ['Recruiting',          'BELONGS_TO', 'Recruitment',      1.0],
  ['Customer Service',    'BELONGS_TO', 'Customer Support', 1.0],

  /* ── Writing cross-cutting ──────────────────────────────────────────── */
  ['Copywriting',         'RELATED_TO', 'Content Writing',  0.8],
  ['Copywriting',         'RELATED_TO', 'Ghostwriting',     0.7],
  ['Technical Writing',   'RELATED_TO', 'Content Writing',  0.7],
  ['Script Writing',      'RELATED_TO', 'Copywriting',      0.65],
  ['Script Writing',      'RELATED_TO', 'Video Editing',    0.6],

  /* ── Prerequisite chains (learning paths) ──────────────────────────── */
  ['HTML',                'PREREQUISITE', 'CSS',            1.0],
  ['CSS',                 'PREREQUISITE', 'JavaScript',     0.9],
  ['JavaScript',          'PREREQUISITE', 'React',          1.0],
  ['JavaScript',          'PREREQUISITE', 'Node.js',        0.9],
  ['React',               'PREREQUISITE', 'Next.js',        0.95],
  ['Node.js',             'PREREQUISITE', 'Express.js',     0.9],
  ['Python',              'PREREQUISITE', 'Django',         0.9],
  ['Python',              'PREREQUISITE', 'FastAPI',        0.9],
  ['Python',              'PREREQUISITE', 'Machine Learning', 0.85],
  ['Machine Learning',    'PREREQUISITE', 'Deep Learning',  0.9],
  ['JavaScript',          'PREREQUISITE', 'React Native',   0.85],
  ['PHP',                 'PREREQUISITE', 'Laravel',        0.9],
];

/* ═══════════════════════════════════════════════════════════════════════
   SEED EXECUTION
   ═══════════════════════════════════════════════════════════════════════ */

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  /* 1 — Upsert all nodes */
  console.log(`\n📦 Seeding ${NODE_DEFINITIONS.length} SkillNodes…`);
  const nodeMap = {}; // name → _id

  for (const def of NODE_DEFINITIONS) {
    const slug = slugify(def.name);
    const node = await SkillNode.findOneAndUpdate(
      { name: def.name },
      {
        $set: {
          slug,
          type:        def.type     || 'skill',
          description: def.description || '',
          aliases:     def.aliases  || [],
          synonyms:    def.synonyms || [],
          weight:      def.weight   ?? 1.0,
          icon:        def.icon     || '',
          color:       def.color    || '',
          status:      'active',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    nodeMap[def.name] = node._id;
    process.stdout.write('.');
  }
  console.log('\n✅ Nodes seeded');

  /* 2 — Upsert all relationships */
  console.log(`\n🔗 Seeding ${RELATIONSHIP_DEFINITIONS.length} SkillRelationships…`);
  let created = 0, skipped = 0;

  for (const [fromName, type, toName, weight] of RELATIONSHIP_DEFINITIONS) {
    const fromId = nodeMap[fromName];
    const toId   = nodeMap[toName];

    if (!fromId || !toId) {
      console.warn(`  ⚠️  Skip: "${fromName}" → "${toName}" (node not found)`);
      skipped++;
      continue;
    }

    await SkillRelationship.findOneAndUpdate(
      { from: fromId, to: toId, type },
      { $set: { weight: weight ?? 1.0 } },
      { upsert: true }
    );
    created++;
    process.stdout.write('.');
  }

  console.log(`\n✅ Relationships seeded (${created} created/updated, ${skipped} skipped)`);

  /* 3 — Add CHILD inverses automatically (every BELONGS_TO gets an inverse CHILD edge) */
  console.log('\n🔄 Adding inverse CHILD edges…');
  const belongsTo = await SkillRelationship.find({ type: 'BELONGS_TO' });
  for (const rel of belongsTo) {
    await SkillRelationship.findOneAndUpdate(
      { from: rel.to, to: rel.from, type: 'CHILD' },
      { $set: { weight: rel.weight } },
      { upsert: true }
    );
  }
  console.log('✅ Inverse CHILD edges added');

  console.log('\n🎉 Skill graph seeded successfully!\n');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
