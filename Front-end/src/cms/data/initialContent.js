export const initialSiteSettings = {
  siteName: "SkillKart",
  siteDescription: "Micro Freelance Platform",
  logoText: "SKILLKART",
  primaryColor: "#000000",
  secondaryColor: "#b3f5e1",
  contactEmail: "hello@skillkart.com",
  socialLinks: {
    facebook: "",
    twitter: "",
    linkedin: "",
    instagram: ""
  }
};

export const initialPages = {
  home: {
    id: "home",
    name: "Home Page",
    slug: "/",
    lastUpdated: new Date().toISOString(),
    sections: [
      {
        id: "home-hero",
        type: "hero",
        name: "Home Hero",
        content: {
          titleStart: "Welcome to",
          titleEnd: "SkillKart",
          subtitle: "Micro Freelance Platform",
          descriptionOne: "Connect with skilled talent for your micro tasks.",
          descriptionTwo: "Hire safely with escrow protection.",
          backgroundImage: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200",
          searchPlaceholder: "Search for services..."
        },
      },
      {
        id: "home-infobar",
        type: "infoBar",
        name: "Home InfoBar",
        content: {
          headlineWords: ["Driving", "Efficiency", "through"],
          highlightWord: "Skill",
          description: "Bridging the gap between talented individuals and businesses needing quick, high-quality help.",
          highlightImage: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=300",
          primaryButton: { text: "Our Story", link: "/about" },
          secondaryButton: { text: "Contact Us", link: "/contact" }
        },
      },
      {
        id: "home-featured-categories",
        type: "categories",
        name: "Featured Categories",
        content: {
          title: "Explore Categories",
          categories: [
            { id: "01", title: "Web Development", desc: "Build modern websites", date: "[2024-2025]", color: "from-gray-800 to-black", img: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400" },
            { id: "02", title: "Graphic Design", desc: "Stunning visual designs", date: "[2024-2025]", color: "from-gray-700 to-gray-900", img: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=400" }
          ]
        }
      },
      {
        id: "home-services",
        type: "services",
        name: "Our Services",
        content: {
          headerTitle: "Our Prime Services",
          headerImage: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400",
          viewAllText: "View All",
          viewAllLink: "/services",
          services: [
            { id: 1, name: "Web Design", icon: "Zap", desc: "Modern & Responsive", link: "/web-design" },
            { id: 2, name: "SEO", icon: "Search", desc: "Rank higher on Google", link: "/seo" },
            { id: 3, name: "Data Analytics", icon: "BarChart3", desc: "Actionable Insights", link: "/analytics" }
          ],
          stats: [
            { value: "1000+", label: "Tasks Done" },
            { value: "500+", label: "Happy Clients" },
            { value: "50+", label: "Top Experts" },
            { value: "24/7", label: "Support" }
          ],
          showStats: true
        }
      },
      {
        id: "home-scrolling-text",
        type: "scrollingText",
        name: "Scrolling Text",
        content: {
          items: [
            { text: "Fast Hiring", image: "https://images.unsplash.com/photo-1557821552-17105176677c?w=400" },
            { text: "Secure Payments", image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400" },
            { text: "Verified Talent", image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400" }
          ]
        }
      },
      {
        id: "home-team",
        type: "team",
        name: "Platform Team",
        content: {
          title: "Meet the Team",
          backgroundColor: "#f0f0f0",
          cards: [
             { id: 0, title: "Team SkillKart", position: "Core Team", bgColor: "#000000", textColor: "#ffffff", image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400", description: "Dedicated to building the best micro-freelance platform in Pakistan.", rotate: 0 }
          ]
        }
      },
      {
        id: "home-blog",
        type: "blog",
        name: "Latest News",
        content: {
          sectionTitle: "What's",
          sectionTitleHighlight: "New",
          ctaText: "Explore More",
          ctaLink: "/blog",
          decorativeImage: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400",
          posts: [
             { id: 1, title: "Welcome to SkillKart", category: "News", author: "Admin", readTime: "5 mins", image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400", link: "/blog/welcome" }
          ]
        }
      },
      {
        id: "home-cta",
        type: "cta",
        name: "Home CTA",
        content: {
          text: "Ready to serve SkillKart?",
          id: "2250"
        }
      }
    ],
  },
  about: {
    id: "about",
    name: "About Us",
    slug: "/about",
    lastUpdated: new Date().toISOString(),
    sections: [
       {
        id: "about-hero",
        type: "aboutHero",
        name: "About Hero",
        content: {
          subHeading: "Our Story",
          heading: { line1: "Bridging the Gap", line2: "in Micro-Freelancing" },
          description: [
            "SkillKart was founded with a mission to connect talent with opportunity.",
            "We believe in the power of micro-freelancing to empower individuals.",
            "Today, we are the leading platform for verified micro-tasks in Pakistan."
          ],
          ctaButton: "Learn More",
          images: {
            main: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200",
            founder: "https://ui-avatars.com/api/?name=Skill+Kart"
          },
          quote: {
            text: "Building trust in every transaction is our priority.",
            author: "Hassan",
            role: "Founder"
          }
        }
      },
      {
        id: "about-mission",
        type: "mission",
        name: "Mission & Values",
        content: {
          badge: "Our Drive",
          title: "Mission & Values",
          description: "We are guided by transparency, speed, and safety.",
          values: [
            { icon: "Users", title: "Community", description: "Connect with neighbors solve problems." },
            { icon: "ShieldCheck", title: "Safety", description: "Secure payments and verified profiles." },
            { icon: "Award", title: "Quality", description: "Only top-tier talent is accepted." },
            { icon: "Globe2", title: "Reach", description: "Available across all major cities of Pakistan." }
          ]
        }
      },
      {
        id: "about-stats",
        type: "stats",
        name: "Platform Stats",
        content: {
          image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800",
          title: { line1: "Real Impact", line2: "Real Growth" },
          description: "Our community is growing every day.",
          metrics: [
             { number: "2", label: "Years", suffix: "+" },
             { number: "10", label: "Skills", suffix: "k+" },
             { number: "5", label: "Users", suffix: "k+" },
             { number: "98", label: "Success", suffix: "%" }
          ]
        }
      },
      {
        id: "about-team",
        type: "teamMembers",
        name: "Team Members",
        content: {
          title: "The Minds Behind SkillKart",
          description: "Meet the people making it happen.",
          members: [
            { name: "Hassan Siddiqui", role: "CEO", img: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400" },
            { name: "Ammad", role: "Co-Founder", img: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400" },
            { name: "Sumair", role: "Tech Lead", img: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400" },
            { name: "Sherry", role: "Marketing", img: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400" }
          ]
        }
      },
      {
        id: "about-standards",
        type: "standards",
        name: "Our Standards",
        content: {
          title: "Our Standards & Commitments",
          tags: ["Identity Verified", "Secure Payments", "24/7 Support", 
      "Data Privacy First", "No Hidden Fees", "Quality Guarantee"]
        }
      },
      {
        id: "about-cta",
        type: "cta",
        name: "About Footer CTA",
        content: {
          title: "Join Us Today",
          buttons: {
            primary: "Find Work",
            secondary: "Post a Task"
          }
        }
      }
    ]
  },
  contact: {
    id: "contact",
    name: "Contact Us",
    slug: "/contact",
    lastUpdated: new Date().toISOString(),
    sections: [
      {
        id: "contact-hero",
        type: "contactHero",
        name: "Contact Hero",
        content: {
          title: "Fill out our form top to get in touch",
          description: "Interested in joining our team? Head over to our Careers page to check our latest vacancies.",
          heroImage: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1200",
          buttonText: "Careers"
        }
      },
      {
         id: "contact-offices",
         type: "offices",
         name: "Our Offices",
         content: {
           sectionTitle: "Our Office Locations",
           offices: [
              { city: "Karachi", country: "Pakistan", address: "DHA Phase 6, Karachi", img: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300" },
              { city: "Lahore", country: "Pakistan", address: "Gulberg III, Lahore", img: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=300" },
              { city: "Islamabad", country: "Pakistan", address: "Blue Area, Islamabad", img: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=300" }
           ]
         }
      }
    ]
  },
  howitworks: {
    id: "howitworks",
    name: "How It Works",
    slug: "/howitworks",
    lastUpdated: new Date().toISOString(),
    sections: []
  },
  privacypolicy: {
    id: "privacypolicy",
    name: "Privacy Policy",
    slug: "/privacy-policy",
    lastUpdated: new Date().toISOString(),
    sections: []
  },
  termsofservice: {
    id: "termsofservice",
    name: "Terms of Service",
    slug: "/terms-and-conditions",
    lastUpdated: new Date().toISOString(),
    sections: []
  },
  login: {
    id: "login",
    name: "Login",
    slug: "/login",
    lastUpdated: new Date().toISOString(),
    sections: []
  },
  register: {
    id: "register",
    name: "Register",
    slug: "/register",
    lastUpdated: new Date().toISOString(),
    sections: []
  }
};

export const initialComponents = {
  navbar: {
    id: "navbar",
    name: "Navbar",
    type: "navigation",
    content: {
      logo: { text: "SKILLKART", highlightText: "KART", link: "/" },
      links: [
        { text: "Home", href: "/" },
        { text: "About", href: "/about" },
        { text: "How It Works", href: "/howitworks" },
        { text: "Contact", href: "/contact" }
      ]
    },
  },
  footer: {
    id: "footer",
    name: "Footer",
    type: "navigation",
    content: {
      copyright: "© 2026 SkillKart. All rights reserved."
    },
  }
};

export const initialMedia = [];
export const initialForms = {
  contactForm: {
     id: "contact-form",
     fields: [
        { id: "first_name", label: "HELLO, MY FIRST NAME IS...", type: "text", placeholder: "John", required: true },
        { id: "last_name", label: "AND MY LAST NAME IS...", type: "text", placeholder: "Doe", required: true },
        { id: "email", label: "MY EMAIL IS", type: "email", placeholder: "john@company.com", required: true, fullWidth: true },
        { id: "job_title", label: "MY JOB TITLE IS...", type: "text", placeholder: "Product Designer", required: true },
        { id: "company_name", label: "MY COMPANY NAME IS...", type: "text", placeholder: "Acme Corp", required: true },
        { id: "interested", label: "I'M INTERESTED IN...", type: "select", options: ["Hiring", "Working", "Partnership", "Other"], required: true, fullWidth: true },
        { id: "country", label: "COUNTRY", type: "select", options: [], required: true },
        { id: "source", label: "WHERE DID YOU HEAR ABOUT US?", type: "select", options: ["Google", "Social Media", "Friend", "Other"], required: true },
        { id: "message", label: "HOW CAN WE HELP YOU?", type: "textarea", placeholder: "Start typing here...", required: true }
     ],
     submitButton: { text: "Submit Form" }
  }
};

export default {
  siteSettings: initialSiteSettings,
  pages: initialPages,
  components: initialComponents,
  media: initialMedia,
  forms: initialForms,
};
