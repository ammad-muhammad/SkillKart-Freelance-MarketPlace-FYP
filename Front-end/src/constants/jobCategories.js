/**
 * Universal Skill Taxonomy — mirrors Backend/src/utils/constants.js JOB_CATEGORIES.
 * Keep these two files in sync. To add a new category, add it here AND in the backend.
 */
export const JOB_CATEGORIES = [
  // ── Software & Technology ──────────────────────────────────────────────
  'Web Development',
  'Mobile Development',
  'Frontend Development',
  'Backend Development',
  'Full Stack Development',
  'DevOps & Cloud',
  'Cybersecurity',
  'AI & Machine Learning',
  'Data Science',
  'Blockchain',
  'Game Development',
  'QA & Testing',
  // ── Design ────────────────────────────────────────────────────────────
  'UI Design',
  'UX Design',
  'Graphic Design',
  'Logo Design',
  'Brand Identity',
  'Product Design',
  'Illustration',
  'Motion Graphics',
  // ── Video & Photography ───────────────────────────────────────────────
  'Video Editing',
  'Videography',
  'Photography',
  'Drone Photography',
  'Cinematography',
  'Color Grading',
  'Visual Effects (VFX)',
  'Animation',
  '3D Animation',
  // ── Writing & Content ─────────────────────────────────────────────────
  'Copywriting',
  'Technical Writing',
  'Content Writing',
  'Ghostwriting',
  'Script Writing',
  'Translation',
  'Proofreading',
  // ── Marketing ─────────────────────────────────────────────────────────
  'SEO',
  'SEM',
  'Social Media Marketing',
  'Email Marketing',
  'Affiliate Marketing',
  'PPC Advertising',
  'Influencer Marketing',
  'Branding',
  // ── Business ──────────────────────────────────────────────────────────
  'Project Management',
  'Virtual Assistance',
  'Business Consulting',
  'Market Research',
  'Customer Support',
  'Recruitment',
  'Data Entry',
  // ── Audio & Music ─────────────────────────────────────────────────────
  'Voice Over',
  'Audio Editing',
  'Music Production',
  'Mixing & Mastering',
  'Podcast Production',
  'Sound Design',
  // ── Architecture & Engineering ────────────────────────────────────────
  'CAD Design',
  'Interior Design',
  'Exterior Design',
  'Structural Design',
  'Mechanical Design',
  // ── Finance & Legal ───────────────────────────────────────────────────
  'Accounting',
  'Bookkeeping',
  'Financial Analysis',
  'Tax Preparation',
  'Legal Consulting',
  // ── Catch-all ─────────────────────────────────────────────────────────
  'Other',
];

/** Industry groups for grouped dropdowns and UI sections */
export const CATEGORY_GROUPS = {
  'Software & Technology': [
    'Web Development', 'Mobile Development', 'Frontend Development',
    'Backend Development', 'Full Stack Development', 'DevOps & Cloud',
    'Cybersecurity', 'AI & Machine Learning', 'Data Science',
    'Blockchain', 'Game Development', 'QA & Testing',
  ],
  'Design': [
    'UI Design', 'UX Design', 'Graphic Design', 'Logo Design',
    'Brand Identity', 'Product Design', 'Illustration', 'Motion Graphics',
  ],
  'Video & Photography': [
    'Video Editing', 'Videography', 'Photography', 'Drone Photography',
    'Cinematography', 'Color Grading', 'Visual Effects (VFX)', 'Animation', '3D Animation',
  ],
  'Writing & Content': [
    'Copywriting', 'Technical Writing', 'Content Writing',
    'Ghostwriting', 'Script Writing', 'Translation', 'Proofreading',
  ],
  'Marketing': [
    'SEO', 'SEM', 'Social Media Marketing', 'Email Marketing',
    'Affiliate Marketing', 'PPC Advertising', 'Influencer Marketing', 'Branding',
  ],
  'Business': [
    'Project Management', 'Virtual Assistance', 'Business Consulting',
    'Market Research', 'Customer Support', 'Recruitment', 'Data Entry',
  ],
  'Audio & Music': [
    'Voice Over', 'Audio Editing', 'Music Production',
    'Mixing & Mastering', 'Podcast Production', 'Sound Design',
  ],
  'Architecture & Engineering': [
    'CAD Design', 'Interior Design', 'Exterior Design',
    'Structural Design', 'Mechanical Design',
  ],
  'Finance & Legal': [
    'Accounting', 'Bookkeeping', 'Financial Analysis',
    'Tax Preparation', 'Legal Consulting',
  ],
  'Other': ['Other'],
};

/**
 * Suggested subcategories per category — used in gig/project creation forms.
 * Many-to-many: a subcategory can belong to multiple categories.
 */
export const GIG_SUBCATEGORIES = {
  // Software & Technology
  'Web Development':        ['Full Stack', 'Frontend', 'Backend', 'E-Commerce', 'WordPress', 'API Development', 'CMS', 'Landing Page'],
  'Mobile Development':     ['iOS', 'Android', 'React Native', 'Flutter', 'Cross-Platform', 'PWA'],
  'Frontend Development':   ['React', 'Vue.js', 'Angular', 'HTML/CSS', 'TypeScript', 'Next.js'],
  'Backend Development':    ['Node.js', 'Django', 'Laravel', 'Spring Boot', 'FastAPI', 'GraphQL'],
  'Full Stack Development': ['MERN', 'MEAN', 'LAMP', 'Django + React', 'Next.js Full Stack'],
  'DevOps & Cloud':         ['CI/CD', 'AWS', 'Azure', 'Google Cloud', 'Kubernetes', 'Docker', 'Terraform'],
  'Cybersecurity':          ['Penetration Testing', 'Security Audit', 'Compliance', 'Network Security', 'VAPT'],
  'AI & Machine Learning':  ['Model Training', 'NLP', 'Computer Vision', 'Deep Learning', 'AI Chatbots', 'Prompt Engineering'],
  'Data Science':           ['Data Analysis', 'Data Visualization', 'Statistical Modeling', 'Business Intelligence', 'Power BI'],
  'Blockchain':             ['Smart Contracts', 'NFT Development', 'DeFi', 'Web3', 'Solidity', 'Ethereum'],
  'Game Development':       ['Unity', 'Unreal Engine', 'Mobile Games', '2D Games', '3D Games', 'VR/AR'],
  'QA & Testing':           ['Manual Testing', 'Automation Testing', 'Load Testing', 'API Testing', 'Bug Reporting'],
  // Design
  'UI Design':              ['Web UI', 'Mobile UI', 'Dashboard Design', 'Component Design', 'Design System'],
  'UX Design':              ['User Research', 'Wireframing', 'Prototyping', 'Usability Testing', 'Information Architecture'],
  'Graphic Design':         ['Social Media Graphics', 'Print Design', 'Infographics', 'Flyers', 'Banners'],
  'Logo Design':            ['Wordmark', 'Lettermark', 'Iconic', 'Combination Mark', 'Brand Refresh'],
  'Brand Identity':         ['Brand Guidelines', 'Color Palette', 'Typography', 'Style Guide', 'Rebranding'],
  'Product Design':         ['Industrial Design', 'Packaging', 'UI/UX', 'Concept Design', 'Prototype'],
  'Illustration':           ['Digital Illustration', 'Character Design', 'Book Illustration', 'Editorial Art', 'Storyboarding'],
  'Motion Graphics':        ['Logo Animation', 'Explainer Video', 'Title Sequences', 'Social Media Animation', 'Kinetic Typography'],
  // Video & Photography
  'Video Editing':          ['Short Film', 'YouTube Editing', 'Reels/TikTok', 'Corporate Video', 'Wedding Video'],
  'Videography':            ['Event Coverage', 'Corporate Video', 'Documentary', 'Real Estate Tour', 'Music Video'],
  'Photography':            ['Portrait', 'Product', 'Event', 'Architecture', 'Commercial', 'Lifestyle'],
  'Drone Photography':      ['Aerial Shots', 'Real Estate', 'Construction Progress', 'Event Coverage'],
  'Cinematography':         ['Film Production', 'Commercial Shoot', 'Music Video', 'Short Film'],
  'Color Grading':          ['Film Look', 'Corporate Style', 'Social Media Grading', 'Restoration'],
  'Visual Effects (VFX)':   ['Compositing', 'Green Screen', 'Motion Tracking', 'CGI Integration', '3D VFX'],
  'Animation':              ['2D Animation', 'Whiteboard', 'Explainer', 'Character Animation', 'Logo Animation'],
  '3D Animation':           ['Product Animation', 'Architectural Viz', 'Character Animation', 'Game Asset'],
  // Writing & Content
  'Copywriting':            ['Ad Copy', 'Sales Page', 'Email Sequence', 'Landing Page', 'Product Description'],
  'Technical Writing':      ['Documentation', 'API Docs', 'User Manuals', 'White Papers', 'Technical Reports'],
  'Content Writing':        ['Blog Posts', 'Articles', 'Website Content', 'Newsletter', 'Case Studies'],
  'Ghostwriting':           ['Books', 'Blog Posts', 'LinkedIn Articles', 'Speeches', 'Memoirs'],
  'Script Writing':         ['YouTube Scripts', 'Podcast Scripts', 'Ad Scripts', 'Film Scripts', 'Explainer Scripts'],
  'Translation':            ['Document Translation', 'Website Localization', 'Subtitles', 'Legal Translation'],
  'Proofreading':           ['Academic Papers', 'Books', 'Marketing Copy', 'Website Content', 'Reports'],
  // Marketing
  'SEO':                    ['On-Page SEO', 'Off-Page SEO', 'Technical SEO', 'Local SEO', 'SEO Audit', 'Link Building'],
  'SEM':                    ['Google Ads', 'Bing Ads', 'Search Campaign Setup', 'Keyword Research'],
  'Social Media Marketing': ['Instagram', 'LinkedIn', 'Twitter/X', 'TikTok', 'Facebook', 'Content Calendar'],
  'Email Marketing':        ['Campaign Design', 'Email Automation', 'Newsletter', 'Drip Campaigns'],
  'Affiliate Marketing':    ['Program Setup', 'Affiliate Outreach', 'Tracking', 'Commission Strategy'],
  'PPC Advertising':        ['Google Ads', 'Facebook Ads', 'Instagram Ads', 'LinkedIn Ads', 'Retargeting'],
  'Influencer Marketing':   ['Influencer Outreach', 'Campaign Management', 'ROI Tracking', 'UGC'],
  'Branding':               ['Brand Strategy', 'Positioning', 'Messaging', 'Brand Voice', 'Competitive Analysis'],
  // Business
  'Project Management':     ['Agile/Scrum', 'Risk Management', 'Resource Planning', 'Project Reporting'],
  'Virtual Assistance':     ['Admin Tasks', 'Email Management', 'Scheduling', 'Data Management', 'Research'],
  'Business Consulting':    ['Strategy', 'Operations', 'Growth Planning', 'Startup Advisory', 'Process Optimization'],
  'Market Research':        ['Competitor Analysis', 'Consumer Surveys', 'Industry Reports', 'Trend Analysis'],
  'Customer Support':       ['Live Chat', 'Email Support', 'Phone Support', 'Help Desk', 'CRM Management'],
  'Recruitment':            ['Job Posting', 'Candidate Screening', 'Interview Coordination', 'HR Consulting'],
  'Data Entry':             ['Spreadsheet Management', 'Database Entry', 'PDF to Excel', 'Web Scraping'],
  // Audio & Music
  'Voice Over':             ['Commercial', 'Narration', 'Character Voice', 'E-Learning', 'IVR', 'Audiobook'],
  'Audio Editing':          ['Podcast Editing', 'Interview Cleanup', 'Music Editing', 'SFX Integration'],
  'Music Production':       ['Beat Making', 'Full Track Production', 'Jingle', 'Background Music', 'Soundtrack'],
  'Mixing & Mastering':     ['Mixing', 'Mastering', 'Stem Mixing', 'Online Mixing'],
  'Podcast Production':     ['Editing', 'Show Notes', 'Distribution Setup', 'Intro/Outro Production'],
  'Sound Design':           ['Game SFX', 'Film Sound', 'UI Sounds', 'Foley', 'Ambient Sound'],
  // Architecture & Engineering
  'CAD Design':             ['2D Drafting', '3D Modeling', 'AutoCAD', 'SolidWorks', 'Revit', 'Technical Drawing'],
  'Interior Design':        ['Residential', 'Commercial', '3D Visualization', 'Space Planning', 'Renovation'],
  'Exterior Design':        ['Facade Design', 'Landscape Design', '3D Render', 'Architectural Concept'],
  'Structural Design':      ['Residential Structure', 'Commercial Structure', 'Load Analysis', 'Foundation Design'],
  'Mechanical Design':      ['Product Design', 'Component Design', 'CAD Modeling', 'FEA Analysis'],
  // Finance & Legal
  'Accounting':             ['Bookkeeping', 'Financial Statements', 'Payroll', 'Accounts Payable/Receivable'],
  'Bookkeeping':            ['QuickBooks', 'Xero', 'Monthly Reconciliation', 'Bank Statement'],
  'Financial Analysis':     ['Investment Analysis', 'Financial Modeling', 'Valuation', 'Cash Flow Forecasting'],
  'Tax Preparation':        ['Personal Tax', 'Business Tax', 'Tax Planning', 'VAT/GST Filing'],
  'Legal Consulting':       ['Contract Review', 'Business Law', 'IP Law', 'Compliance', 'Legal Research'],
  'Other':                  ['Other'],
};

/**
 * Predefined skill suggestions for the profile skill tag input — covers all industries.
 * Many-to-many: a skill can belong to multiple categories.
 */
export const PREDEFINED_SKILLS = [
  // Software & Technology
  'React', 'Next.js', 'Vue.js', 'Angular', 'TypeScript', 'JavaScript', 'HTML', 'CSS',
  'Node.js', 'Python', 'Django', 'Flask', 'FastAPI', 'Laravel', 'PHP', 'Ruby on Rails',
  'Spring Boot', 'Java', 'C#', '.NET', 'Go', 'Rust',
  'React Native', 'Flutter', 'Swift', 'Kotlin', 'iOS', 'Android',
  'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD',
  'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'GraphQL', 'REST API',
  'Cybersecurity', 'Penetration Testing', 'Network Security', 'VAPT',
  'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'TensorFlow', 'PyTorch',
  'Data Analysis', 'SQL', 'Power BI', 'Tableau', 'R', 'Pandas', 'NumPy',
  'Blockchain', 'Smart Contracts', 'Solidity', 'Web3', 'Ethereum', 'NFT',
  'Unity', 'Unreal Engine', 'Game Design',
  'Selenium', 'Cypress', 'Jest', 'Manual Testing', 'QA',
  // Design
  'Figma', 'Adobe XD', 'Sketch', 'UI Design', 'UX Design', 'Wireframing', 'Prototyping',
  'Adobe Photoshop', 'Adobe Illustrator', 'CorelDRAW', 'Canva',
  'Graphic Design', 'Logo Design', 'Brand Identity', 'Typography', 'Color Theory',
  'Product Design', 'Industrial Design',
  'Illustration', 'Digital Art', 'Character Design',
  'After Effects', 'Cinema 4D', 'Motion Graphics',
  // Video & Photography
  'Video Editing', 'Adobe Premiere Pro', 'Final Cut Pro', 'DaVinci Resolve',
  'Videography', 'Photography', 'Lightroom', 'Drone Photography',
  'Color Grading', 'VFX', 'Green Screen', 'Compositing',
  'Animation', '2D Animation', '3D Animation', 'Blender', 'Maya',
  // Writing & Content
  'Copywriting', 'Content Writing', 'Technical Writing', 'Blog Writing', 'SEO Writing',
  'Ghostwriting', 'Script Writing', 'Proofreading', 'Editing',
  'Translation', 'Localization', 'Subtitling',
  // Marketing
  'SEO', 'SEM', 'Google Ads', 'Facebook Ads', 'Instagram Ads', 'LinkedIn Ads',
  'Social Media Marketing', 'Content Marketing', 'Email Marketing', 'Mailchimp',
  'HubSpot', 'Branding', 'Marketing Strategy', 'PPC', 'Influencer Marketing',
  'Affiliate Marketing', 'Analytics', 'Google Analytics',
  // Business
  'Project Management', 'Agile', 'Scrum', 'Jira', 'Asana', 'Trello',
  'Virtual Assistance', 'Business Consulting', 'Market Research',
  'Customer Support', 'CRM', 'Salesforce', 'Data Entry', 'Recruitment', 'HR',
  // Audio & Music
  'Voice Over', 'Audio Editing', 'Podcast Editing', 'Music Production',
  'FL Studio', 'Ableton', 'Logic Pro', 'Pro Tools', 'GarageBand',
  'Mixing', 'Mastering', 'Sound Design', 'Foley',
  // Architecture & Engineering
  'AutoCAD', 'Revit', 'SolidWorks', 'SketchUp', 'CATIA',
  'Interior Design', 'Exterior Design', 'Architectural Drawing', 'CAD',
  'Structural Design', 'Mechanical Design', '3D Rendering',
  // Finance & Legal
  'Accounting', 'QuickBooks', 'Xero', 'Bookkeeping',
  'Financial Analysis', 'Financial Modeling', 'Excel', 'Tax Preparation',
  'Legal Research', 'Contract Drafting', 'Compliance',
].sort();
