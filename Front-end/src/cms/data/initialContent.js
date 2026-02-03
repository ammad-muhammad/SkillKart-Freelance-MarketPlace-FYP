// ====================================================================
// CMS INITIAL CONTENT - ACTUAL WEBSITE CONTENT
// Contains real data from SkillKart website pages
// ====================================================================

// Site-wide settings
export const initialSiteSettings = {
  siteName: "SkillKart",
  tagline: "Micro Freelance Platform",
  logo: "/assets/skillkart-logo.svg",
  favicon: "/favicon.ico",
  primaryColor: "#b3f5e1",
  secondaryColor: "#000000",
  seo: {
    title: "SkillKart - Micro Freelance Platform",
    description: "A global team of search-first content marketers engineering semantic relevancy & category signals for both the internet and people",
    keywords: "freelance, micro tasks, gigs, hiring, remote work, SkillKart",
    ogImage: "/assets/og-image.jpg",
  },
  social: {
    facebook: "https://facebook.com/skillkart",
    twitter: "https://twitter.com/skillkart",
    linkedin: "https://linkedin.com/company/skillkart",
    instagram: "https://instagram.com/skillkart",
  },
  contact: {
    email: "privacy@skillkart.com",
    phone: "+1-800-SKILLKART",
    address: "123 Tech Park, Innovation Way, Silicon Valley, CA",
  },
};

// All pages content
export const initialPages = {
  // ==================== HOME PAGE ====================
  home: {
    id: "home",
    name: "Home",
    slug: "/",
    lastUpdated: new Date().toISOString(),
    sections: [
      {
        id: "home-hero",
        type: "hero",
        name: "Hero Banner",
        content: {
          backgroundImage: "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg",
          searchIcon: "/assets/icons/ic-search.svg",
          titleStart: "We Create",
          titleEnd: "Category Leaders",
          subtitle: "on every searchable platform",
          descriptionOne: "Organic media planners creating, distributing & optimising search-first content for SEO, Social, PR",
          descriptionTwo: "4 Global Offices serving UK, USA (New York) & EU",
          searchPlaceholder: "Search anything...",
        },
      },
      {
        id: "home-infobar",
        type: "infoBar",
        name: "Info Bar",
        content: {
          description: "A global team of search-first content marketers engineering semantic relevancy & category signals for both the internet and people",
          headlineWords: ["Driving", "Demand", "&"],
          highlightWord: "Discovery",
          highlightImage: "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg",
          primaryButton: { text: "Our Story", link: "/story" },
          secondaryButton: { text: "Our Services", link: "/services" },
        },
      },
      {
        id: "home-featured-categories",
        type: "featured-categories",
        name: "Featured Categories",
        content: {
          title: "Featured Categories",
          categories: [
            { id: "01", title: "SIXT", desc: "Leading E Sim brand globally", date: "[2023-2025]", color: "from-gray-800 to-black", img: "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg" },
            { id: "02", title: "JD Sports", desc: "Global Sportswear Leader", date: "[2024-2025]", color: "from-gray-700 to-gray-900", img: "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg" },
            { id: "03", title: "Parkdean Resorts", desc: "UK Holiday Parks", date: "[2025]", color: "from-gray-800 to-black", img: "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg" },
            { id: "04", title: "Apple", desc: "Spatial Audio Tech", date: "[2025]", color: "from-gray-700 to-gray-900", img: "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg" },
          ]
        }
      },
      {
        id: "home-services",
        type: "services",
        name: "Our Services",
        content: {
          headerTitle: "Our Services",
          headerImage: "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg",
          viewAllLink: "/services",
          viewAllText: "View All Services",
          showStats: true,
          services: [
            { id: 1, name: "Digital PR", icon: "Zap", desc: "Amplify your brand story", link: "/digital-pr" },
            { id: 2, name: "Organic Social & Content", icon: "Users", desc: "Engage and grow your audience", link: "/social-content" },
            { id: 3, name: "Search & Growth Strategy", icon: "TrendingUp", desc: "Scale with data-driven insights", link: "/growth-strategy" },
            { id: 4, name: "Content Experience", icon: "Target", desc: "Create memorable interactions", link: "/content-experience" },
            { id: 5, name: "Data & Insights", icon: "BarChart3", desc: "Transform data into action", link: "/data-insights" },
            { id: 6, name: "Onsite SEO", icon: "Search", desc: "Optimize for visibility", link: "/onsite-seo" },
          ],
          stats: [
            { value: "500+", label: "Projects Delivered" },
            { value: "98%", label: "Client Satisfaction" },
            { value: "50+", label: "Team Experts" },
            { value: "24/7", label: "Support Available" },
          ],
        },
      },
      {
        id: "home-scrolling-text",
        type: "scrollingText",
        name: "Scrolling Text",
        content: {
          items: [
            { text: "Innovation First", image: "https://images.unsplash.com/photo-1557821552-17105176677c?w=400&h=400&fit=crop" },
            { text: "Design Matters", image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop" },
            { text: "Build Better", image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=400&fit=crop" },
          ],
        },
      },
      {
        id: "home-team",
        type: "cardStack",
        name: "Legacy Section",
        content: {
          title: "Legacy In The Making",
          backgroundColor: "#f0f0f0",
          cards: [
            {
              id: 0,
              title: "Ammad",
              position: "CEO",
              bgColor: "#000000",
              textColor: "#ffffff",
              image: "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg",
              description: "We're dedicated to creating the industry narrative that others follow 3 years from now. We paved the path for creative SEO, multi-channel search with Digital PR, and Social Search and we will continue to do it.",
              rotate: 4,
            },
            {
              id: 1,
              title: "Sumair",
              position: "Founder",
              bgColor: "#ffffff",
              textColor: "#000000",
              image: "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg",
              description: "A roll top bath full of 79 awards. Voted The Drum's best agency outside of London. We are official judges for industry awards including Global Search Awards and Global Content Marketing Awards.",
              rotate: 8,
            },
            {
              id: 2,
              title: "Sherry",
              position: "Co-Founder",
              bgColor: "#000000",
              textColor: "#ffffff",
              image: "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg",
              description: "People ask us why we are called Rise at Seven? Ever heard the saying Early Bird catches the worm? Google is moving fast, but humans are moving faster. We chase consumers, not algorithms.",
              rotate: 12,
            },
            {
              id: 3,
              title: "Shammer",
              position: "Dishwasher",
              bgColor: "#ffffff",
              textColor: "#000000",
              image: "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg",
              description: "We've created a service which takes ideas to result within 60 minutes. Our team is dedicated to pushing boundaries and delivering exceptional results.",
              rotate: 4,
            },
          ],
        },
      },
      {
        id: "home-blog",
        type: "carousel",
        name: "What's New Section",
        content: {
          sectionTitle: "What's",
          sectionTitleHighlight: "New",
          decorativeImage: "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg",
          ctaText: "Explore More Thoughts",
          ctaLink: "/blog",
          posts: [
            {
              id: 1,
              title: "Rise at Seven appointed by Quorn for multi-channel marketing services",
              category: "Social Search",
              categoryBg: "bg-black",
              author: "Ray Saddiq",
              authorImage: "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg",
              readTime: "2 mins",
              image: "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg",
              link: "/blog/post-1",
            },
            {
              id: 2,
              title: "RESOURCE: 40+ traffic sources",
              category: "Social Search",
              categoryBg: "bg-black",
              authors: ["Carrie Rose", "Ray Saddiq"],
              authorImages: ["https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg", "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg"],
              readTime: "3 mins",
              image: "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg",
              link: "/blog/post-2",
            },
          ],
        },
      },
      {
        id: "home-cta",
        type: "cta",
        name: "Footer CTA",
        content: {
          text: "Ready to serve SkillKart?",
          id: "2250",
        },
      },
    ],
  },

  // ==================== ABOUT PAGE ====================
  about: {
    id: "about",
    name: "About",
    slug: "/about",
    lastUpdated: new Date().toISOString(),
    sections: [
      {
        id: "about-hero",
        type: "hero",
        name: "Our Story",
        content: {
          subHeading: "Our Story",
          heading: {
            line1: "Bridging the Gap",
            line2: "in Micro-Freelancing.",
          },
          description: [
            "SkillKart was founded in 2024 with a simple yet ambitious mission: to democratize access to skilled talent in local communities. What started as a small idea has grown into a trusted platform connecting thousands of businesses with verified micro-freelancers.",
            "We recognized that the gig economy was fragmented. Clients struggled to find reliable help for quick tasks, and talented individuals lacked a streamlined way to showcase their skills.",
            "Today, SkillKart stands as the bridge—empowering freelancers to earn independently while providing businesses with the agility they need to thrive.",
          ],
          ctaButton: "Read Our Full Journey",
          images: {
            main: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200",
            founder: "https://ui-avatars.com/api/?name=Hassan+Siddiqui&background=random",
          },
          quote: {
            text: "We are building more than just a platform; we are building a community of trust.",
            author: "M. Hassan",
            role: "Founder, SkillKart",
          },
        },
      },
      {
        id: "about-mission",
        type: "values",
        name: "Mission & Values",
        content: {
          badge: "What drives us",
          title: "Our Mission & Values",
          description: "We are guided by core principles that ensure every interaction on SkillKart is safe, efficient, and rewarding.",
          values: [
            {
              icon: "Users",
              title: "People First",
              description: "We prioritize the human connection behind every transaction, ensuring respect and fairness for all users.",
            },
            {
              icon: "ShieldCheck",
              title: "Safety Guaranteed",
              description: "Rigorous vetting processes and secure payments mean you can focus on the work, not the risk.",
            },
            {
              icon: "Award",
              title: "Excellence",
              description: "We encourage and reward high-quality work, fostering a marketplace of true professionals.",
            },
            {
              icon: "Globe2",
              title: "Local Impact",
              description: "Connecting neighbors to solve problems, strengthening local economies one task at a time.",
            },
          ],
        },
      },
      {
        id: "about-stats",
        type: "stats",
        name: "Impact Stats",
        content: {
          title: {
            line1: "Real Impact.",
            line2: "Real Numbers.",
          },
          description: "Our growth is a testament to the trust our community places in us. We are just getting started.",
          image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800",
          metrics: [
            { number: "2", label: "Years of Service", suffix: "" },
            { number: "50", label: "Active Skills", suffix: "+" },
            { number: "10", label: "Tasks Completed", suffix: "k+" },
            { number: "98", label: "Satisfaction Rate", suffix: "%" },
          ],
        },
      },
      {
        id: "about-team",
        type: "team",
        name: "Meet the Team",
        content: {
          title: "Meet the Minds",
          description: "The passionate team working behind the scenes.",
          members: [
            { name: "Alex Morgan", role: "CEO & Founder", img: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400" },
            { name: "Sarah Chen", role: "Head of Product", img: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400" },
            { name: "Marcus Johnson", role: "Lead Developer", img: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400" },
            { name: "Pria Patel", role: "Community Manager", img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400" },
          ],
        },
      },
      {
        id: "about-standards",
        type: "tags",
        name: "Standards & Commitments",
        content: {
          title: "Our Standards & Commitments",
          tags: [
            "Identity Verified",
            "Secure Payments",
            "24/7 Support",
            "Data Privacy First",
            "No Hidden Fees",
            "Quality Guarantee",
          ],
        },
      },
      {
        id: "about-cta",
        type: "cta",
        name: "Footer CTA",
        content: {
          title: "Ready to get started?",
          buttons: {
            primary: "Find Talent",
            secondary: "Join as Freelancer",
          },
        },
      },
    ],
  },

  // ==================== CONTACT PAGE ====================
  contact: {
    id: "contact",
    name: "Contact",
    slug: "/contact",
    lastUpdated: new Date().toISOString(),
    sections: [
      {
        id: "contact-hero",
        type: "hero",
        name: "Contact Hero",
        content: {
          title: "Fill out our form\nto get in touch",
          description: "Interested in joining our team? Head over to our Careers page to check our latest vacancies.",
          buttonText: "Careers",
          heroImage: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1200",
        },
      },
      {
        id: "contact-form",
        type: "form",
        name: "Contact Form",
        content: {
          fields: [
            { type: "row", inputs: [
              { label: "Hello, my first name is...", placeholder: "John", fullWidth: false },
              { label: "And my last name is...", placeholder: "Doe", fullWidth: false },
            ]},
            { type: "single", input: { label: "My email is", placeholder: "john@company.com", fullWidth: true }},
            { type: "row", inputs: [
              { label: "My job title is...", placeholder: "Product Designer", fullWidth: false },
              { label: "My company name is...", placeholder: "Acme Corp", fullWidth: false },
            ]},
            { type: "select", label: "I'm Interested in...", options: ["Web Development", "Product Design", "Marketing", "Other"]},
            { type: "row-select", selects: [
              { label: "Region", options: ["United Kingdom", "United States", "Europe", "Asia"] },
              { label: "Where did you hear about us?", options: ["Google", "LinkedIn", "Clutch", "Recommendation"] },
            ]},
            { type: "textarea", label: "How can we help you?", placeholder: "Start typing here..." },
          ],
          buttonText: "Submit Form",
        },
      },
      {
        id: "contact-offices",
        type: "offices",
        name: "Office Locations",
        content: {
          sectionTitle: "Our Office Locations",
          offices: [
            {
              city: "Sheffield",
              country: "UK",
              address: "3 St Pauls Place, Sheffield, S1 2JE",
              img: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300",
            },
            {
              city: "Manchester",
              country: "UK",
              address: "Colony, One Silk Street, Ancoats, Manchester, M4 6LZ",
              img: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300",
            },
            {
              city: "London",
              country: "UK",
              address: "6 Bevis Marks, London EC3A 8JQ",
              img: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=300",
            },
            {
              city: "New York",
              country: "USA",
              address: "27 E 28th St, New York, NY 10016, USA",
              img: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=300",
            },
          ],
        },
      },
      {
        id: "contact-cta",
        type: "cta",
        name: "Footer CTA",
        content: {
          text: "Ready to serve SkillKart?",
          id: "2250",
        },
      },
    ],
  },

  // ==================== HOW IT WORKS PAGE ====================
  howitworks: {
    id: "howitworks",
    name: "How It Works",
    slug: "/howitworks",
    lastUpdated: new Date().toISOString(),
    sections: [
      {
        id: "hiw-hero",
        type: "hero",
        name: "How It Works Hero",
        content: {
          badge: "Simple. Transparent. Secure.",
          title: "How SkillKart Works",
          description: "Whether you're a skilled student looking to earn or a business scaling up, we've simplified the process to just a few steps.",
          features: ["Verified Freelancers", "Escrow Protection", "Fast Hiring"],
          heroImage: "https://images.unsplash.com/photo-1552581234-26160f608093?q=80&w=1000",
          floatingBadge: {
            label: "Average Speed",
            value: "24 Hrs to Hire",
          },
        },
      },
      {
        id: "hiw-stats",
        type: "stats",
        name: "Platform Stats",
        content: {
          stats: [
            { label: "Active Freelancers", value: "5,000+", icon: "Users" },
            { label: "Projects Completed", value: "12,000+", icon: "CheckCircle2" },
            { label: "Client Satisfaction", value: "98%", icon: "Award" },
            { label: "Secure Transactions", value: "$2M+", icon: "ShieldCheck" },
          ],
        },
      },
      {
        id: "hiw-tabs",
        type: "tabs",
        name: "Process Tabs",
        content: {
          tabs: [
            { id: "work", label: "I Want to Work" },
            { id: "hire", label: "I Want to Hire" },
          ],
        },
      },
      {
        id: "hiw-freelancer-steps",
        type: "steps",
        name: "Freelancer Steps",
        content: {
          steps: [
            {
              id: 1,
              title: "Register & Get Verified",
              subtitle: "Join the Elite",
              desc: "Create your profile with basic details. Unlike other platforms, we require a quick verification of your institute email or CV to ensure a high-quality talent pool.",
              icon: "UserCheck",
              image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=1000",
              tags: ["Identity Check", "CV Review", "Fast Approval"],
            },
            {
              id: 2,
              title: "Pass the Skill Test",
              subtitle: "Prove Your Worth",
              desc: "Take a specialized skill test related to your field. No degree? No problem. If you have the skills, you're in. This badge proves to clients you know your stuff.",
              icon: "BrainCircuit",
              image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=1000",
              tags: ["Skill Assessment", "Badges", "Trust Building"],
            },
            {
              id: 3,
              title: "Start Selling & Bidding",
              subtitle: "Launch Your Career",
              desc: "Once verified, your profile gets the 'SkillKart Verified' badge. Post gigs, bid on projects, or sell your time hourly. Clients trust verified profiles more.",
              icon: "Briefcase",
              image: "https://images.unsplash.com/photo-1542626991-cbc4e32524cc?q=80&w=1000",
              tags: ["Create Gigs", "Bid on Jobs", "Hourly Contracts"],
            },
            {
              id: 4,
              title: "Secure Payments (30% Upfront)",
              subtitle: "Get Paid Safely",
              desc: "Never work for free again. Clients deposit 30% before you start. If a project is cancelled unfairly, our dispute team ensures you get paid for what you did.",
              icon: "ShieldCheck",
              image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=1000",
              tags: ["Escrow Protection", "Upfront Deposit", "Dispute Resolution"],
            },
            {
              id: 5,
              title: "Deliver & Withdraw",
              subtitle: "Enjoy Your Earnings",
              desc: "Submit your work, get approved, and the remaining funds are released instantly. Withdraw to local Pakistani banks or mobile wallets easily.",
              icon: "DollarSign",
              image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=1000",
              tags: ["Instant Release", "Local Banks", "Easy2Plain"],
            },
          ],
        },
      },
      {
        id: "hiw-client-steps",
        type: "steps",
        name: "Client Steps",
        content: {
          steps: [
            {
              id: 1,
              title: "Post a Project",
              subtitle: "Tell Us What You Need",
              desc: "Describe your project in detail. Whether it's a quick logo design or a full-scale web app, posting is free and easy.",
              icon: "Briefcase",
              image: "https://images.unsplash.com/photo-1522542550221-31fd19575a2d?q=80&w=1000",
              tags: ["Free Posting", "Detailed Briefs", "AI Assistance"],
            },
            {
              id: 2,
              title: "Hire the Perfect Match",
              subtitle: "Verified Talent Only",
              desc: "Browse proposals from 'SkillKart Verified' freelancers. Chat in real-time, compare portfolios, and select the best fit for your budget.",
              icon: "Search",
              image: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=1000",
              tags: ["Verified Pro", "Chat & Interview", "Compare Bids"],
            },
            {
              id: 3,
              title: "Secure Milestone Payments",
              subtitle: "Your Money is Safe",
              desc: "Deposit 30% upfront to start the project. This funds are held safely by SkillKart until you are satisfied with the milestones.",
              icon: "ShieldCheck",
              image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=1000",
              tags: ["Escrow System", "Milestone Based", "Safe Deposit"],
            },
            {
              id: 4,
              title: "Collaborate & Track",
              subtitle: "Stay in Control",
              desc: "Use our dashboard to track progress, share files, and communicate. Approving milestones releases payment to the freelancer.",
              icon: "MessageSquare",
              image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?q=80&w=1000",
              tags: ["File Sharing", "Progress Tracking", "24/7 Support"],
            },
          ],
        },
      },
      {
        id: "hiw-why-skillkart",
        type: "features",
        name: "Why Choose SkillKart",
        content: {
          title: "Why Choose SkillKart?",
          description: "We're building a community where skills matter more than certificates, and trust is built into every transaction.",
          features: [
            {
              title: "Freelancer Ranking & Fair Visibility",
              desc: "Our algorithm prioritizes skill over seniority. Newcomers with verified skills get equal visibility for small gigs.",
              icon: "TrendingUp",
              tags: ["Merit Based", "Fair Chance"],
            },
            {
              title: "AI Smart Assistance",
              desc: "Get intelligent pricing suggestions, skill-gap analysis, and automated project briefs to save time.",
              icon: "Sparkles",
              tags: ["Smart Pricing", "Career Guide"],
            },
            {
              title: "Dispute & Fair Play",
              desc: "Human-reviewed disputes ensure clients aren't scammed and freelancers aren't exploited.",
              icon: "Scale",
              tags: ["Human Review", "No Bots"],
            },
          ],
        },
      },
      {
        id: "hiw-cta",
        type: "cta",
        name: "Footer CTA",
        content: {
          title: "Success Starts Here.",
          buttons: {
            primary: { text: "Join as Freelancer", link: "/register" },
            secondary: { text: "Post a Job", link: "/post-job" },
          },
        },
      },
    ],
  },

  // ==================== PRIVACY POLICY PAGE ====================
  privacypolicy: {
    id: "privacypolicy",
    name: "Privacy Policy",
    slug: "/privacy-policy",
    lastUpdated: "March 15, 2024",
    sections: [
      {
        id: "privacy-hero",
        type: "hero",
        name: "Privacy Hero",
        content: {
          lastUpdated: "March 15, 2024",
          title: "Privacy Policy",
          subtitle: "We value your trust and are committed to protecting your personal data.",
          description: "This Data Collection and Processing Policy, or Privacy Policy (hereafter referred to as the 'Policy') explains how SkillKart collects information about You, how it is used, kept, and disclosed when You visit the Website. We are dedicated to ensuring that your privacy is protected and that we are transparent about our data practices.",
          heroImage: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2670&auto=format&fit=crop",
        },
      },
      {
        id: "privacy-definitions",
        type: "legalSection",
        name: "Definitions",
        content: {
          id: "definitions",
          title: "Definitions",
          icon: "FileText",
          blocks: [
            { heading: "Key Terms", text: "The following terms have the meanings specified below for the purposes of this Policy:" },
            { heading: "Company", text: "Refers to SkillKart Inc., represented by its legal entities and affiliates (hereinafter – 'We', 'Us', or 'Our')." },
            { heading: "Website", text: "Means all Content and links available on the SkillKart platform that provides Services to Users and provides information regarding the Services." },
            { heading: "Personal Data", text: "Any information relating to an identified or identifiable natural person ('Data Subject'); an identifiable natural person is one who can be identified, directly or indirectly." },
          ],
        },
      },
      {
        id: "privacy-collection",
        type: "legalSection",
        name: "Information We Collect",
        content: {
          id: "collection",
          title: "Information We Collect",
          icon: "Eye",
          blocks: [
            { heading: "Personal Information", text: "We collect information that you voluntarily provide to us when you register on the Website, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Website or otherwise when you contact us." },
            { heading: "Usage Data", text: "We may also collect information that your browser sends whenever you visit our Service or when you access the Service by or through a mobile device. This may include information such as your computer's Internet Protocol address (e.g., IP address), browser type, browser version, the pages of our Service that you visit, the time and date of your visit, the time spent on those pages, unique device identifiers and other diagnostic data." },
          ],
        },
      },
      {
        id: "privacy-usage",
        type: "legalSection",
        name: "How We Use Your Data",
        content: {
          id: "usage",
          title: "How We Use Your Data",
          icon: "Server",
          blocks: [
            { heading: "Service Delivery", text: "To provide and maintain our Service, including to monitor the usage of our Service and to manage your account." },
            { heading: "Communication", text: "To contact You by email, telephone calls, SMS, or other equivalent forms of electronic communication, regarding updates or informative communications related to the functionalities, products or contracted services, including the security updates, when necessary or reasonable for their implementation." },
          ],
        },
      },
      {
        id: "privacy-cookies",
        type: "legalSection",
        name: "Cookies & Tracking",
        content: {
          id: "cookies",
          title: "Cookies & Tracking",
          icon: "Cookie",
          blocks: [
            { heading: "Tracking Technologies", text: "We use Cookies and similar tracking technologies to track the activity on Our Service and store certain information. Tracking technologies used are beacons, tags, and scripts to collect and track information and to improve and analyze Our Service." },
            { heading: "Your Control", text: "You can instruct Your browser to refuse all Cookies or to indicate when a Cookie is being sent. However, if You do not accept Cookies, You may not be able to use some parts of our Service." },
          ],
        },
      },
      {
        id: "privacy-security",
        type: "legalSection",
        name: "Data Security",
        content: {
          id: "security",
          title: "Data Security",
          icon: "Lock",
          blocks: [
            { heading: "Protection Measures", text: "The security of Your Personal Data is important to Us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While We strive to use commercially acceptable means to protect Your Personal Data, We cannot guarantee its absolute security." },
          ],
        },
      },
      {
        id: "privacy-rights",
        type: "legalSection",
        name: "Your Rights",
        content: {
          id: "rights",
          title: "Your Rights",
          icon: "Scale",
          blocks: [
            { heading: "Access & Control", text: "You have the right to request access to your personal data, rectify incorrect data, or request the deletion of your data under certain circumstances (Right to be Forgotten). You also have the right to restrict processing of your personal data." },
          ],
        },
      },
      {
        id: "privacy-contact",
        type: "legalSection",
        name: "Contact Us",
        content: {
          id: "contact",
          title: "Contact Us",
          icon: "Mail",
          blocks: [
            { heading: "Get in Touch", text: "If you have any questions about this Privacy Policy, You can contact us:" },
            { heading: "Email", text: "privacy@skillkart.com" },
            { heading: "Address", text: "123 Tech Park, Innovation Way, Silicon Valley, CA" },
          ],
        },
      },
      {
        id: "privacy-cta",
        type: "cta",
        name: "Footer CTA",
        content: {
          title: "Your Privacy Matters",
          description: "We are committed to full transparency. If you have any further questions that aren't answered here, please reach out to our data protection team.",
          buttonText: "Contact Data Protection Team",
        },
      },
    ],
  },

  // ==================== TERMS OF SERVICE PAGE ====================
  termsofservice: {
    id: "termsofservice",
    name: "Terms of Service",
    slug: "/terms-and-conditions",
    lastUpdated: "January 20, 2026",
    sections: [
      {
        id: "terms-hero",
        type: "hero",
        name: "Terms Hero",
        content: {
          lastUpdated: "January 20, 2026",
          title: "Terms of Service",
          subtitle: "Please read these terms carefully before exploring the SkillKart ecosystem.",
          description: "Welcome to SkillKart. These Terms of Service ('Terms') govern your access to and use of the SkillKart platform, website, and services. By creating an account or accessing our platform, you agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use usage of our Services.",
          heroImage: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=2670&auto=format&fit=crop",
        },
      },
      {
        id: "terms-acceptance",
        type: "legalSection",
        name: "Acceptance of Terms",
        content: {
          id: "acceptance",
          title: "Acceptance of Terms",
          icon: "FileCheck",
          blocks: [
            { heading: "Agreement", text: "By accessing or using SkillKart, you agree to comply with and be bound by these Terms and our Privacy Policy. These Terms apply to all visitors, users, and others who utilize our Service." },
            { heading: "Updates to Terms", text: "We reserve the right to modify these Terms at any time. We will notify you of any changes by posting the new Terms on this page. Your continued use of the Service after any such changes constitutes your acceptance of the new Terms." },
          ],
        },
      },
      {
        id: "terms-definitions",
        type: "legalSection",
        name: "Definitions",
        content: {
          id: "definitions",
          title: "Definitions",
          icon: "Terminal",
          blocks: [
            { heading: "Platform", text: "Refers to the SkillKart website and related services provided by SkillKart Inc." },
            { heading: "User", text: "Any individual or entity who accesses or uses the Platform, including Freelancers and Clients." },
            { heading: "Freelancer", text: "A User who offers and performs services ('Gigs') for Clients through the Platform." },
            { heading: "Client", text: "A User who purchases services ('Gigs') from Freelancers through the Platform." },
          ],
        },
      },
      {
        id: "terms-accounts",
        type: "legalSection",
        name: "Account Registration",
        content: {
          id: "accounts",
          title: "Account Registration",
          icon: "Users",
          blocks: [
            { heading: "Eligibility", text: "You must be at least 18 years old to create an account on SkillKart. By creating an account, you represent and warrant that you are capable of entering into a binding contract." },
            { heading: "Account Security", text: "You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. SkillKart is not liable for any loss or damage arising from your failure to protect your account." },
          ],
        },
      },
      {
        id: "terms-freelancers",
        type: "legalSection",
        name: "Freelancer Obligations",
        content: {
          id: "freelancers",
          title: "Freelancer Obligations",
          icon: "Gavel",
          blocks: [
            { heading: "Service Quality", text: "Freelancers must perform services in a professional manner and deliver work that meets the specifications agreed upon with the Client." },
            { heading: "Independence", text: "Freelancers acknowledge that they are independent contractors and not employees, partners, or agents of SkillKart. You are solely responsible for your own taxes and insurance." },
            { heading: "Prohibited Content", text: "You may not offer services that are illegal, violate intellectual property rights, or violate our Community Guidelines." },
          ],
        },
      },
      {
        id: "terms-payments",
        type: "legalSection",
        name: "Payments & Fees",
        content: {
          id: "payments",
          title: "Payments & Fees",
          icon: "DollarSign",
          blocks: [
            { heading: "Service Fees", text: "SkillKart charges a service fee on all transactions to cover platform maintenance and support. This fee is deducted automatically from the payment released to the Freelancer." },
            { heading: "Escrow System", text: "Payments are held in escrow until the Client marks the order as complete. This ensures security for both parties. Disputes are handled via our Resolution Center." },
            { heading: "Withdrawals", text: "Funds can be withdrawn to your connected bank account or payment method after a standard clearance period." },
          ],
        },
      },
      {
        id: "terms-ip",
        type: "legalSection",
        name: "Intellectual Property",
        content: {
          id: "ip",
          title: "Intellectual Property",
          icon: "Copyright",
          blocks: [
            { heading: "Ownership of Work", text: "Unless otherwise clearly stated in the Gig description, when the work is delivered and paid for, the Client is granted all intellectual property rights, including but not limited to, copyright in the work delivered from the Freelancer." },
            { heading: "Platform IP", text: "The SkillKart logo, design, and original content are the exclusive property of SkillKart Inc. and are protected by copyright and benchmark laws." },
          ],
        },
      },
      {
        id: "terms-prohibited",
        type: "legalSection",
        name: "Prohibited Activities",
        content: {
          id: "prohibited",
          title: "Prohibited Activities",
          icon: "Ban",
          blocks: [
            { heading: "Zero Tolerance", text: "We strictly prohibit spam, fraud, harassment, hate speech, and the distribution of malware. Engaging in such activities will result in immediate account suspension." },
            { heading: "Circumvention", text: "Users may not communicate or transact outside the SkillKart platform for orders initiated on SkillKart to avoid service fees. This is a violation of our Terms." },
          ],
        },
      },
      {
        id: "terms-liability",
        type: "legalSection",
        name: "Limitation of Liability",
        content: {
          id: "liability",
          title: "Limitation of Liability",
          icon: "AlertTriangle",
          blocks: [
            { heading: "Disclaimer", text: "SkillKart services are provided 'as is'. We expressly disclaim all warranties, whether express or implied. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform." },
          ],
        },
      },
      {
        id: "terms-termination",
        type: "legalSection",
        name: "Termination",
        content: {
          id: "termination",
          title: "Termination",
          icon: "Shield",
          blocks: [
            { heading: "Right to Terminate", text: "We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms." },
          ],
        },
      },
      {
        id: "terms-cta",
        type: "cta",
        name: "Footer CTA",
        content: {
          title: "Need Legal Clarification?",
          description: "If you have questions regarding our terms, intellectual property disputes, or platform rules, our legal team is here to assist you.",
          buttonText: "Contact Legal Team",
        },
      },
    ],
  },

  // ==================== LOGIN PAGE ====================
  login: {
    id: "login",
    name: "Login",
    slug: "/login",
    lastUpdated: new Date().toISOString(),
    sections: [
      {
        id: "login-hero",
        type: "authHero",
        name: "Login Hero",
        content: {
          title: "Welcome Back",
          description: "Sign in to access your dashboard and continue where you left off.",
          heroImage: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1200",
          features: [
            "End-to-end encrypted",
            "Two-factor authentication",
            "Secure session management",
          ],
        },
      },
      {
        id: "login-form",
        type: "authForm",
        name: "Login Form",
        content: {
          logo: "SK",
          title: "Sign In",
          subtitle: "Access your workspace",
          fields: [
            { type: "email", placeholder: "Enter your email", icon: "Mail" },
            { type: "password", placeholder: "Enter your password", icon: "Lock" },
          ],
          rememberMe: true,
          forgotPasswordText: "Forgot?",
          submitButtonText: "Sign In",
          socialLogin: {
            enabled: true,
            providers: ["Google", "GitHub", "LinkedIn"],
          },
          footer: {
            text: "Don't have an account?",
            linkText: "Sign up",
            linkUrl: "/register",
          },
        },
      },
    ],
  },

  // ==================== REGISTER PAGE ====================
  register: {
    id: "register",
    name: "Register",
    slug: "/register",
    lastUpdated: new Date().toISOString(),
    sections: [
      {
        id: "register-hero",
        type: "authHero",
        name: "Register Hero",
        content: {
          title: "Join Us Today",
          description: "Start your journey as a client or freelancer and unlock endless opportunities.",
          heroImage: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1200",
          features: [
            "Secure & Verified Community",
            "Easy Payment & Escrow",
            "24/7 Customer Support",
          ],
        },
      },
      {
        id: "register-role-selection",
        type: "roleSelection",
        name: "Role Selection",
        content: {
          logo: "SK",
          title: "Get Started",
          subtitle: "Choose your role to create an account",
          roles: [
            {
              role: "client",
              title: "I'm a Client",
              description: "I want to hire freelancers and get projects done",
              icon: "Briefcase",
            },
            {
              role: "freelancer",
              title: "I'm a Freelancer",
              description: "I want to offer my skills and earn money",
              icon: "Code",
            },
          ],
          footer: {
            text: "Already have an account?",
            linkText: "Sign in",
            linkUrl: "/login",
          },
        },
      },
      {
        id: "register-step1",
        type: "authForm",
        name: "Registration Step 1",
        content: {
          stepIndicator: "Step 1 of 2",
          title: "Create Account",
          subtitleTemplate: "Sign up as a {role}",
          fields: [
            { type: "email", placeholder: "Enter your email", icon: "Mail" },
            { type: "password", placeholder: "Create a password", icon: "Lock" },
            { type: "password", placeholder: "Confirm password", icon: "Lock", name: "confirmPassword" },
          ],
          termsCheckbox: {
            text: "I agree to the Terms of Service and Privacy Policy",
            required: true,
          },
          submitButtonText: "Continue",
        },
      },
      {
        id: "register-step2-client",
        type: "profileForm",
        name: "Client Profile Form",
        content: {
          stepIndicator: "Step 2 of 2",
          title: "Complete Profile",
          subtitle: "Tell us about your business",
          fields: [
            { type: "row", inputs: [
              { name: "firstName", placeholder: "First Name", required: true },
              { name: "lastName", placeholder: "Last Name", required: true },
            ]},
            { type: "select", name: "companyType", label: "Company Type", options: ["Individual", "Startup", "Small Business", "Enterprise", "Agency"], required: true },
            { type: "text", name: "companyName", label: "Company Name (Optional)", placeholder: "Enter company name" },
            { type: "select", name: "industry", label: "Industry (Optional)", options: ["Technology", "Marketing", "Design", "Finance", "Healthcare", "E-commerce", "Other"] },
          ],
          submitButtonText: "Create Account",
        },
      },
      {
        id: "register-step2-freelancer",
        type: "profileForm",
        name: "Freelancer Profile Form",
        content: {
          stepIndicator: "Step 2 of 2",
          title: "Complete Profile",
          subtitle: "Showcase your expertise",
          fields: [
            { type: "row", inputs: [
              { name: "firstName", placeholder: "First Name", required: true },
              { name: "lastName", placeholder: "Last Name", required: true },
            ]},
            { type: "select", name: "skillCategory", label: "Primary Skill Category", options: ["Web Development", "UI/UX Design", "Mobile Development", "Data Science", "Content Writing", "Digital Marketing", "Graphic Design", "Other"], required: true },
            { type: "file", name: "cvFile", label: "Upload CV/Resume", accept: ".pdf,.doc,.docx", helperText: "Supported formats: PDF, DOC, DOCX (Max 5MB)", required: true },
            { type: "number", name: "hourlyRate", label: "Hourly Rate (USD)", placeholder: "50", min: 1, prefix: "$", required: true },
          ],
          submitButtonText: "Create Account",
        },
      },
    ],
  },
};

// Reusable UI Components
export const initialComponents = {
  navbar: {
    id: "navbar",
    name: "Navbar",
    type: "navigation",
    content: {
      logo: {
        text: "SKILLKART",
        highlightText: "KART",
        link: "/",
      },
      links: [
        { text: "Home", href: "/" },
        { text: "About", href: "/about" },
        { text: "How It Works", href: "/howitworks" },
        { text: "Contact", href: "/contact" },
      ],
      ctaButton: {
        text: "Get Started",
        href: "/register",
        variant: "primary",
      },
      mobileMenuEnabled: true,
    },
  },
  footer: {
    id: "footer",
    name: "Footer",
    type: "navigation",
    content: {
      logo: {
        text: "SKILLKART",
        tagline: "Micro Freelance Platform",
      },
      columns: [
        {
          title: "Platform",
          links: [
            { text: "How It Works", href: "/howitworks" },
            { text: "Find Talent", href: "/find-talent" },
            { text: "Post a Job", href: "/post-job" },
          ],
        },
        {
          title: "Company",
          links: [
            { text: "About Us", href: "/about" },
            { text: "Contact", href: "/contact" },
            { text: "Careers", href: "/careers" },
          ],
        },
        {
          title: "Legal",
          links: [
            { text: "Privacy Policy", href: "/privacy-policy" },
            { text: "Terms of Service", href: "/terms-and-conditions" },
          ],
        },
      ],
      social: [
        { platform: "Facebook", href: "https://facebook.com/skillkart", icon: "Facebook" },
        { platform: "Twitter", href: "https://twitter.com/skillkart", icon: "Twitter" },
        { platform: "LinkedIn", href: "https://linkedin.com/company/skillkart", icon: "Linkedin" },
        { platform: "Instagram", href: "https://instagram.com/skillkart", icon: "Instagram" },
      ],
      copyright: "© 2024 SkillKart. All rights reserved.",
    },
  },
  ctaPrimary: {
    id: "cta-primary",
    name: "Primary CTA",
    type: "button",
    content: {
      text: "Get Started",
      href: "/register",
      variant: "primary",
      icon: "ArrowUpRight",
    },
  },
  ctaSecondary: {
    id: "cta-secondary",
    name: "Secondary CTA",
    type: "button",
    content: {
      text: "Learn More",
      href: "/about",
      variant: "secondary",
      icon: "ArrowRight",
    },
  },
};

// Media library
export const initialMedia = [
  {
    id: "media-1",
    name: "Team Collaboration",
    url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200",
    type: "image",
    alt: "Team collaboration meeting",
    category: "team",
    uploadedAt: new Date().toISOString(),
  },
  {
    id: "media-2",
    name: "Workspace",
    url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1200",
    type: "image",
    alt: "Developer workspace with laptop",
    category: "office",
    uploadedAt: new Date().toISOString(),
  },
  {
    id: "media-3",
    name: "Office Building",
    url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300",
    type: "image",
    alt: "Modern office building",
    category: "office",
    uploadedAt: new Date().toISOString(),
  },
  {
    id: "media-4",
    name: "London Skyline",
    url: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=300",
    type: "image",
    alt: "London city skyline",
    category: "locations",
    uploadedAt: new Date().toISOString(),
  },
  {
    id: "media-5",
    name: "New York City",
    url: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=300",
    type: "image",
    alt: "New York City street",
    category: "locations",
    uploadedAt: new Date().toISOString(),
  },
  {
    id: "media-6",
    name: "Team Meeting",
    url: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1200",
    type: "image",
    alt: "Team meeting in office",
    category: "team",
    uploadedAt: new Date().toISOString(),
  },
  {
    id: "media-7",
    name: "Privacy Security",
    url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2670&auto=format&fit=crop",
    type: "image",
    alt: "Digital security concept",
    category: "legal",
    uploadedAt: new Date().toISOString(),
  },
  {
    id: "media-8",
    name: "Legal Documents",
    url: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=2670&auto=format&fit=crop",
    type: "image",
    alt: "Legal documents and contract",
    category: "legal",
    uploadedAt: new Date().toISOString(),
  },
];

// Form configurations
export const initialForms = {
  contactForm: {
    id: "contact-form",
    name: "Contact Form",
    fields: [
      { id: "firstName", label: "First Name", type: "text", placeholder: "John", required: true },
      { id: "lastName", label: "Last Name", type: "text", placeholder: "Doe", required: true },
      { id: "email", label: "Email", type: "email", placeholder: "john@company.com", required: true },
      { id: "jobTitle", label: "Job Title", type: "text", placeholder: "Product Designer", required: false },
      { id: "company", label: "Company Name", type: "text", placeholder: "Acme Corp", required: false },
      { id: "interested", label: "I'm Interested in...", type: "select", options: ["Web Development", "Product Design", "Marketing", "Other"], required: true },
      { id: "region", label: "Region", type: "select", options: ["United Kingdom", "United States", "Europe", "Asia"], required: true },
      { id: "heardFrom", label: "Where did you hear about us?", type: "select", options: ["Google", "LinkedIn", "Clutch", "Recommendation"], required: true },
      { id: "message", label: "How can we help you?", type: "textarea", placeholder: "Start typing here...", required: true },
    ],
    submitButton: { text: "Submit Form", style: "primary" },
  },
  loginForm: {
    id: "login-form",
    name: "Login Form",
    fields: [
      { id: "email", label: "Email", type: "email", placeholder: "Enter your email", required: true },
      { id: "password", label: "Password", type: "password", placeholder: "Enter your password", required: true },
    ],
    submitButton: { text: "Sign In", style: "primary" },
    rememberMe: true,
    forgotPassword: { text: "Forgot?", link: "/forgot-password" },
  },
  registerForm: {
    id: "register-form",
    name: "Registration Form",
    steps: [
      {
        step: 1,
        title: "Create Account",
        fields: [
          { id: "email", label: "Email", type: "email", placeholder: "Enter your email", required: true },
          { id: "password", label: "Password", type: "password", placeholder: "Create a password", required: true },
          { id: "confirmPassword", label: "Confirm Password", type: "password", placeholder: "Confirm password", required: true },
        ],
      },
      {
        step: 2,
        title: "Complete Profile",
        clientFields: [
          { id: "firstName", label: "First Name", type: "text", placeholder: "First Name", required: true },
          { id: "lastName", label: "Last Name", type: "text", placeholder: "Last Name", required: true },
          { id: "companyType", label: "Company Type", type: "select", options: ["Individual", "Startup", "Small Business", "Enterprise", "Agency"], required: true },
          { id: "companyName", label: "Company Name", type: "text", placeholder: "Enter company name", required: false },
          { id: "industry", label: "Industry", type: "select", options: ["Technology", "Marketing", "Design", "Finance", "Healthcare", "E-commerce", "Other"], required: false },
        ],
        freelancerFields: [
          { id: "firstName", label: "First Name", type: "text", placeholder: "First Name", required: true },
          { id: "lastName", label: "Last Name", type: "text", placeholder: "Last Name", required: true },
          { id: "skillCategory", label: "Primary Skill Category", type: "select", options: ["Web Development", "UI/UX Design", "Mobile Development", "Data Science", "Content Writing", "Digital Marketing", "Graphic Design", "Other"], required: true },
          { id: "cvFile", label: "Upload CV/Resume", type: "file", accept: ".pdf,.doc,.docx", required: true },
          { id: "hourlyRate", label: "Hourly Rate (USD)", type: "number", placeholder: "50", min: 1, required: true },
        ],
      },
    ],
    submitButton: { text: "Create Account", style: "primary" },
  },
};

export default {
  siteSettings: initialSiteSettings,
  pages: initialPages,
  components: initialComponents,
  media: initialMedia,
  forms: initialForms,
};
