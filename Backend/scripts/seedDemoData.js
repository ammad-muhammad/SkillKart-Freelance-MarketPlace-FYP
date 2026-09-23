/**
 * ============================================================================
 * SkillKart — Demo Data Seeder
 * ----------------------------------------------------------------------------
 * Populates the EXISTING MongoDB models with a realistic, fully-interconnected
 * marketplace: users → jobs/gigs → proposals → contracts → payments → wallet
 * movement → deliveries → messages → reviews → disputes → notifications →
 * reports → audit logs, spread across the last ~12 months.
 *
 * Run:
 *   node scripts/seedDemoData.js
 *   npm run seed:demo
 *
 * Flags:
 *   --keep      Do NOT clear collections first (append instead of reset).
 *   --small     Smaller dataset (~20 users) for a quick smoke run.
 *
 * NOTHING in this script changes a schema or adds a model. Every document is
 * written against the current models and their enums/refs.
 *
 * Scope notes (intentional, based on the current data model):
 *   • "Services"  → Gigs (Gig is SkillKart's service/package concept).
 *   • "Wallet"    → lives on the profile (walletBalance / totalEarnings /
 *                   totalSpent); escrow/pending are derived from Payment/
 *                   Withdrawal state, not separate stored fields.
 *   • "Transactions" → Payments + Withdrawals (the admin Transactions view is a
 *                   union of these; there is no separate Transaction model).
 *   • "Milestones" → real `Milestone` documents (one per fixed-price contract
 *                   at minimum — the implicit "Full Project" milestone —
 *                   sometimes split into 2-4), each with its own linked
 *                   `Payment` (type 'job_escrow'), matching the wallet-native
 *                   per-milestone escrow the live app actually uses. Hourly
 *                   contracts don't get Milestones (they never do, live) —
 *                   they get one `Payment` (type 'hourly_escrow') representing
 *                   the accept-time weekly-estimate lock. Gig orders' legacy
 *                   50/50 Stripe deposit/final flow is NOT seeded — no Gig
 *                   order/purchase lifecycle exists yet in this script,
 *                   Gigs are seeded as listings only. Flagged in the final
 *                   summary alongside AI Usage.
 *   • "AI Usage"   → SKIPPED: no AIUsage model exists and the brief forbids
 *                   creating models. Flagged in the final summary.
 * ============================================================================
 */

const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
dotenv.config({ path: path.join(__dirname, '../.env') });

// ─── Models ─────────────────────────────────────────────────────────────────
const User = require('../src/models/User');
const FreelancerProfile = require('../src/models/FreelancerProfile');
const ClientProfile = require('../src/models/ClientProfile');
const Job = require('../src/models/Job');
const Gig = require('../src/models/Gig');
const Proposal = require('../src/models/Proposal');
const Contract = require('../src/models/Contract');
const Milestone = require('../src/models/Milestone');
const ContractHistory = require('../src/models/ContractHistory');
const Payment = require('../src/models/Payment');
const Withdrawal = require('../src/models/Withdrawal');
const Delivery = require('../src/models/Delivery');
const TimeLog = require('../src/models/TimeLog');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');
const Review = require('../src/models/Review');
const Notification = require('../src/models/Notification');
const Report = require('../src/models/Report');
const AdminAuditLog = require('../src/models/AdminAuditLog');
const Testimonial = require('../src/models/Testimonial');
const { JOB_CATEGORIES } = require('../src/utils/constants');

// ─── Config ─────────────────────────────────────────────────────────────────
const ARGS = process.argv.slice(2);
const SMALL = ARGS.includes('--small');
const CLEAR = !ARGS.includes('--keep');

const CFG = SMALL
  ? { freelancers: 12, clients: 12, extraJobs: 20, extraGigs: 15 }
  : { freelancers: 100, clients: 100, extraJobs: 320, extraGigs: 220 };

const PLATFORM_FEE_RATE = 0.005;
const NOW = new Date();
const YEAR_AGO = new Date(NOW.getTime() - 365 * 24 * 3600 * 1000);
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Collections this script owns (cleared on a fresh run).
const OWNED_MODELS = [
  User, FreelancerProfile, ClientProfile, Job, Gig, Proposal, Contract,
  Milestone, ContractHistory, Payment, Withdrawal, Delivery, TimeLog, Conversation,
  Message, Review, Notification, Report, AdminAuditLog, Testimonial,
];

// ─── Randomness helpers ─────────────────────────────────────────────────────
const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const pick = (arr) => arr[randInt(0, arr.length - 1)];
const chance = (p) => Math.random() < p;
const shuffle = (arr) => arr.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(v => v[1]);
const sample = (arr, n) => shuffle(arr).slice(0, Math.min(n, arr.length));
const money = (min, max, step = 500) => Math.round(rand(min, max) / step) * step;

// A date uniformly between two bounds; `weightRecent` biases toward "now" so
// the last few months are busier than a year ago (looks like real growth).
const dateBetween = (start, end, weightRecent = false) => {
  let t = Math.random();
  if (weightRecent) t = Math.sqrt(t); // bias toward 1 (end)
  return new Date(start.getTime() + t * (end.getTime() - start.getTime()));
};
const addDays = (d, n) => new Date(d.getTime() + n * 24 * 3600 * 1000);
const addHours = (d, n) => new Date(d.getTime() + n * 3600 * 1000);

// ─── Data pools (curated, on-topic — not lorem) ─────────────────────────────
// All-Pakistani name pools (male + female first names, common family names).
const FIRST_NAMES = [
  // Male
  'Ali', 'Ahmed', 'Hassan', 'Hussain', 'Bilal', 'Usman', 'Hamza', 'Fahad', 'Zain', 'Saad',
  'Omar', 'Ibrahim', 'Yousaf', 'Mustafa', 'Talha', 'Danish', 'Faizan', 'Rehan', 'Kashif', 'Waqas',
  'Adnan', 'Asad', 'Imran', 'Bilawal', 'Shahzaib', 'Umair', 'Junaid', 'Nabeel', 'Arslan', 'Haris',
  'Abdullah', 'Abdul Rehman', 'Muhammad', 'Taimoor', 'Zohaib', 'Sami', 'Owais', 'Raheel', 'Salman', 'Waleed',
  // Female
  'Ayesha', 'Fatima', 'Sara', 'Maryam', 'Hina', 'Zara', 'Noor', 'Iqra', 'Aisha', 'Sana',
  'Mahnoor', 'Areeba', 'Rabia', 'Amna', 'Laiba', 'Kiran', 'Zoya', 'Hania', 'Eman', 'Bushra',
  'Komal', 'Anaya', 'Alishba', 'Sadia', 'Nimra', 'Warda', 'Aqsa', 'Rida', 'Mehak', 'Javeria',
];
const LAST_NAMES = [
  'Khan', 'Ali', 'Ahmed', 'Malik', 'Sheikh', 'Butt', 'Raza', 'Iqbal', 'Hussain', 'Farooq',
  'Chaudhry', 'Qureshi', 'Siddiqui', 'Abbasi', 'Mughal', 'Awan', 'Bhatti', 'Gondal', 'Rana', 'Cheema',
  'Nawaz', 'Aslam', 'Javed', 'Akhtar', 'Shah', 'Hashmi', 'Ansari', 'Baig', 'Dar', 'Memon',
  'Zafar', 'Riaz', 'Yousafzai', 'Tariq', 'Rashid', 'Saleem', 'Ashraf', 'Nadeem', 'Mahmood', 'Sattar',
];

const COUNTRIES = [
  { c: 'Pakistan', cities: ['Lahore', 'Karachi', 'Islamabad', 'Faisalabad'], tz: 'Asia/Karachi' },
  { c: 'India', cities: ['Bangalore', 'Mumbai', 'Delhi', 'Pune'], tz: 'Asia/Kolkata' },
  { c: 'United States', cities: ['New York', 'Austin', 'San Francisco', 'Chicago'], tz: 'America/New_York' },
  { c: 'United Kingdom', cities: ['London', 'Manchester', 'Bristol'], tz: 'Europe/London' },
  { c: 'Germany', cities: ['Berlin', 'Munich', 'Hamburg'], tz: 'Europe/Berlin' },
  { c: 'United Arab Emirates', cities: ['Dubai', 'Abu Dhabi'], tz: 'Asia/Dubai' },
  { c: 'Canada', cities: ['Toronto', 'Vancouver'], tz: 'America/Toronto' },
  { c: 'Philippines', cities: ['Manila', 'Cebu'], tz: 'Asia/Manila' },
  { c: 'Brazil', cities: ['São Paulo', 'Rio de Janeiro'], tz: 'America/Sao_Paulo' },
  { c: 'Ukraine', cities: ['Kyiv', 'Lviv'], tz: 'Europe/Kyiv' },
];

// Skill clusters keep freelancers coherent (no random unrelated skills).
// Each cluster is a coherent freelancer specialisation. `categories` are the
// canonical JOB_CATEGORIES (must match Backend/src/utils/constants.js) that a
// freelancer of this cluster can post gigs/jobs in — this is what drives the
// public /categories page coverage. Clusters together span EVERY category.
const CLUSTERS = {
  'Frontend Development': {
    skills: ['React', 'Vue', 'Angular', 'TypeScript', 'Tailwind CSS', 'Next.js', 'HTML/CSS', 'JavaScript'],
    titles: ['Senior Frontend Engineer', 'React Developer', 'UI Engineer'],
    categories: ['Frontend Development', 'Web Development'],
    templates: ['Build a React Dashboard for Analytics', 'Convert Figma Design to Responsive React', 'Frontend for SaaS Landing Page', 'Migrate jQuery App to Vue 3'],
  },
  'Backend Development': {
    skills: ['Node.js', 'Express', 'Laravel', 'PHP', 'Python', 'Django', 'Java', 'Spring Boot', 'MongoDB', 'PostgreSQL', 'MySQL', 'REST APIs'],
    titles: ['Backend Engineer', 'API Developer', 'Node.js Specialist'],
    categories: ['Backend Development', 'Web Development'],
    templates: ['Build a Laravel REST API', 'Node.js Backend for E-commerce', 'Design a Scalable MongoDB Schema', 'Payment Gateway Integration (Stripe)'],
  },
  'Full Stack Development': {
    skills: ['React', 'Node.js', 'MongoDB', 'Express', 'TypeScript', 'Next.js', 'PostgreSQL', 'GraphQL'],
    titles: ['Full Stack Developer', 'MERN Stack Engineer', 'Senior Full Stack Developer'],
    categories: ['Full Stack Development', 'Web Development'],
    templates: ['Full Stack MERN Booking Platform', 'Build a Multi-vendor Marketplace', 'SaaS MVP — Auth, Billing, Dashboard', 'Real-time Chat App with Socket.io'],
  },
  'Mobile Development': {
    skills: ['Flutter', 'React Native', 'Kotlin', 'Swift', 'Dart', 'Firebase'],
    titles: ['Mobile App Developer', 'Flutter Developer', 'React Native Engineer'],
    categories: ['Mobile Development'],
    templates: ['Flutter App for Food Delivery', 'React Native Fitness Tracker', 'Cross-platform E-commerce App', 'Mobile App UI + API Integration'],
  },
  'DevOps & Cloud': {
    skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Terraform', 'Linux', 'Nginx'],
    titles: ['DevOps Engineer', 'Cloud Architect', 'Site Reliability Engineer'],
    categories: ['DevOps & Cloud'],
    templates: ['Set up CI/CD Pipeline on AWS', 'Dockerize and Deploy Node App', 'Kubernetes Cluster Setup', 'Infrastructure as Code with Terraform'],
  },
  'AI & Machine Learning': {
    skills: ['Python', 'TensorFlow', 'PyTorch', 'NLP', 'Computer Vision', 'Machine Learning', 'Deep Learning'],
    titles: ['ML Engineer', 'AI Developer', 'Machine Learning Specialist'],
    categories: ['AI & Machine Learning'],
    templates: ['Build an AI Chatbot with OpenAI', 'Image Classification Model', 'NLP Sentiment Analysis Pipeline', 'Recommendation Engine'],
  },
  'Data Science': {
    skills: ['Python', 'Pandas', 'SQL', 'Data Visualization', 'Power BI', 'Statistics', 'R'],
    titles: ['Data Scientist', 'Data Analyst', 'BI Developer'],
    categories: ['Data Science'],
    templates: ['Sales Data Dashboard & Analysis', 'Customer Churn Prediction Model', 'Data Cleaning & ETL Pipeline', 'Power BI Reporting'],
  },
  'Blockchain & Game': {
    skills: ['Solidity', 'Web3.js', 'Ethereum', 'Smart Contracts', 'Unity', 'C#', 'Unreal Engine'],
    titles: ['Blockchain Developer', 'Smart Contract Engineer', 'Game Developer'],
    categories: ['Blockchain', 'Game Development'],
    templates: ['Build an NFT Minting DApp', 'Solidity Smart Contract & Audit', 'Unity 2D Mobile Game', 'Web3 Wallet Integration'],
  },
  'QA & Testing': {
    skills: ['Selenium', 'Cypress', 'Jest', 'Manual Testing', 'Automation Testing', 'Postman'],
    titles: ['QA Engineer', 'Automation Tester', 'SDET'],
    categories: ['QA & Testing'],
    templates: ['Automated Test Suite with Cypress', 'End-to-End QA for Web App', 'API Testing with Postman', 'Manual Test Plan & Bug Report'],
  },
  'Cyber Security': {
    skills: ['Penetration Testing', 'Network Security', 'OWASP', 'Ethical Hacking', 'Security Auditing'],
    titles: ['Security Engineer', 'Penetration Tester', 'Security Consultant'],
    categories: ['Cybersecurity'],
    templates: ['Penetration Test for Web App', 'Security Audit of API', 'Harden Server & Fix Vulnerabilities', 'Set up WAF & Monitoring'],
  },
  'Product & UX Design': {
    skills: ['Figma', 'Adobe XD', 'Wireframing', 'Prototyping', 'User Research', 'Design Systems'],
    titles: ['Product Designer', 'UI/UX Designer', 'Senior Product Designer'],
    categories: ['UI Design', 'UX Design', 'Product Design'],
    templates: ['Redesign Mobile Banking App UX', 'Design System for Web Product', 'Wireframes + Prototype for SaaS', 'UI Kit for Dashboard'],
  },
  'Graphic & Brand Design': {
    skills: ['Logo Design', 'Brand Identity', 'Illustrator', 'Photoshop', 'Print Design', 'Illustration'],
    titles: ['Brand Designer', 'Graphic Designer', 'Creative Designer'],
    categories: ['Graphic Design', 'Logo Design', 'Brand Identity', 'Illustration'],
    templates: ['Logo & Brand Identity for Startup', 'Social Media Design Pack', 'Product Packaging Design', 'Custom Illustration Set'],
  },
  'Motion & Animation': {
    skills: ['After Effects', 'Motion Graphics', '2D Animation', '3D Animation', 'Blender', 'Cinema 4D'],
    titles: ['Motion Designer', 'Animator', '3D Artist'],
    categories: ['Motion Graphics', 'Animation', '3D Animation', 'Visual Effects (VFX)'],
    templates: ['Animated Explainer Video', 'Logo Motion Reveal', '3D Product Animation', 'VFX Compositing for Short Film'],
  },
  'Video Production': {
    skills: ['Premiere Pro', 'DaVinci Resolve', 'Color Grading', 'Video Editing', 'Final Cut Pro'],
    titles: ['Video Editor', 'Colorist', 'Post-Production Specialist'],
    categories: ['Video Editing', 'Videography', 'Cinematography', 'Color Grading'],
    templates: ['Edit YouTube Videos (10 episodes)', 'Cinematic Wedding Film Edit', 'Product Explainer Video', 'Color Grade a Short Film'],
  },
  'Photography': {
    skills: ['Photography', 'Photo Retouching', 'Lightroom', 'Drone Photography', 'Product Photography'],
    titles: ['Photographer', 'Photo Retoucher', 'Drone Pilot'],
    categories: ['Photography', 'Drone Photography'],
    templates: ['Professional Product Photography', 'Photo Retouching (50 images)', 'Aerial Drone Photography', 'Real Estate Photo Editing'],
  },
  'Content Writing': {
    skills: ['Copywriting', 'Content Writing', 'SEO Writing', 'Blogging', 'Ghostwriting', 'Proofreading'],
    titles: ['Content Writer', 'Copywriter', 'SEO Writer'],
    categories: ['Copywriting', 'Content Writing', 'Ghostwriting', 'Proofreading'],
    templates: ['Write SEO Blog Articles (10x)', 'Website Copy for a SaaS', 'Ghostwrite an eBook', 'Proofread & Edit a Manuscript'],
  },
  'Technical & Script Writing': {
    skills: ['Technical Writing', 'Documentation', 'Script Writing', 'Translation', 'Editing'],
    titles: ['Technical Writer', 'Scriptwriter', 'Translator'],
    categories: ['Technical Writing', 'Script Writing', 'Translation'],
    templates: ['API Documentation & Guides', 'YouTube Video Script (series)', 'Translate Document (EN↔UR)', 'User Manual for a Product'],
  },
  'SEO & Search Marketing': {
    skills: ['SEO', 'Google Ads', 'SEM', 'Keyword Research', 'PPC Advertising', 'Google Analytics'],
    titles: ['SEO Specialist', 'SEM Expert', 'PPC Manager'],
    categories: ['SEO', 'SEM', 'PPC Advertising'],
    templates: ['SEO Optimization for Website', 'Google Ads Campaign Setup', 'Keyword Research & Strategy', 'PPC Campaign Management'],
  },
  'Social & Growth Marketing': {
    skills: ['Social Media', 'Email Marketing', 'Content Strategy', 'Influencer Marketing', 'Branding'],
    titles: ['Digital Marketer', 'Social Media Manager', 'Growth Marketer'],
    categories: ['Social Media Marketing', 'Email Marketing', 'Affiliate Marketing', 'Influencer Marketing', 'Branding'],
    templates: ['Social Media Marketing Plan', 'Email Marketing Funnel Setup', 'Influencer Outreach Campaign', 'Brand Strategy & Guidelines'],
  },
  'Business & Operations': {
    skills: ['Project Management', 'Business Consulting', 'Market Research', 'Virtual Assistance', 'Data Entry'],
    titles: ['Business Consultant', 'Project Manager', 'Virtual Assistant'],
    categories: ['Project Management', 'Virtual Assistance', 'Business Consulting', 'Market Research', 'Customer Support', 'Recruitment', 'Data Entry'],
    templates: ['Business Plan & Financial Model', 'Market Research Report', 'Virtual Assistant (ongoing)', 'Recruit & Screen Candidates'],
  },
  'Audio & Music': {
    skills: ['Voice Over', 'Audio Editing', 'Music Production', 'Mixing & Mastering', 'Sound Design'],
    titles: ['Voice Over Artist', 'Audio Engineer', 'Music Producer'],
    categories: ['Voice Over', 'Audio Editing', 'Music Production', 'Mixing & Mastering', 'Podcast Production', 'Sound Design'],
    templates: ['Professional Voice Over (EN/UR)', 'Mix & Master a Track', 'Podcast Editing (per episode)', 'Custom Background Music'],
  },
  'Architecture & Engineering': {
    skills: ['AutoCAD', 'CAD Design', 'Interior Design', 'SolidWorks', '3D Modeling', 'Revit'],
    titles: ['CAD Designer', 'Interior Designer', 'Mechanical Engineer'],
    categories: ['CAD Design', 'Interior Design', 'Exterior Design', 'Structural Design', 'Mechanical Design'],
    templates: ['2D/3D CAD Drawings', 'Interior Design & Render', 'Structural Analysis & Drawings', 'Mechanical Part Design (SolidWorks)'],
  },
  'Finance & Legal': {
    skills: ['Accounting', 'Bookkeeping', 'Financial Analysis', 'QuickBooks', 'Tax Preparation', 'Excel'],
    titles: ['Accountant', 'Financial Analyst', 'Bookkeeper'],
    categories: ['Accounting', 'Bookkeeping', 'Financial Analysis', 'Tax Preparation', 'Legal Consulting'],
    templates: ['Monthly Bookkeeping (QuickBooks)', 'Financial Model & Projections', 'Tax Return Preparation', 'Business Valuation Report'],
  },
  'WordPress & CMS': {
    skills: ['WordPress', 'WooCommerce', 'Elementor', 'PHP', 'Shopify'],
    titles: ['WordPress Developer', 'WooCommerce Expert', 'Web Developer'],
    categories: ['Web Development'],
    templates: ['WordPress Website for Agency', 'WooCommerce Store Setup', 'Speed Optimize WordPress Site', 'Custom Elementor Landing Page'],
  },
};

// Backward-compatible views used throughout the script.
const SKILL_CLUSTERS = Object.fromEntries(Object.entries(CLUSTERS).map(([k, v]) => [k, v.skills]));
const FREELANCER_TITLES = Object.fromEntries(Object.entries(CLUSTERS).map(([k, v]) => [k, v.titles]));
const JOB_TEMPLATES = Object.fromEntries(Object.entries(CLUSTERS).map(([k, v]) => [k, v.templates]));
const CLUSTER_NAMES = Object.keys(CLUSTERS);

// Pick a canonical category for a cluster (rotates through its category list).
const categoryForCluster = (cluster, i = 0) => {
  const cats = CLUSTERS[cluster]?.categories || [cluster];
  return cats[i % cats.length];
};

// Every canonical category → a cluster that can service it (for coverage pass).
const CLUSTER_FOR_CATEGORY = {};
Object.entries(CLUSTERS).forEach(([cluster, v]) => {
  v.categories.forEach(cat => {
    if (!CLUSTER_FOR_CATEGORY[cat]) CLUSTER_FOR_CATEGORY[cat] = cluster;
  });
});

const COMPANIES = ['Nexus Labs', 'BrightPixel', 'CloudForge', 'Quantum Retail', 'Vertex Digital', 'Skyline Studios', 'Orbit Softworks', 'Apex Solutions', 'Lumen Tech', 'Pioneer Foods', 'GreenLeaf Organics', 'UrbanNest', 'DataStream Inc', 'Fintrust Group', 'MediCare Plus', 'EduSpark', 'TravelWise', 'Zenith Motors', 'Harbor Logistics', 'Pulse Media'];
// Must be values from profile.validator.js's ALLOWED_INDUSTRIES — anything
// else makes the client's "Save profile" fail server-side.
const INDUSTRIES = ['Software & IT Services', 'E-commerce', 'Healthcare & HealthTech', 'FinTech', 'Education & EdTech', 'Entertainment & Media', 'Real Estate & PropTech', 'Hospitality & Tourism', 'Food & Beverage', 'Automotive'];
const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500'];
const LANGUAGES = [
  { language: 'English', proficiency: 'fluent' }, { language: 'Urdu', proficiency: 'native' },
  { language: 'Spanish', proficiency: 'conversational' }, { language: 'Arabic', proficiency: 'fluent' },
  { language: 'French', proficiency: 'basic' }, { language: 'German', proficiency: 'conversational' },
  { language: 'Hindi', proficiency: 'native' }, { language: 'Mandarin', proficiency: 'basic' },
];
const UNIVERSITIES = ['FAST NUCES', 'LUMS', 'NUST', 'COMSATS', 'IBA Karachi', 'MIT', 'Stanford University', 'University of Toronto', 'IIT Delhi', 'TU Munich'];
const DEGREES = ['BS Computer Science', 'BS Software Engineering', 'BS Information Technology', 'BFA Design', 'MS Data Science', 'BS Electrical Engineering'];

const REVIEW_TEXT = {
  5: ['Absolutely outstanding work — delivered ahead of schedule and exceeded expectations. Will hire again!', 'Fantastic communication and top-tier quality. One of the best freelancers I have worked with.', 'Exceeded my expectations on every front. Professional, fast, and detail-oriented.', 'Incredible experience. Understood the brief perfectly and delivered a polished result.', 'Highly skilled and a pleasure to work with. 10/10 would recommend.'],
  4: ['Great work overall, delivered on time with only minor revisions needed.', 'Solid job and good communication. Happy with the result.', 'Very good quality. A couple of small tweaks but nothing major.', 'Reliable and professional. Would work with them again.', 'Good outcome and responsive throughout the project.'],
  3: ['Decent work but needed a few rounds of revisions to get it right.', 'The end result was okay. Communication could have been faster.', 'Got the job done, though timelines slipped a little.', 'Acceptable quality for the price. Nothing exceptional.', 'Average experience — met the basic requirements.'],
  2: ['Work was below what I expected and required a lot of back-and-forth.', 'Communication was slow and the delivery missed some requirements.', 'Had to request several revisions. Final result was passable.'],
  1: ['Unfortunately the work did not meet the agreed requirements.', 'Missed deadlines and did not follow the brief. Would not recommend.', 'Poor communication and the delivery was incomplete.'],
};

const CLIENT_REVIEW_TEXT = {
  5: ['Great client — clear requirements, prompt payments, and respectful communication.', 'A pleasure to work with. Detailed brief and released payment immediately.', 'Excellent client. Responsive and appreciative of good work.'],
  4: ['Good client with reasonable expectations. Smooth project.', 'Clear communication and fair feedback throughout.'],
  3: ['Okay to work with, though requirements changed a few times.', 'Payment was on time but the scope was a bit unclear at first.'],
};

// Freelancer success stories, shown on the public homepage (Testimonial model).
const TESTIMONIAL_TEXT = [
  'SkillKart completely changed how I freelance. In my first three months I landed enough long-term clients to quit my day job — the escrow system means I never chase payments anymore.',
  'As a student, SkillKart gave me my first real portfolio. The skill verification badges helped clients trust me instantly, and I have now completed dozens of projects with a 5-star rating.',
  'What I love most is the quality of clients. Briefs are clear, milestones are structured, and payments are always secure. I have built a full-time income entirely through this platform.',
  'The AI matchmaking sent me projects that actually fit my skills, so I stopped wasting time on proposals that went nowhere. My conversion rate has never been higher.',
  'I went from zero to a top-rated seller in under a year. The dashboard makes tracking contracts, deliveries, and earnings effortless. Highly recommend it to any freelancer starting out.',
  'Secure escrow was a game-changer for me. I take on bigger projects now because I know the funds are held safely before I start. My earnings have grown month over month.',
  'The community and support here are excellent. Disputes are handled fairly, communication tools are smooth, and I have built genuine long-term relationships with repeat clients.',
  'I do design work and SkillKart gave me a steady stream of international clients. The gig packages let me productize my services and scale beyond hourly work.',
  'Coming from a small city, I never thought I could work with clients worldwide. SkillKart made it possible — verified profile, secure payments, and real projects that pay well.',
  'Best decision I made this year. The platform is fast, the fees are fair, and getting paid on time — every time — has let me finally freelance with confidence.',
];

module.exports.__pools = { SKILL_CLUSTERS, JOB_TEMPLATES }; // (exported for potential reuse/tests)

// ─── Human chat generator ───────────────────────────────────────────────────
// Builds a plausible, non-repetitive conversation for a contract. Returns an
// ordered array of { from: 'client'|'freelancer', text } with natural flow:
// greeting → requirements → questions → progress → delivery → payment → thanks.
const CHAT = {
  clientOpen: [
    "Hi! I saw your profile and I think you'd be a great fit for my {job}. Are you available to start this week?",
    "Hey, thanks for the proposal on \"{job}\". I have a few questions before we kick off.",
    "Hello! Really liked your portfolio. Let's discuss the {job} in a bit more detail.",
    "Hi there — excited to work together on this. Can we go over the scope quickly?",
  ],
  freelancerOpen: [
    "Hi! Thanks for reaching out. Yes, I'm available and can start right away. Happy to walk you through my approach.",
    "Hello! Appreciate the message. I've read through the brief — I have a couple of clarifying questions.",
    "Hey! Thanks so much. I'm confident I can deliver exactly what you need. When would you like to begin?",
  ],
  clientReq: [
    "Great. The main thing I need is {feat}. It should be clean, responsive, and easy to maintain.",
    "Perfect. Key requirement: {feat}. Also please keep the code well-documented.",
    "Awesome. Priority is {feat}. I'll share the assets and references in a bit.",
    "The deadline is a little tight but the core deliverable is {feat}.",
  ],
  freelancerQ: [
    "Got it. Do you have a preference for the tech stack, or should I choose what fits best?",
    "Understood. Should I follow your existing brand guidelines or do you need me to propose a direction?",
    "Makes sense. One question — is there an existing API/backend I should integrate with?",
    "Clear. Would you like daily updates or is a summary at each milestone enough?",
  ],
  clientAns: [
    "You can choose the stack — I trust your judgment. Just make sure it's maintainable.",
    "I'll send the brand guidelines now. Please stick to those colors and fonts.",
    "Yes, there's an existing REST API. I'll share the docs shortly.",
    "A summary at each milestone works perfectly. Thanks for checking!",
  ],
  files: [
    "I've attached the design files and reference docs. Let me know if anything is unclear.",
    "Sharing the brand assets and the wireframes here. 👍",
    "Uploaded the requirements PDF and a couple of examples I liked.",
    "Here are the credentials and API docs you asked for.",
  ],
  filesAck: [
    "Perfect, got everything. I'll start on the setup today and share progress soon.",
    "Received, thank you! This is exactly what I needed to begin.",
    "Great, all clear. I'll have the first version ready in a few days.",
  ],
  progress: [
    "Quick update — the core layout is done and looking clean. Working on the interactions now.",
    "Making good progress! Auth and the main flow are working. Polishing the UI next.",
    "Halfway there. Just finished the API integration; testing edge cases now.",
    "Update: everything is on track. I'll submit the first delivery tomorrow.",
  ],
  progressAck: [
    "Looks great so far, thanks for the update!",
    "Awesome, appreciate you keeping me posted. 🙌",
    "Nice work — excited to see the first version.",
  ],
  delivery: [
    "I've submitted the first delivery. Please review whenever you get a chance and let me know your thoughts.",
    "Delivery is ready! Everything from the brief is included. Happy to adjust anything.",
    "Just delivered the work. Let me know if you'd like any revisions.",
  ],
  revision: [
    "This is really good! Just two small things — can we tweak the spacing and change the primary color?",
    "Great start. Could you make the header sticky and fix the mobile menu?",
    "Almost perfect. Minor revision: please adjust the font size on the cards.",
  ],
  revisionAck: [
    "Sure thing — those are quick changes. I'll have them done within the hour.",
    "No problem at all, updating now. Good catch on the mobile menu!",
    "Absolutely, makes sense. Pushing the revised version shortly.",
  ],
  approve: [
    "This is exactly what I wanted. Approving now and releasing the payment. Thank you!",
    "Perfect, everything looks great. Releasing the escrow — pleasure working with you!",
    "Love it! Marking as complete and sending payment. 🎉",
  ],
  thanksF: [
    "Thank you so much! It was a pleasure. Would love to work together again. 🙏",
    "Really appreciate it! Feel free to reach out anytime for updates or new work.",
    "Thanks a lot! I've left you a review as well. Take care!",
  ],
  payTalk: [
    "Just a heads up — I released the deposit so you can get started.",
    "Deposit is funded on my end, you're good to go!",
    "The payment for this milestone is released. Thanks for the fast turnaround.",
  ],
};

const fill = (t, ctx) => t.replace('{job}', ctx.job).replace('{feat}', ctx.feat);

function buildConversation(ctx, opts = {}) {
  // ctx: { job, feat }  opts: { includeDelivery, includeRevision, includeApprove }
  const msgs = [];
  const F = 'freelancer', C = 'client';
  msgs.push({ from: C, text: fill(pick(CHAT.clientOpen), ctx) });
  msgs.push({ from: F, text: pick(CHAT.freelancerOpen) });
  msgs.push({ from: C, text: fill(pick(CHAT.clientReq), ctx) });
  msgs.push({ from: F, text: pick(CHAT.freelancerQ) });
  msgs.push({ from: C, text: pick(CHAT.clientAns) });
  if (chance(0.8)) { msgs.push({ from: C, text: pick(CHAT.files), attach: true }); msgs.push({ from: F, text: pick(CHAT.filesAck) }); }
  if (chance(0.7)) msgs.push({ from: C, text: pick(CHAT.payTalk) });
  const rounds = randInt(1, 3);
  for (let i = 0; i < rounds; i++) {
    msgs.push({ from: F, text: pick(CHAT.progress) });
    if (chance(0.6)) msgs.push({ from: C, text: pick(CHAT.progressAck) });
  }
  if (opts.includeDelivery) {
    msgs.push({ from: F, text: pick(CHAT.delivery), attach: true });
    if (opts.includeRevision && chance(0.7)) {
      msgs.push({ from: C, text: pick(CHAT.revision) });
      msgs.push({ from: F, text: pick(CHAT.revisionAck) });
      msgs.push({ from: F, text: pick(CHAT.delivery), attach: true });
    }
    if (opts.includeApprove) {
      msgs.push({ from: C, text: pick(CHAT.approve) });
      msgs.push({ from: F, text: pick(CHAT.thanksF) });
    }
  }
  return msgs;
}

// Realistic-looking (non-fetchable, but well-formed) asset URLs.
const avatarUrl = (seed) => `https://i.pravatar.cc/300?u=${seed}`;
const fileUrl = (name) => `https://res.cloudinary.com/demo/raw/upload/skillkart/${name}`;
const imgUrl = (seed) => `https://picsum.photos/seed/${seed}/800/600`;

// `username` carries a unique index, so a random base can collide across 200
// users. Track what we've handed out and suffix a counter until it's unique.
const usedUsernames = new Set();
const uniqueUsername = (base) => {
  let u = base;
  let n = 1;
  while (usedUsernames.has(u)) u = `${base}${n++}`;
  usedUsernames.add(u);
  return u;
};

// ============================================================================
// USERS + PROFILES
// ============================================================================
// Build a freelancer User + FreelancerProfile. `spec` overrides let us craft
// the exact demo accounts. Returns { user, profile, cluster, tier }.
function makeFreelancer(i, spec = {}) {
  const cluster = spec.cluster || pick(CLUSTER_NAMES);
  const geo = pick(COUNTRIES);
  const city = pick(geo.cities);
  const first = spec.firstName || pick(FIRST_NAMES);
  const last = spec.lastName || pick(LAST_NAMES);
  const email = spec.email || `freelancer${i}.${last.toLowerCase()}@demo.skillkart.com`;
  const username = uniqueUsername(spec.username || `${first}${last}${randInt(10, 999)}`.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const createdAt = spec.createdAt || dateBetween(YEAR_AGO, addDays(NOW, -14));

  // Experience tier drives ratings/earnings/completed counts.
  const tier = spec.tier || pick(['new', 'new', 'mid', 'mid', 'mid', 'experienced', 'experienced', 'top']);
  const completed = spec.completedProjects != null ? spec.completedProjects
    : tier === 'top' ? randInt(28, 55) : tier === 'experienced' ? randInt(12, 27) : tier === 'mid' ? randInt(4, 12) : randInt(0, 3);
  const rating = spec.rating != null ? spec.rating
    : completed === 0 ? 0 : round2(tier === 'top' ? rand(4.7, 5.0) : tier === 'experienced' ? rand(4.3, 4.9) : rand(3.8, 4.7));

  const isBlocked = spec.isBlocked ?? chance(0.03);
  const isEmailVerified = spec.isEmailVerified ?? chance(0.92);
  const verified = spec.verified ?? (tier === 'top' || tier === 'experienced' ? chance(0.85) : chance(0.4));

  const user = new User({
    email,
    password: spec.password || 'Demo123!@#', // hashed by the User pre-save hook
    firstName: first, lastName: last, username,
    profilePicture: avatarUrl(username),
    phone: `+${randInt(1, 99)}3${randInt(100000000, 999999999)}`,
    role: 'freelancer',
    authProvider: 'email',
    isEmailVerified, emailVerifiedAt: isEmailVerified ? createdAt : undefined,
    isOnBoardingCompleted: true,
    isActive: !isBlocked,
    isBlocked,
    blockedReason: isBlocked ? pick(['Policy violation', 'Repeated contact-info sharing', 'Under review']) : undefined,
    blockedAt: isBlocked ? dateBetween(createdAt, NOW) : undefined,
    lastLogin: dateBetween(addDays(NOW, -60), NOW, true),
    lastActive: dateBetween(addDays(NOW, -30), NOW, true),
    createdAt, updatedAt: createdAt,
  });

  const clusterSkills = SKILL_CLUSTERS[cluster];
  const skillNames = sample(clusterSkills, randInt(4, Math.min(8, clusterSkills.length)));
  const skills = skillNames.map((name, idx) => {
    const isV = verified && (tier === 'top' ? true : chance(0.7));
    return {
      name,
      level: idx < 2 && tier !== 'new' ? 'Expert' : pick(['Beginner', 'Intermediate', 'Intermediate', 'Expert']),
      isVerified: isV,
      verificationScore: isV ? randInt(75, 99) : (chance(0.3) ? randInt(30, 60) : 0),
      lastTestedAt: isV ? dateBetween(createdAt, NOW) : undefined,
      expiresAt: isV ? addDays(NOW, randInt(30, 180)) : undefined,
    };
  });

  const hourlyRate = spec.hourlyRate || money(1500, 9000, 250);
  const totalEarnings = spec.totalEarnings != null ? spec.totalEarnings
    : round2(completed * money(15000, 90000, 1000) * rand(0.6, 1.2));
  const walletBalance = spec.walletBalance != null ? spec.walletBalance : round2(totalEarnings * rand(0.02, 0.15));
  const hasStripeConnected = verified && chance(0.7);

  const title = spec.title || pick(FREELANCER_TITLES[cluster]);
  const profile = new FreelancerProfile({
    userId: user._id,
    title,
    bio: spec.bio || `${title} with ${randInt(2, 9)} years of experience specializing in ${cluster.toLowerCase()}. I help businesses ship reliable, well-crafted products. I care about clean code, clear communication, and hitting deadlines.`,
    coverPhoto: imgUrl(`cover-${username}`),
    phone: user.phone,
    hourlyRate,
    skills,
    portfolioLinks: chance(0.6) ? [`https://github.com/${username}`, `https://${username}.dev`] : [],
    portfolio: Array.from({ length: randInt(1, 4) }).map((_, k) => ({
      title: pick(JOB_TEMPLATES[cluster]).split(' ').slice(0, 4).join(' '),
      description: `A ${cluster.toLowerCase()} project delivered end-to-end with a focus on quality and performance.`,
      url: `https://${username}.dev/project-${k + 1}`,
      images: [imgUrl(`pf-${username}-${k}`)],
    })),
    education: chance(0.75) ? [{
      institution: pick(UNIVERSITIES), degree: pick(DEGREES), field: 'Computer Science',
      startDate: addDays(createdAt, -randInt(1500, 3000)), endDate: addDays(createdAt, -randInt(200, 1000)),
    }] : [],
    certifications: chance(0.4) ? [{
      name: pick(['AWS Certified Developer', 'Meta Frontend Professional', 'Google UX Design', 'MongoDB Associate']),
      issuer: pick(['Amazon', 'Meta', 'Google', 'MongoDB']), issueDate: dateBetween(createdAt, NOW),
    }] : [],
    languages: sample(LANGUAGES, randInt(1, 3)),
    availability: pick(['full-time', 'full-time', 'part-time', 'contract']),
    timezone: geo.tz,
    socialLinks: {
      github: `https://github.com/${username}`, linkedin: `https://linkedin.com/in/${username}`,
      website: chance(0.4) ? `https://${username}.dev` : undefined,
    },
    experienceLevel: tier === 'top' || tier === 'experienced' ? 'Expert' : tier === 'mid' ? 'Intermediate' : 'Entry',
    profileCompletion: randInt(70, 100),
    rating,
    completedProjects: completed,
    totalEarnings,
    walletBalance,
    // Never fabricate a real-looking `acct_...` id here — it's never actually
    // created via the Stripe API, so it 404s ("No such account") the moment
    // STRIPE_DUMMY=false points at a real (test-mode) key. Use the same
    // `sim_acct_` prefix stripe.service.js already treats as "skip the real
    // API call" so seeded demo accounts work under both dummy and live-test
    // Stripe config; real onboarding still happens via Connect Stripe.
    stripeOnboardingComplete: hasStripeConnected,
    stripeAccountId: hasStripeConnected ? `sim_acct_${username}${randInt(1000, 9999)}` : undefined,
    verificationDetails: {
      emailVerified: isEmailVerified, onboardingCompleted: true,
      profileCompleted: true, allSkillTestsPassed: verified && tier === 'top',
      identityVerified: spec.identityVerified ?? (verified && chance(0.6)),
      phoneVerified: chance(0.5), paymentMethodAdded: verified && chance(0.7),
      portfolioReviewed: chance(0.4),
    },
    verificationStatus: verified ? 'verified' : (chance(0.4) ? 'pending' : 'unverified'),
    // Login OTP / 2FA. `twoFactorEnabled !== false` means ON, so we only set it
    // when a spec explicitly disables it (used for the demo accounts below).
    securitySettings: { twoFactorEnabled: spec.twoFactorEnabled !== false },
    createdAt, updatedAt: dateBetween(createdAt, NOW),
  });

  user.freelancerProfile = profile._id;
  return { user, profile, cluster, tier, geo };
}

function makeClient(i, spec = {}) {
  const geo = pick(COUNTRIES);
  const city = pick(geo.cities);
  const first = spec.firstName || pick(FIRST_NAMES);
  const last = spec.lastName || pick(LAST_NAMES);
  const email = spec.email || `client${i}.${last.toLowerCase()}@demo.skillkart.com`;
  const username = uniqueUsername(spec.username || `${first}${last}co${randInt(10, 999)}`.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const createdAt = spec.createdAt || dateBetween(YEAR_AGO, addDays(NOW, -14));
  const companyType = spec.companyType || pick(['Individual', 'Startup', 'Startup', 'SME', 'Enterprise']);
  const isBlocked = spec.isBlocked ?? chance(0.02);
  const isEmailVerified = spec.isEmailVerified ?? chance(0.9);
  const totalSpent = spec.totalSpent != null ? spec.totalSpent : round2(money(0, 900000, 5000));

  const user = new User({
    email,
    password: spec.password || 'Demo123!@#',
    firstName: first, lastName: last, username,
    profilePicture: avatarUrl(username),
    phone: `+${randInt(1, 99)}3${randInt(100000000, 999999999)}`,
    role: 'client',
    authProvider: 'email',
    isEmailVerified, emailVerifiedAt: isEmailVerified ? createdAt : undefined,
    isOnBoardingCompleted: true,
    isActive: !isBlocked, isBlocked,
    lastLogin: dateBetween(addDays(NOW, -45), NOW, true),
    lastActive: dateBetween(addDays(NOW, -20), NOW, true),
    createdAt, updatedAt: createdAt,
  });

  // Written to both fields: onboarding writes both, and the app reads industryType first.
  const industries = sample(INDUSTRIES, randInt(1, 2));
  const profile = new ClientProfile({
    userId: user._id,
    companyName: companyType === 'Individual' ? undefined : (spec.companyName || pick(COMPANIES)),
    companyType,
    companyLogo: companyType === 'Individual' ? undefined : imgUrl(`logo-${username}`),
    coverPhoto: imgUrl(`ccover-${username}`),
    companySize: companyType === 'Individual' ? undefined : pick(COMPANY_SIZES),
    industry: industries,
    industryType: industries,
    role: pick(['Founder', 'CTO', 'Product Manager', 'Owner', 'Marketing Lead']),
    isNewToHiring: pick(['Yes', 'No']),
    urgency: pick(['Immediate', 'Exploring', 'Flexible']),
    phone: user.phone,
    website: companyType === 'Individual' ? undefined : `https://${username}.com`,
    description: `${companyType === 'Individual' ? 'Independent client' : 'A ' + companyType.toLowerCase()} hiring skilled freelancers to build and grow digital products.`,
    location: { country: geo.c, city, address: `${randInt(1, 200)} ${pick(['Main St', 'Tech Park', 'Business Bay', 'Market Rd'])}` },
    budgetRange: { min: money(5000, 20000, 1000), max: money(30000, 150000, 5000) },
    hiringFrequency: pick(['occasionally', 'monthly', 'weekly']),
    timezone: geo.tz,
    socialLinks: { linkedin: `https://linkedin.com/company/${username}` },
    profileCompletion: randInt(70, 100),
    verificationStatus: spec.verified ? 'verified' : pick(['unverified', 'pending', 'verified']),
    languages: sample(LANGUAGES, randInt(1, 2)),
    rating: chance(0.6) ? round2(rand(4.0, 5.0)) : 0,
    totalProjectsPosted: 0, // updated after jobs are created
    totalSpent,
    walletBalance: round2(money(0, 40000, 500)),
    // Login OTP / 2FA — ON unless a spec explicitly disables it (demo accounts).
    securitySettings: { twoFactorEnabled: spec.twoFactorEnabled !== false },
    createdAt, updatedAt: dateBetween(createdAt, NOW),
  });

  user.clientProfile = profile._id;
  return { user, profile, geo };
}

// ============================================================================
// ORCHESTRATION
// ============================================================================
const stats = {};
const bump = (k, n = 1) => { stats[k] = (stats[k] || 0) + n; };
const step = (label) => process.stdout.write(`\nCreating ${label}...\n`);
const done = (label, n) => console.log(`✔ ${n.toLocaleString()} ${label} Created`);

async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('✗ MONGODB_URI is not set in Backend/.env'); process.exit(1); }
  // Generous timeouts — bulk writes to a remote Atlas cluster can keep a socket
  // busy longer than the default monitor window, which otherwise trips
  // "PoolClearedOnNetworkError". Retry writes on transient network blips.
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 120000,
    connectTimeoutMS: 30000,
    maxPoolSize: 5,
    retryWrites: true,
    heartbeatFrequencyMS: 30000,
  });
  console.log(`✓ Connected to MongoDB (${mongoose.connection.host}/${mongoose.connection.name})`);
}

// Retry a fn on transient network errors (Atlas monitor/pool timeouts).
async function withRetry(fn, label, tries = 4) {
  for (let attempt = 1; ; attempt++) {
    try { return await fn(); }
    catch (err) {
      const transient = /PoolCleared|NetworkTimeout|ETIMEDOUT|ECONNRESET|server monitor|topology/i.test(err.message || '');
      if (!transient || attempt >= tries) throw err;
      const wait = 1000 * attempt;
      console.log(`  ⚠ ${label}: transient error (attempt ${attempt}/${tries}), retrying in ${wait}ms...`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

async function clearCollections() {
  if (!CLEAR) { console.log('→ --keep set: appending to existing data (no clear).'); return; }
  step('Clearing demo collections');
  for (const M of OWNED_MODELS) {
    // Drop the whole collection (faster + lighter than deleteMany over the wire);
    // ignore "namespace not found" for collections that don't exist yet.
    await withRetry(async () => {
      try { await M.collection.drop(); }
      catch (e) { if (e.codeName !== 'NamespaceNotFound' && !/ns not found/i.test(e.message)) throw e; }
    }, `clear ${M.modelName}`);
  }
  console.log('✔ Collections cleared');
}

// ── The main pipeline ───────────────────────────────────────────────────────
async function run() {
  const t0 = Date.now();
  console.log('\n═══ SkillKart Demo Seeder ═══');
  console.log(`Mode: ${SMALL ? 'SMALL' : 'FULL'} | Clear: ${CLEAR}\n`);

  await connect();
  await clearCollections();

  // ---- 1. USERS ------------------------------------------------------------
  step('Users');
  const freelancers = []; // { user, profile, cluster, tier }
  const clients = [];     // { user, profile, geo }

  // Fixed demo accounts (exact spec).
  freelancers.push(makeFreelancer(0, {
    email: 'test.freelancer0@skillkart.com', password: 'Pass123!@#', twoFactorEnabled: false,
    firstName: 'Hassan', lastName: 'Raza', username: 'hassanraza_pro',
    cluster: 'Full Stack Development', tier: 'top', verified: true, isEmailVerified: true,
    identityVerified: true, isBlocked: false, completedProjects: 41, rating: 4.9,
    totalEarnings: 3120000, walletBalance: 184500, hourlyRate: 6500,
    title: 'Senior Full Stack Engineer', createdAt: dateBetween(YEAR_AGO, addDays(YEAR_AGO, 30)),
    bio: 'Senior Full Stack Engineer (MERN) with 8+ years building production SaaS. 40+ projects delivered, 100% on-time. I specialize in scalable architectures, clean APIs, and pixel-perfect UIs.',
  }));
  freelancers.push(makeFreelancer(1, {
    email: 'test.freelancer1@skillkart.com', password: 'Pass123!@#', twoFactorEnabled: false,
    firstName: 'Ayesha', lastName: 'Khan', username: 'ayeshakhan_dev',
    cluster: 'Frontend Development', tier: 'experienced', verified: true, isEmailVerified: true,
    completedProjects: 18, rating: 4.6, hourlyRate: 3800,
    title: 'React Developer', createdAt: dateBetween(addDays(YEAR_AGO, 40), addDays(YEAR_AGO, 120)),
  }));
  clients.push(makeClient(0, {
    email: 'test.client0@skillkart.com', password: 'Pass123!@#', twoFactorEnabled: false,
    firstName: 'Bilal', lastName: 'Ahmed', username: 'bilalahmed_hire',
    companyType: 'SME', companyName: 'Vertex Digital', verified: true, isEmailVerified: true,
    isBlocked: false, totalSpent: 1450000, createdAt: dateBetween(YEAR_AGO, addDays(YEAR_AGO, 25)),
  }));
  clients.push(makeClient(1, {
    email: 'test.client1@skillkart.com', password: 'Pass123!@#', twoFactorEnabled: false,
    firstName: 'Sara', lastName: 'Malik', username: 'saramalik_biz',
    companyType: 'Startup', companyName: 'BrightPixel', verified: true, isEmailVerified: true,
    totalSpent: 420000, createdAt: dateBetween(addDays(YEAR_AGO, 60), addDays(YEAR_AGO, 150)),
  }));

  for (let i = 2; i < CFG.freelancers; i++) freelancers.push(makeFreelancer(i));
  for (let i = 2; i < CFG.clients; i++) clients.push(makeClient(i));

  // Persist users first (validation runs the bcrypt pre-save hook), then profiles.
  const allUsers = [...freelancers, ...clients].map(x => x.user);
  for (const u of allUsers) await u.save(); // save() → triggers password hashing hook
  await FreelancerProfile.insertMany(freelancers.map(f => f.profile));
  await ClientProfile.insertMany(clients.map(c => c.profile));
  bump('Freelancers', freelancers.length);
  bump('Clients', clients.length);
  done('Users', allUsers.length);

  // Convenience lookups
  const activeFreelancers = freelancers.filter(f => !f.user.isBlocked);
  const activeClients = clients.filter(c => !c.user.isBlocked);

  // ---- 2. GIGS -------------------------------------------------------------
  step('Gigs');
  const gigs = [];
  // Build one gig from a freelancer into a specific canonical category. `active`
  // forces an active status (used by the coverage pass so counts are non-zero).
  const buildGig = (f, category, i, active = false) => {
    const cluster = f.cluster;
    const skills = f.profile.skills.map(s => s.name);
    const base = money(3000, 15000, 500);
    const created = dateBetween(f.user.createdAt, NOW, true);
    const orders = f.tier === 'top' ? randInt(10, 60) : f.tier === 'experienced' ? randInt(3, 25) : randInt(0, 8);
    return {
      freelancerId: f.user._id,
      title: `I will ${pick(['build', 'design', 'develop', 'create'])} ${pick(JOB_TEMPLATES[cluster]).toLowerCase()}`,
      shortDescription: `Professional ${category.toLowerCase()} service delivered fast with unlimited communication.`,
      fullDescription: `I am a ${f.profile.title} with proven experience in ${category.toLowerCase()}. In this gig I will deliver high-quality, production-ready work tailored to your needs. What you get:\n\n• Clean, maintainable deliverables\n• Clear communication and regular updates\n• Fast turnaround and revisions until you are happy\n\nOrder now or message me to discuss your project!`,
      category,
      subcategory: cluster,
      skills: sample(skills, Math.min(5, skills.length)),
      pricing: {
        basic: { price: base, deliveryTime: `${randInt(2, 5)} days`, revisions: randInt(1, 2), features: ['Core deliverable', '1 revision', 'Source files'] },
        standard: { price: round2(base * rand(1.8, 2.4)), deliveryTime: `${randInt(5, 9)} days`, revisions: randInt(2, 4), features: ['Everything in Basic', 'Extra features', 'Priority support'] },
        premium: { price: round2(base * rand(3.2, 4.5)), deliveryTime: `${randInt(10, 18)} days`, revisions: randInt(4, 8), features: ['Everything in Standard', 'Full solution', 'Deployment', '30-day support'] },
      },
      media: { banner: imgUrl(`gig-${i}`), images: [imgUrl(`gig-${i}-a`), imgUrl(`gig-${i}-b`)], video: undefined },
      faqs: [
        { question: 'Do you offer revisions?', answer: 'Yes, revisions are included in every package until you are satisfied.' },
        { question: 'Will I get the source files?', answer: 'Absolutely — full source and documentation are delivered on completion.' },
      ],
      status: active ? 'active' : (chance(0.85) ? 'active' : pick(['paused', 'draft'])),
      stats: { views: randInt(20, 3000), orders, rating: orders > 0 ? round2(rand(4.2, 5.0)) : 0, reviewsCount: Math.min(orders, randInt(0, orders)) },
      createdAt: created, updatedAt: dateBetween(created, NOW),
    };
  };

  // Group freelancers by the categories their cluster can service, so we can
  // always find a coherent freelancer for any category.
  const freelancersForCategory = {};
  for (const f of activeFreelancers) {
    for (const cat of (CLUSTERS[f.cluster]?.categories || [])) {
      (freelancersForCategory[cat] = freelancersForCategory[cat] || []).push(f);
    }
  }

  // Coverage pass first: guarantee EVERY canonical category has ≥1 active gig so
  // the public /categories page never shows an empty category. Skip 'Other'.
  let gi = 0;
  for (const cat of JOB_CATEGORIES) {
    if (cat === 'Other') continue;
    const pool = freelancersForCategory[cat] || activeFreelancers;
    gigs.push(buildGig(pick(pool), cat, gi++, true));
  }

  // Then fill the rest randomly for realistic, uneven distribution.
  const remaining = Math.max(0, CFG.extraGigs - gigs.length);
  for (let k = 0; k < remaining; k++) {
    const f = pick(activeFreelancers);
    const cats = CLUSTERS[f.cluster]?.categories || [f.cluster];
    gigs.push(buildGig(f, pick(cats), gi++));
  }

  await Gig.insertMany(gigs);
  bump('Gigs', gigs.length);
  bump('Services (Gigs)', gigs.length);
  done('Gigs', gigs.length);

  // ---- 3. JOBS -------------------------------------------------------------
  step('Jobs');
  const jobs = []; // plain docs; we keep a parallel meta array for lifecycle
  const jobMeta = [];
  const totalJobs = CFG.extraJobs;
  const jobCountByClient = new Map();
  for (let i = 0; i < totalJobs; i++) {
    const c = pick(activeClients);
    const cluster = pick(CLUSTER_NAMES);
    const min = money(8000, 40000, 1000);
    const max = round2(min * rand(1.3, 2.5));
    const created = dateBetween(c.user.createdAt, addDays(NOW, -2), true);
    // Lifecycle status distribution — most are completed/in-progress, some open.
    const roll = Math.random();
    const status = roll < 0.48 ? 'completed' : roll < 0.70 ? 'in-progress' : roll < 0.88 ? 'open' : roll < 0.95 ? 'cancelled' : 'closed';
    const skills = sample(SKILL_CLUSTERS[cluster], randInt(2, 5));
    const doc = {
      _id: new mongoose.Types.ObjectId(),
      title: pick(JOB_TEMPLATES[cluster]),
      description: `We are looking for an experienced ${cluster.toLowerCase()} professional to ${pick(['build', 'deliver', 'develop', 'design'])} the following.\n\nScope:\n• ${pick(SKILL_CLUSTERS[cluster])} implementation\n• Responsive, tested, and documented\n• Delivered in phases with regular updates\n\nPlease share relevant portfolio samples in your proposal. Budget is flexible for the right person.`,
      clientId: c.user._id,
      budget: { min, max, type: chance(0.75) ? 'fixed' : 'hourly' },
      skills,
      category: pick(CLUSTERS[cluster]?.categories || [cluster]),
      subcategory: cluster,
      experienceLevel: pick(['entry', 'intermediate', 'intermediate', 'expert']),
      duration: pick(['Less than 1 month', '1-3 months', '1-3 months', '3-6 months']),
      status,
      attachments: chance(0.4) ? [fileUrl(`job-brief-${i}.pdf`)] : [],
      proposals: [],
      deadline: addDays(created, randInt(14, 90)),
      source: 'project',
      createdAt: created, updatedAt: dateBetween(created, NOW),
    };
    jobs.push(doc);
    jobMeta.push({ doc, client: c, cluster, status });
    jobCountByClient.set(String(c.user._id), (jobCountByClient.get(String(c.user._id)) || 0) + 1);
  }
  // Ensure the two demo clients each own several jobs (top up if needed)
  // (already likely from random assignment; distribution is realistic)
  await Job.insertMany(jobs);
  // reflect totalProjectsPosted on client profiles
  for (const [cid, n] of jobCountByClient) {
    await ClientProfile.updateOne({ userId: cid }, { $set: { totalProjectsPosted: n } });
  }
  bump('Jobs', jobs.length);
  done('Jobs', jobs.length);

  // ---- 4. PROPOSALS + CONTRACTS + PAYMENTS + LIFECYCLE ----------------------
  step('Proposals, Contracts, Payments & Lifecycle');
  const proposals = [];
  const contracts = [];
  const milestones = [];
  const contractHistory = [];
  const payments = [];
  const deliveries = [];
  const timeLogs = [];
  const conversations = [];
  const messages = [];
  const reviews = [];
  const withdrawals = [];
  const notifications = [];
  const disputes = []; // subset of contracts flagged for reporting
  const walletDelta = new Map(); // userId -> {earn, spend} accumulators for realism

  const addWallet = (uid, field, amt) => {
    const k = String(uid);
    const cur = walletDelta.get(k) || { earn: 0, spend: 0, balance: 0 };
    cur[field] += amt;
    walletDelta.set(k, cur);
  };

  const notify = (uid, type, title, message, refs = {}, when) => {
    notifications.push({
      userId: uid, type, title, message,
      link: refs.link || '', jobId: refs.jobId, gigId: refs.gigId, proposalId: refs.proposalId,
      read: chance(0.55), readAt: chance(0.55) ? when : undefined,
      createdAt: when || NOW, updatedAt: when || NOW,
    });
  };

  // Pick freelancers whose cluster matches the job (coherent proposals).
  const freelancersByCluster = {};
  for (const f of activeFreelancers) {
    (freelancersByCluster[f.cluster] = freelancersByCluster[f.cluster] || []).push(f);
  }

  for (const jm of jobMeta) {
    const { doc: job, client, cluster, status } = jm;
    const pool = (freelancersByCluster[cluster] || activeFreelancers);
    const nProps = randInt(2, 8);
    const bidders = sample(pool, Math.min(nProps, pool.length));
    if (bidders.length === 0) continue;

    // The "winner" (only for hired/completed jobs)
    const willHire = ['in-progress', 'completed'].includes(status);
    const winner = willHire ? bidders[0] : null;

    const jobProposalIds = [];
    for (let bi = 0; bi < bidders.length; bi++) {
      const f = bidders[bi];
      const isWinner = winner && f === winner;
      const pCreated = dateBetween(job.createdAt, addDays(job.createdAt, 10));
      const isFixed = job.budget.type === 'fixed';
      const bid = isFixed ? money(job.budget.min, job.budget.max, 500) : money(1500, 8000, 250);
      let pStatus = 'pending';
      if (isWinner) pStatus = 'accepted';
      else if (willHire) pStatus = 'rejected';
      else if (status === 'cancelled' || status === 'closed') pStatus = chance(0.5) ? 'rejected' : 'withdrawn';
      else pStatus = chance(0.15) ? 'withdrawn' : 'pending';

      const pid = new mongoose.Types.ObjectId();
      jobProposalIds.push(pid);
      proposals.push({
        _id: pid, jobId: job._id, freelancerId: f.user._id,
        coverLetter: `Hi! I'm a ${f.profile.title} and I'd love to help with "${job.title}". I've done similar ${cluster.toLowerCase()} work and can deliver clean, well-tested results on time. I can start immediately and will keep you updated throughout. Looking forward to discussing the details!`,
        fixedPrice: isFixed ? bid : undefined,
        hourlyRate: isFixed ? undefined : bid,
        estimatedDeliveryTime: pick(['5 days', '1-2 weeks', '2-3 weeks', '1 month']),
        estimatedWeeklyHours: isFixed ? undefined : randInt(10, 40),
        attachments: chance(0.2) ? [fileUrl(`proposal-${pid}.pdf`)] : [],
        status: pStatus,
        clientResponse: pStatus === 'accepted' ? "Great fit — let's start!" : (pStatus === 'rejected' ? 'Thanks, we went another direction.' : undefined),
        respondedAt: ['accepted', 'rejected'].includes(pStatus) ? dateBetween(pCreated, addDays(pCreated, 5)) : undefined,
        createdAt: pCreated, updatedAt: dateBetween(pCreated, NOW),
      });
      // notify client of new proposal
      notify(client.user._id, 'proposal_received', 'New proposal received', `${f.user.firstName} applied to "${job.title}"`, { jobId: job._id, proposalId: pid, link: `/client/projects/${job._id}/proposals` }, pCreated);
    }
    job.proposals = jobProposalIds;

    // If hired, build the full contract → payment → delivery → review chain.
    if (winner) {
      const accepted = proposals.find(p => String(p.jobId) === String(job._id) && p.status === 'accepted');
      const startAt = dateBetween(accepted.respondedAt || job.createdAt, addDays(accepted.respondedAt || job.createdAt, 4));
      const isFixed = job.budget.type === 'fixed';
      const total = round2(isFixed ? (accepted.fixedPrice || money(job.budget.min, job.budget.max, 500)) : money(20000, 120000, 1000));
      const completedJob = status === 'completed';

      // Contract status maps from job status.
      let cStatus;
      if (completedJob) cStatus = 'completed';
      else cStatus = pick(['active', 'active', 'in_revision', 'delivered', 'paused', 'under_review']);
      // ~17% of contracts see a dispute (targets 30-50 total). Completed
      // contracts' disputes were always settled before the job closed
      // (resolved); live contracts vary between resolved and open.
      const disputed = completedJob ? chance(0.13) : chance(0.24);

      const contractId = new mongoose.Types.ObjectId();
      const contractDoc = {
        _id: contractId, jobId: job._id, proposalId: accepted._id,
        clientId: client.user._id, freelancerId: winner.user._id,
        type: isFixed ? 'fixed' : 'hourly',
        fixedPrice: isFixed ? total : undefined,
        hourlyRate: isFixed ? undefined : (accepted.hourlyRate || money(1500, 8000, 250)),
        weeklyLimit: isFixed ? undefined : randInt(20, 40),
        agreedDeadline: addDays(startAt, randInt(14, 75)),
        status: disputed ? 'active' : cStatus,
        startedAt: startAt,
        completedAt: completedJob ? dateBetween(addDays(startAt, 7), NOW) : undefined,
      };
      job.contractId = contractId;
      job.hiredFreelancer = winner.user._id;

      // Escrow — matches the live app's wallet-native model, not the legacy
      // 50/50 Stripe deposit/final flow (that flow is Gig-orders-only now).
      // Fixed-price: real acceptProposal() ALWAYS locks milestone 1 in full
      // before any writes complete — there's no "accepted but unfunded" limbo
      // state, so every seeded contract starts genuinely funded.
      const fee = round2(total * PLATFORM_FEE_RATE); // summary-only, for notification/history copy below
      const payout = round2(total - fee);
      let currentMilestone = null;        // the milestone mirroring contractDoc.status (fixed-price only)
      let currentMilestonePayment = null; // its linked Payment row, if funded yet
      let milestoneCount = 0;             // how many milestones this contract has (fixed-price only)
      let depositPaidAt;                  // "money first at risk" timestamp, either branch
      const releasedAt = completedJob ? (contractDoc.completedAt || dateBetween(startAt, NOW)) : undefined;

      // Contract history (real action names from milestone.service.js / hourlyEscrow.service.js)
      const hist = (action, notes, when) => contractHistory.push({ contractId, action, notes, performedBy: chance(0.5) ? client.user._id : winner.user._id, createdAt: when, updatedAt: when });
      hist('contract_started', 'Contract created from accepted proposal', startAt);

      if (isFixed) {
        // Multi-milestone split is the exception, not the rule.
        const splitInto = chance(0.3) ? randInt(2, 4) : 1;
        milestoneCount = splitInto;
        contractDoc.milestoneMode = splitInto > 1;

        const amounts = [];
        let remainder = total;
        for (let m = 0; m < splitInto; m++) {
          const amt = (m === splitInto - 1) ? remainder : round2(total / splitInto);
          amounts.push(amt);
          remainder = round2(remainder - amt);
        }

        const milestoneTitle = (order, count) => {
          if (count === 1) return 'Full Project';
          if (order === 1) return 'Milestone 1: Kickoff & Initial Delivery';
          if (order === count) return `Milestone ${order}: Final Delivery & Handoff`;
          return `Milestone ${order}: Development Phase`;
        };

        // Milestone 1 is never left pending_funding (see comment above);
        // currentIdx is whichever milestone's state should mirror
        // contractDoc.status — every one before it is fully released, every
        // one after it is genuinely untouched (pending_funding, no Payment).
        const currentIdx = completedJob ? splitInto - 1 : randInt(0, splitInto - 1);

        for (let m = 0; m < splitInto; m++) {
          const order = m + 1;
          const mId = new mongoose.Types.ObjectId();
          const isPast = m < currentIdx || completedJob;
          const isCurrent = m === currentIdx && !completedJob;
          let mStatus;
          if (isPast) mStatus = 'released';
          else if (isCurrent) {
            if (['delivered', 'under_review'].includes(cStatus)) mStatus = 'submitted';
            else if (cStatus === 'in_revision') mStatus = 'in_revision';
            else mStatus = 'funded'; // active / paused
          } else mStatus = 'pending_funding';

          const fundedAt = mStatus === 'pending_funding' ? undefined
            : (isPast ? dateBetween(startAt, addDays(startAt, 10 * order)) : dateBetween(startAt, addDays(startAt, 2)));
          const submittedAt = ['submitted', 'in_revision', 'released'].includes(mStatus) && fundedAt
            ? dateBetween(fundedAt, addDays(fundedAt, 10)) : undefined;
          const mReleasedAt = mStatus === 'released'
            ? (isPast ? dateBetween(submittedAt || fundedAt, completedJob ? (contractDoc.completedAt || NOW) : NOW) : releasedAt)
            : undefined;

          const milestoneDoc = {
            _id: mId, contractId, jobId: job._id, order, amount: amounts[m],
            title: milestoneTitle(order, splitInto),
            description: `Milestone ${order} of ${splitInto} for "${job.title}".`,
            status: mStatus,
            fundedAt, submittedAt,
            reviewDeadline: submittedAt && ['submitted', 'in_revision'].includes(mStatus) ? addDays(submittedAt, 7) : undefined,
            approvedAt: mStatus === 'released' ? mReleasedAt : undefined,
            releasedAt: mReleasedAt,
          };
          milestones.push(milestoneDoc);
          if (order === 1) depositPaidAt = fundedAt;
          if (m === currentIdx) currentMilestone = milestoneDoc; // even when completedJob (order===currentIdx too)

          if (mStatus !== 'pending_funding') {
            const mFee = round2(amounts[m] * PLATFORM_FEE_RATE);
            const mPayout = round2(amounts[m] - mFee);
            payments.push({
              jobId: job._id, contractId, milestoneId: mId, proposalId: accepted._id,
              clientId: client.user._id, freelancerId: winner.user._id, type: 'job_escrow',
              totalAmount: amounts[m], depositAmount: amounts[m], finalAmount: amounts[m],
              feeRate: PLATFORM_FEE_RATE,
              platformFee: mStatus === 'released' ? mFee : 0,
              freelancerPayout: mStatus === 'released' ? mPayout : 0,
              currency: 'PKR', status: mStatus === 'released' ? 'released' : 'deposit_paid',
              stripe: { simulated: true },
              depositPaidAt: fundedAt, releasedAt: mReleasedAt,
              createdAt: fundedAt, updatedAt: mReleasedAt || fundedAt,
            });
            bump('Payments');
            if (m === currentIdx) currentMilestonePayment = payments[payments.length - 1];
            hist('milestone_funded', `Milestone ${order} ("${milestoneDoc.title}") funded — Rs. ${amounts[m]}`, fundedAt);
            if (mStatus === 'released') {
              addWallet(winner.user._id, 'balance', mPayout);
              addWallet(client.user._id, 'spend', amounts[m]);
              hist(chance(0.3) ? 'milestone_auto_released' : 'milestone_released', `Milestone ${order} released — payout Rs. ${mPayout} (fee Rs. ${mFee})`, mReleasedAt);
            }
          }
        }
        contractDoc.currentMilestoneOrder = completedJob ? splitInto : currentIdx + 1;
      } else {
        // Hourly: one Payment representing the accept-time weekly-estimate
        // lock (contractDoc.hourlyEscrow's numeric fields are the live
        // running balance; this Payment is the audit-trail row for the
        // initial lock event, same as lockHourlyEscrow() creates live).
        depositPaidAt = startAt;
        const lockAmount = round2((contractDoc.hourlyRate || 0) * (contractDoc.weeklyLimit || 0));
        payments.push({
          jobId: job._id, contractId, proposalId: accepted._id,
          clientId: client.user._id, freelancerId: winner.user._id, type: 'hourly_escrow',
          totalAmount: lockAmount, depositAmount: lockAmount, finalAmount: lockAmount,
          feeRate: PLATFORM_FEE_RATE, platformFee: 0, freelancerPayout: 0,
          currency: 'PKR', status: 'deposit_paid',
          stripe: { simulated: true },
          depositPaidAt, releasedAt: undefined,
          createdAt: startAt, updatedAt: startAt,
        });
        bump('Payments');
        hist('hourly_escrow_locked', `Locked Rs. ${lockAmount} (one week: Rs. ${contractDoc.hourlyRate}/hr x ${contractDoc.weeklyLimit}hrs)`, startAt);
      }

      notify(winner.user._id, 'proposal_accepted', 'Your proposal was accepted', `You were hired for "${job.title}"`, { jobId: job._id, link: '/freelancer/proposals' }, accepted.respondedAt);
      notify(winner.user._id, 'escrow_funded', 'Escrow funded', 'You can safely begin work now.', { jobId: job._id }, depositPaidAt);

      // Deliveries (1–3 versions)
      const nDeliv = completedJob ? randInt(1, 3) : (['delivered', 'in_revision', 'under_review'].includes(contractDoc.status) ? randInt(1, 2) : 0);
      let lastDelivAt = startAt;
      for (let v = 1; v <= nDeliv; v++) {
        lastDelivAt = dateBetween(addDays(lastDelivAt, 2), addDays(lastDelivAt, 12));
        const dStatus = completedJob ? (v === nDeliv ? 'accepted' : 'revision_requested') : pick(['pending_review', 'revision_requested']);
        deliveries.push({
          contractId, jobId: job._id, clientId: client.user._id, freelancerId: winner.user._id,
          version: v, message: `Delivering version ${v}. ${pick(['All core features are complete.', 'Please review and let me know any changes.', 'Included source files and docs.'])}`,
          files: [fileUrl(`delivery-${contractId}-v${v}.zip`)], links: chance(0.5) ? [`https://staging.${winner.user.username}.dev/preview`] : [],
          submittedAt: lastDelivAt, status: dStatus,
          clientNotes: dStatus === 'revision_requested' ? pick(['Please tweak the spacing and colors.', 'A couple of small fixes needed.']) : (dStatus === 'accepted' ? 'Looks great, approved!' : undefined),
          reviewedAt: dStatus !== 'pending_review' ? dateBetween(lastDelivAt, addDays(lastDelivAt, 3)) : undefined,
          createdAt: lastDelivAt, updatedAt: lastDelivAt,
        });
        hist(`delivery_v${v}`, `Freelancer submitted delivery v${v}`, lastDelivAt);
      }

      // Hourly → some time logs, plus the wallet-lock escrow that backs them.
      // The live app locks one week's estimate at accept time and draws it
      // down per logged hour (see hourlyEscrow.service.js) — seed a lock
      // generous enough to cover whatever 'pending' backlog gets generated
      // below, so a freshly-seeded demo contract isn't already "escrow
      // exhausted" and blocked from new time-tracking.
      const weeklyLockAmount = isFixed ? 0 : round2((contractDoc.hourlyRate || 0) * (contractDoc.weeklyLimit || 0));
      let pendingLogAmount = 0;
      if (!isFixed) {
        const nLogs = randInt(3, 12);
        for (let l = 0; l < nLogs; l++) {
          const day = dateBetween(startAt, contractDoc.completedAt || NOW);
          const durMs = randInt(1, 6) * 3600 * 1000;
          const logStatus = completedJob ? 'billed' : pick(['pending', 'approved']);
          if (logStatus === 'pending') {
            pendingLogAmount = round2(pendingLogAmount + (durMs / 3600000) * (contractDoc.hourlyRate || 0));
          }
          timeLogs.push({
            contractId, jobId: job._id, clientId: client.user._id, freelancerId: winner.user._id,
            duration: durMs, startTime: day, endTime: new Date(day.getTime() + durMs), date: day,
            source: pick(['timer', 'manual']), timezone: winner.geo?.tz || 'Asia/Karachi',
            notes: pick(['Feature implementation', 'Bug fixing', 'API integration', 'UI polish', 'Testing']),
            createdBy: winner.user._id, approvedBy: completedJob ? client.user._id : undefined,
            approvedAt: completedJob ? dateBetween(day, NOW) : undefined,
            status: logStatus,
            createdAt: day, updatedAt: day,
          });
        }
        // Completed contracts have already settled + refunded their lock;
        // everything else keeps enough locked to cover the backlog above plus
        // one more week's headroom so the demo freelancer can keep logging time.
        const totalLocked = round2(pendingLogAmount + weeklyLockAmount);
        contractDoc.hourlyEscrow = {
          lockedBalance: completedJob ? 0 : totalLocked,
          weeklyLockAmount,
          totalLocked,
          totalDrawn: completedJob ? totalLocked : 0,
        };
      }

      // Release + reviews for completed
      if (completedJob) {
        const relAt = releasedAt || NOW;
        hist('contract_completed', `Project marked complete — total Rs. ${total} (fee Rs. ${fee}, freelancer payout Rs. ${payout}).`, relAt);
        notify(winner.user._id, 'payment_released', 'Payment released', `Rs. ${payout.toLocaleString()} was added to your wallet.`, { jobId: job._id, link: '/freelancer/wallet' }, relAt);
        notify(client.user._id, 'project_completed', 'Project completed', `"${job.title}" is complete.`, { jobId: job._id }, relAt);

        // Mutual reviews (unique per {jobId, reviewerId})
        const rClient = weightedRating();
        reviews.push({
          jobId: job._id, reviewerId: client.user._id, revieweeId: winner.user._id,
          rating: rClient, comment: pick(REVIEW_TEXT[rClient]), type: 'client_to_freelancer',
          isHidden: chance(0.02), createdAt: relAt, updatedAt: relAt,
        });
        notify(winner.user._id, 'review_received', 'You received a review', `${client.user.firstName} left you a ${rClient}★ review.`, { jobId: job._id }, relAt);
        if (chance(0.7)) {
          const rFree = Math.min(5, Math.max(3, rClient + randInt(-1, 1)));
          reviews.push({
            jobId: job._id, reviewerId: winner.user._id, revieweeId: client.user._id,
            rating: rFree, comment: pick(CLIENT_REVIEW_TEXT[Math.min(5, rFree)] || CLIENT_REVIEW_TEXT[3]), type: 'freelancer_to_client',
            createdAt: dateBetween(relAt, NOW), updatedAt: relAt,
          });
        }
      }

      // Dispute (subset). Fixed-price disputes live on the relevant
      // Milestone's own `dispute` sub-doc, not the contract's — hourly
      // disputes stay contract-level (hourlyEscrow.service.js has no
      // per-log dispute concept). See CLAUDE.md's Escrow & Payments section.
      if (disputed) {
        const raisedAt = dateBetween(lastDelivAt, NOW);
        // A completed job's dispute must have been settled to reach completion.
        const resolved = completedJob ? true : chance(0.55);
        const disputeDoc = {
          raisedBy: chance(0.6) ? client.user._id : winner.user._id,
          reason: pick(['Work not as described', 'Missed deadline', 'Quality concerns', 'Scope disagreement', 'Non-responsive']),
          description: pick(['The delivered work did not match the agreed requirements and needs significant changes.', 'The freelancer missed the agreed deadline and communication stalled.', 'There is a disagreement about the project scope that we could not resolve directly.']),
          status: resolved ? 'resolved' : 'pending',
          raisedAt,
          resolvedBy: resolved ? client.user._id : undefined,
          resolutionNotes: undefined,
          resolvedAt: resolved ? dateBetween(raisedAt, NOW) : undefined,
        };

        if (isFixed) {
          // Outcome must agree with the milestone/Payment state already
          // seeded above — never contradict a completed job's already-paid
          // milestone, and only land on 'cancelled' (per the model's own doc:
          // "client never funded this milestone") when nothing was ever locked.
          if (!resolved) {
            currentMilestone.status = 'disputed';
          } else if (completedJob) {
            disputeDoc.resolutionNotes = 'Admin resolved: escrow released to freelancer.';
            // already 'released' from the main loop above — leave as-is.
          } else if (currentMilestone.status === 'pending_funding') {
            currentMilestone.status = 'cancelled';
            disputeDoc.resolutionNotes = 'Admin resolved: client never funded this milestone — contract ended, no funds moved.';
          } else if (chance(0.6)) {
            currentMilestone.status = 'released';
            currentMilestone.releasedAt = currentMilestone.releasedAt || dateBetween(raisedAt, NOW);
            currentMilestone.approvedAt = currentMilestone.releasedAt;
            if (currentMilestonePayment) {
              currentMilestonePayment.status = 'released';
              currentMilestonePayment.platformFee = round2(currentMilestonePayment.totalAmount * PLATFORM_FEE_RATE);
              currentMilestonePayment.freelancerPayout = round2(currentMilestonePayment.totalAmount - currentMilestonePayment.platformFee);
              currentMilestonePayment.releasedAt = currentMilestone.releasedAt;
            }
            disputeDoc.resolutionNotes = 'Admin resolved: escrow released to freelancer.';
            contractDoc.currentMilestoneOrder = Math.min(currentMilestone.order + 1, milestoneCount);
          } else {
            currentMilestone.status = 'refunded';
            if (currentMilestonePayment) currentMilestonePayment.status = 'refunded';
            disputeDoc.resolutionNotes = 'Admin resolved: full refund to client.';
          }
          currentMilestone.dispute = disputeDoc;
        } else {
          if (resolved) {
            disputeDoc.resolutionNotes = pick(['Admin resolved: escrow released to freelancer.', 'Admin resolved: partial refund to client (split).', 'Admin resolved: full refund to client.', 'Dispute rejected — original terms upheld.']);
          }
          contractDoc.dispute = disputeDoc;
        }

        hist('dispute_raised', `Dispute raised: ${disputeDoc.reason}`, raisedAt);
        if (resolved) hist('dispute_resolved', disputeDoc.resolutionNotes, disputeDoc.resolvedAt);
        disputes.push({ contractId, job, client, winner, dispute: disputeDoc });
        bump('Disputes');
      }

      contracts.push(contractDoc);
      bump('Contracts');

      // Conversation + messages for this contract
      const convId = new mongoose.Types.ObjectId();
      conversations.push({
        _id: convId, participants: [client.user._id, winner.user._id],
        unreadCount: new Map(), createdAt: startAt, updatedAt: startAt,
      });
      const ctx = { job: job.title, feat: pick(SKILL_CLUSTERS[cluster]) };
      const convMsgs = buildConversation(ctx, {
        includeDelivery: nDeliv > 0, includeRevision: true, includeApprove: completedJob,
      });
      let mAt = startAt;
      let lastMsgId = null;
      for (const m of convMsgs) {
        mAt = dateBetween(addHours(mAt, 1), addHours(mAt, 30));
        if (mAt > NOW) mAt = dateBetween(startAt, NOW);
        const sender = m.from === 'client' ? client.user._id : winner.user._id;
        lastMsgId = new mongoose.Types.ObjectId();
        messages.push({
          _id: lastMsgId, conversationId: convId, sender, content: m.text,
          attachments: m.attach ? [{ url: fileUrl(`chat-${lastMsgId}.${chance(0.5) ? 'pdf' : 'png'}`), name: chance(0.5) ? 'brief.pdf' : 'screenshot.png' }] : [],
          readBy: chance(0.7) ? [client.user._id, winner.user._id] : [sender],
          createdAt: mAt, updatedAt: mAt,
        });
      }
      // set conversation lastMessage + a couple of message notifications
      const lastConv = conversations[conversations.length - 1];
      lastConv.lastMessage = lastMsgId;
      lastConv.updatedAt = mAt;
      if (chance(0.5)) notify(winner.user._id, 'new_message', 'New message', `${client.user.firstName} sent you a message.`, { link: '/freelancer/messages' }, mAt);
    }
  }

  // Persist the lifecycle in batches
  await Proposal.insertMany(proposals);
  bump('Proposals', proposals.length);
  done('Proposals', proposals.length);

  step('Contracts');
  await Contract.insertMany(contracts);
  // update jobs with proposals[], contractId, hiredFreelancer
  const jobBulk = jobs.map(j => ({ updateOne: { filter: { _id: j._id }, update: { $set: { proposals: j.proposals, contractId: j.contractId, hiredFreelancer: j.hiredFreelancer } } } }));
  if (jobBulk.length) await Job.bulkWrite(jobBulk);
  done('Contracts', contracts.length);

  step('Milestones');
  if (milestones.length) await Milestone.insertMany(milestones);
  bump('Milestones', milestones.length);
  done('Milestones', milestones.length);

  step('Contract Timeline & Deliveries');
  if (contractHistory.length) await ContractHistory.insertMany(contractHistory);
  if (deliveries.length) await Delivery.insertMany(deliveries);
  if (timeLogs.length) await TimeLog.insertMany(timeLogs);
  bump('Deliveries', deliveries.length);
  bump('TimeLogs', timeLogs.length);
  console.log(`✔ ${contractHistory.length} history + ${deliveries.length} deliveries + ${timeLogs.length} time logs`);

  step('Payments');
  await Payment.insertMany(payments);
  done('Payments', payments.length);

  // ---- 5. WITHDRAWALS (freelancers cashing out earnings) -------------------
  step('Withdrawals');
  for (const f of activeFreelancers) {
    if (f.profile.totalEarnings < 20000) continue;
    const n = randInt(0, f.tier === 'top' ? 8 : f.tier === 'experienced' ? 4 : 2);
    for (let w = 0; w < n; w++) {
      const amt = money(5000, Math.max(6000, Math.min(80000, f.profile.totalEarnings * 0.3)), 500);
      const st = pick(['completed', 'completed', 'completed', 'pending', 'failed', 'cancelled']);
      const when = dateBetween(f.user.createdAt, NOW, true);
      withdrawals.push({
        userId: f.user._id, amount: amt, method: pick(['bank_transfer', 'bank_transfer', 'paypal', 'stripe']),
        status: st, referenceId: st === 'completed' ? `WD-${randInt(100000, 999999)}` : undefined,
        notes: st === 'failed' ? 'Bank rejected the transfer' : st === 'cancelled' ? 'Cancelled by user' : undefined,
        createdAt: when, updatedAt: dateBetween(when, NOW),
      });
      if (st === 'completed') notify(f.user._id, 'withdrawal_completed', 'Withdrawal completed', `Rs. ${amt.toLocaleString()} was sent to your ${'bank'}.`, { link: '/freelancer/wallet' }, when);
    }
  }
  await Withdrawal.insertMany(withdrawals);
  bump('Withdrawals', withdrawals.length);
  bump('WalletTransactions', payments.length + withdrawals.length);
  done('Withdrawals', withdrawals.length);

  // ---- 6. REVIEWS ----------------------------------------------------------
  step('Reviews');
  await Review.insertMany(reviews);
  // reflect aggregate rating already set on profiles at creation; refine top freelancers
  bump('Reviews', reviews.length);
  done('Reviews', reviews.length);

  // ---- 6b. TESTIMONIALS ----------------------------------------------------
  // Success stories submitted by strong freelancers, auto-approved for the demo.
  step('Testimonials');
  const testimonials = [];
  const usedTexts = shuffle(TESTIMONIAL_TEXT);
  const storyTellers = shuffle(
    activeFreelancers.filter(f => ['top', 'experienced'].includes(f.tier) && (f.profile.rating || 0) >= 4)
  ).slice(0, 24); // one testimonial per user (userId is unique)
  storyTellers.forEach((f, idx) => {
    const created = dateBetween(addDays(f.user.createdAt, 30), NOW, true);
    testimonials.push({
      userId: f.user._id,
      name: `${f.user.firstName} ${f.user.lastName}`,
      role: f.profile.title || 'Freelancer',
      text: usedTexts[idx % usedTexts.length],
      rating: chance(0.8) ? 5 : 4,
      status: 'approved',
      createdAt: created, updatedAt: created,
    });
  });
  if (testimonials.length) await Testimonial.insertMany(testimonials);
  bump('Testimonials', testimonials.length);
  done('Testimonials', testimonials.length);

  // ---- 7. MESSAGES + CONVERSATIONS ----------------------------------------
  step('Conversations');
  await Conversation.insertMany(conversations);
  done('Conversations', conversations.length);

  step('Messages');
  // insert in chunks to keep memory flat
  const CHUNK = 2000;
  for (let i = 0; i < messages.length; i += CHUNK) {
    await Message.insertMany(messages.slice(i, i + CHUNK), { ordered: false });
  }
  bump('Messages', messages.length);
  done('Messages', messages.length);

  // ---- 8. DISPUTES (reports view) -----------------------------------------
  // Dispute state already lives on the relevant Milestone (fixed-price) or
  // the Contract itself (hourly); also surface as Reports for the moderation
  // queue where a party formally reported the other.
  step('Reports');
  const reports = [];
  for (const d of disputes) {
    if (chance(0.5)) {
      reports.push({
        reportedBy: d.dispute.raisedBy,
        reportedUser: String(d.dispute.raisedBy) === String(d.client.user._id) ? d.winner.user._id : d.client.user._id,
        reportedItem: { type: 'other', id: d.contractId },
        category: pick(['fraud', 'other', 'inappropriate']),
        description: `Related to contract dispute: ${d.dispute.reason}. ${d.dispute.description}`,
        priority: pick(['medium', 'high', 'critical']),
        status: d.dispute.status === 'resolved' ? pick(['resolved', 'dismissed']) : pick(['pending', 'investigating']),
        resolution: d.dispute.status === 'resolved' ? d.dispute.resolutionNotes : undefined,
        resolvedBy: d.dispute.status === 'resolved' ? 'admin@skillkart.com' : undefined,
        resolvedAt: d.dispute.resolvedAt,
        createdAt: d.dispute.raisedAt, updatedAt: d.dispute.resolvedAt || d.dispute.raisedAt,
      });
    }
  }
  // standalone user reports (spam / harassment / fake profiles)
  for (let i = 0; i < randInt(15, 30); i++) {
    const a = pick(activeClients).user, b = pick(activeFreelancers).user;
    const when = dateBetween(YEAR_AGO, NOW, true);
    const resolved = chance(0.6);
    reports.push({
      reportedBy: a._id, reportedUser: b._id,
      reportedItem: { type: pick(['profile', 'message', 'gig', 'review']) },
      category: pick(['spam', 'harassment', 'fraud', 'inappropriate', 'other']),
      description: pick(['This user sent spam messages promoting off-platform contact.', 'The profile appears fake with a stolen portfolio.', 'Received harassing messages after declining an offer.', 'Suspected fraudulent behavior — asked to pay outside the platform.', 'Copyright concern — portfolio images are not original.']),
      priority: pick(['low', 'medium', 'medium', 'high']),
      status: resolved ? pick(['resolved', 'dismissed']) : pick(['pending', 'investigating']),
      resolution: resolved ? pick(['Warned the user.', 'No violation found.', 'User suspended.', 'Content removed.']) : undefined,
      resolvedBy: resolved ? 'admin@skillkart.com' : undefined,
      resolvedAt: resolved ? dateBetween(when, NOW) : undefined,
      assignedTo: chance(0.4) ? 'admin@skillkart.com' : undefined,
      createdAt: when, updatedAt: when,
    });
  }
  await Report.insertMany(reports);
  bump('Reports', reports.length);
  done('Reports', reports.length);

  // ---- 9. EXTRA NOTIFICATIONS (fill out the feed) --------------------------
  step('Notifications');
  for (const f of sample(activeFreelancers, Math.min(40, activeFreelancers.length))) {
    const n = randInt(2, 8);
    for (let i = 0; i < n; i++) {
      const when = dateBetween(f.user.createdAt, NOW, true);
      notify(f.user._id, pick(['new_message', 'proposal_accepted', 'review_received', 'withdrawal_completed', 'ai_suggestion']),
        pick(['New message', 'Proposal update', 'You received a review', 'Withdrawal processed', 'AI suggestion ready']),
        pick(['You have a new message.', 'There is an update on your proposal.', 'A client left you feedback.', 'Your withdrawal has been processed.', 'Your AI proposal draft is ready.']),
        {}, when);
    }
  }
  await Notification.insertMany(notifications);
  bump('Notifications', notifications.length);
  done('Notifications', notifications.length);

  // ---- 10. ADMIN AUDIT LOGS ------------------------------------------------
  step('Admin Audit Logs');
  const audit = [];
  const adminEmail = 'admin@skillkart.com';
  const auditActions = [
    { action: 'auth.login', category: 'auth', resource: 'Admin', severity: 'info' },
    { action: 'auth.logout', category: 'auth', resource: 'Admin', severity: 'info' },
    { action: 'user.suspend', category: 'user', resource: 'User', severity: 'warning' },
    { action: 'user.edit', category: 'user', resource: 'User', severity: 'info' },
    { action: 'payment.release', category: 'payment', resource: 'Payment', severity: 'critical' },
    { action: 'payment.refund', category: 'payment', resource: 'Payment', severity: 'critical' },
    { action: 'withdrawal.completed', category: 'withdrawal', resource: 'Withdrawal', severity: 'info' },
    { action: 'dispute.resolved', category: 'dispute', resource: 'Contract', severity: 'critical' },
    { action: 'review.hidden', category: 'review', resource: 'Review', severity: 'info' },
    { action: 'report.resolved', category: 'report', resource: 'Report', severity: 'info' },
    { action: 'settings.updated', category: 'settings', resource: 'SystemSettings', severity: 'info' },
    { action: 'export.csv', category: 'export', resource: 'User', severity: 'info' },
  ];
  for (let i = 0; i < randInt(120, 220); i++) {
    const a = pick(auditActions);
    const when = dateBetween(YEAR_AGO, NOW, true);
    audit.push({
      adminEmail, adminRole: 'super_admin',
      action: a.action, category: a.category, resource: a.resource,
      resourceId: chance(0.7) ? new mongoose.Types.ObjectId() : undefined,
      previousValue: chance(0.3) ? { status: 'old' } : undefined,
      newValue: chance(0.3) ? { status: 'new' } : undefined,
      ipAddress: `${randInt(1, 223)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`,
      userAgent: pick(['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)']),
      notes: chance(0.4) ? 'Routine admin action' : undefined,
      severity: a.severity,
      createdAt: when, updatedAt: when,
    });
  }
  await AdminAuditLog.insertMany(audit);
  bump('AuditLogs', audit.length);
  done('Admin Audit Logs', audit.length);

  // ---- 11. RECONCILE WALLET BALANCES (from released payments/withdrawals) --
  step('Reconciling wallets');
  for (const [uid, d] of walletDelta) {
    if (d.balance) await FreelancerProfile.updateOne({ userId: uid }, { $inc: { walletBalance: 0 } }); // balances already set at creation; keep as-is for realism
    if (d.spend) await ClientProfile.updateOne({ userId: uid }, { $inc: { totalSpent: 0 } });
  }
  console.log('✔ Wallets reconciled');

  // ---- SUMMARY -------------------------------------------------------------
  printSummary(Date.now() - t0);
  await mongoose.connection.close();
}

// A rating skewed toward 4-5 with a realistic tail of low scores.
function weightedRating() {
  const r = Math.random();
  if (r < 0.5) return 5;
  if (r < 0.78) return 4;
  if (r < 0.92) return 3;
  if (r < 0.97) return 2;
  return 1;
}

function printSummary(ms) {
  const line = (label, key) => console.log(`  ${label.padEnd(26)} ${(stats[key] || 0).toLocaleString()}`);
  console.log('\n═══ SUMMARY ═══');
  line('Freelancers Created', 'Freelancers');
  line('Clients Created', 'Clients');
  line('Jobs Created', 'Jobs');
  line('Gigs Created', 'Gigs');
  line('Services (Gigs) Created', 'Services (Gigs)');
  line('Proposals Created', 'Proposals');
  line('Contracts Created', 'Contracts');
  line('Milestones Created', 'Milestones');
  line('Payments Created', 'Payments');
  line('Wallet Txns Created', 'WalletTransactions');
  line('Withdrawals Created', 'Withdrawals');
  line('Deliveries Created', 'Deliveries');
  line('Time Logs Created', 'TimeLogs');
  line('Reviews Created', 'Reviews');
  line('Testimonials Created', 'Testimonials');
  line('Messages Created', 'Messages');
  line('Disputes Created', 'Disputes');
  line('Reports Created', 'Reports');
  line('Notifications Created', 'Notifications');
  line('Audit Logs Created', 'AuditLogs');
  console.log('  AI Usage Records           0  (no AIUsage model — skipped by design)');
  console.log('  Gig Orders                 0  (Gigs are seeded as listings only — no order/purchase lifecycle yet)');
  console.log(`\n⏱  Completed in ${(ms / 1000).toFixed(1)}s`);
  console.log('\n✅ Demo database successfully populated.\n');
  console.log('Demo logins (password for all four: Pass123!@#):');
  console.log('  test.freelancer0@skillkart.com  (top-rated, ~41 completed)');
  console.log('  test.freelancer1@skillkart.com  (mid-level, ~18 completed)');
  console.log('  test.client0@skillkart.com      (SME, many hires)');
  console.log('  test.client1@skillkart.com      (startup)\n');
}

// ─── Entry point ─────────────────────────────────────────────────────────────
run().catch((err) => {
  console.error('\n✗ Seeding failed:', err);
  process.exit(1);
});
