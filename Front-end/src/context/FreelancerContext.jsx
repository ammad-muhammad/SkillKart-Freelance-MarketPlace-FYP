import { createContext, useContext, useState } from 'react';

const FreelancerContext = createContext(null);

export const useFreelancer = () => {
  const ctx = useContext(FreelancerContext);
  if (!ctx) throw new Error('useFreelancer must be used inside FreelancerProvider');
  return ctx;
};

const initialProfile = {
  personalInfo: {
    fullName: 'Alex Johnson',
    username: 'alexjohnson',
    email: 'alex.johnson@example.com',
    phone: '+1 (555) 000-0000',
    bio: 'Passionate full-stack developer with 5+ years of experience building scalable web apps.',
    title: 'Full Stack Developer',
    location: 'New York, USA',
    memberSince: 'January 2022',
    avatar: null,
    experienceLevel: 'Expert',
    education: 'B.Sc. Computer Science – MIT',
    certifications: 'AWS Certified Developer, Google Cloud Professional',
  },
  skills: ['React', 'Node.js', 'TypeScript', 'MongoDB', 'GraphQL'],
  languages: ['English', 'Spanish'],
  portfolioLinks: ['https://alexjohnson.dev', 'https://github.com/alexjohnson'],
  socialLinks: {
    github: 'https://github.com/alexjohnson',
    linkedin: 'https://linkedin.com/in/alexjohnson',
    website: 'https://alexjohnson.dev',
  },
  stats: {
    totalGigs: 0,
    activeOrders: 2,
    completedOrders: 18,
    profileViews: 342,
  },
  securitySettings: {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false,
    emailVerified: true,
    recoveryEmail: 'alex.backup@email.com',
    recoveryPhone: '+1 (555) 111-1111',
  },
};

const initialGigs = [
  {
    id: 'gig-001',
    title: 'I will build a full-stack React + Node.js web application',
    category: 'Web Development',
    subcategory: 'Full Stack',
    skills: ['React', 'Node.js', 'MongoDB'],
    shortDescription: 'Professional full-stack app with modern UI.',
    fullDescription: 'I will develop a complete full-stack web application using React for the frontend and Node.js for the backend. The solution includes authentication, CRUD operations, and deployment-ready configuration.',
    pricing: {
      basic: { price: 150, delivery: 7, revisions: 2 },
      standard: { price: 350, delivery: 14, revisions: 3 },
      premium: { price: 700, delivery: 21, revisions: 5 },
    },
    faqs: [{ question: 'Will you deploy the app?', answer: 'Yes, I include a basic deployment setup.' }],
    media: { banner: null, images: [], videoLink: '', portfolioLinks: [] },
    status: 'active',
    createdAt: '2024-11-10',
  },
  {
    id: 'gig-002',
    title: 'I will design a stunning UI/UX for your mobile app',
    category: 'Design',
    subcategory: 'UI/UX Design',
    skills: ['Figma', 'Adobe XD', 'Prototyping'],
    shortDescription: 'Pixel-perfect, user-friendly mobile UI designs.',
    fullDescription: 'I create beautiful, functional mobile app UI designs in Figma. Includes user flows, wireframes, and high-fidelity mockups.',
    pricing: {
      basic: { price: 100, delivery: 5, revisions: 2 },
      standard: { price: 250, delivery: 10, revisions: 4 },
      premium: { price: 500, delivery: 20, revisions: 'Unlimited' },
    },
    faqs: [],
    media: { banner: null, images: [], videoLink: '', portfolioLinks: [] },
    status: 'active',
    createdAt: '2025-01-05',
  },
];

const initialSavedProjects = [
  {
    id: 'proj-001',
    title: 'Build a Full-Stack SaaS Dashboard with React & Node',
    category: 'Web Development',
    budget: { min: 2000, max: 5000 },
    duration: '1-3 months',
    postedAt: '2026-02-15'
  }
];

export const FreelancerProvider = ({ children }) => {
  const [profile, setProfile] = useState(initialProfile);
  const [gigs, setGigs] = useState(initialGigs);
  const [savedProjects, setSavedProjects] = useState(initialSavedProjects);
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  const updateProfile = (section, data, silent = false) => {
    setProfile((prev) => {
      let next;
      if (typeof data === 'function') {
        next = data(prev[section]);
      } else if (Array.isArray(data) || typeof data !== 'object' || data === null) {
        next = data;
      } else {
        next = { ...prev[section], ...data };
      }
      return { ...prev, [section]: next };
    });
    if (!silent) showToast('Profile updated successfully!');
  };

  const addGig = (gig) => {
    const newGig = { ...gig, id: `gig-${Date.now()}`, createdAt: new Date().toISOString().split('T')[0] };
    setGigs((prev) => [...prev, newGig]);
    setProfile((prev) => ({
      ...prev,
      stats: { ...prev.stats, totalGigs: prev.stats.totalGigs + 1 },
    }));
    showToast('Gig published successfully! 🎉');
    return newGig;
  };

  const updateGig = (id, data) => {
    setGigs((prev) => prev.map((g) => (g.id === id ? { ...g, ...data } : g)));
    showToast('Gig updated successfully!');
  };

  const deleteGig = (id) => {
    setGigs((prev) => prev.filter((g) => g.id !== id));
    setProfile((prev) => ({
      ...prev,
      stats: { ...prev.stats, totalGigs: Math.max(0, prev.stats.totalGigs - 1) },
    }));
    showToast('Gig deleted.', 'info');
  };

  const toggleGigStatus = (id) => {
    setGigs((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, status: g.status === 'active' ? 'paused' : 'active' } : g
      )
    );
  };

  const toggleSavedProject = (project) => {
    setSavedProjects(prev => {
      const exists = prev.find(p => p.id === project.id);
      if (exists) {
        showToast('Project removed from saved.', 'info');
        return prev.filter(p => p.id !== project.id);
      } else {
        showToast('Project saved successfully! 🔖');
        return [...prev, project];
      }
    });
  };

  return (
    <FreelancerContext.Provider
      value={{ 
        profile, setProfile, updateProfile, 
        gigs, addGig, updateGig, deleteGig, toggleGigStatus,
        savedProjects, toggleSavedProject,
        toasts, showToast 
      }}
    >
      {children}
    </FreelancerContext.Provider>
  );
};

