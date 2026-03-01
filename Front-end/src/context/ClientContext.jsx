import { createContext, useContext, useState } from 'react';

const ClientContext = createContext(null);

export const useClient = () => {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error('useClient must be used inside ClientProvider');
  return ctx;
};

const initialProfile = {
  personalInfo: {
    fullName: 'Sarah Mitchell',
    username: 'sarahmitchell',
    email: 'sarah.mitchell@techcorp.com',
    phone: '+1 (555) 987-6543',
    companyName: 'TechCorp Solutions',
    industry: 'Software & Technology',
    website: 'https://techcorp.io',
    location: 'San Francisco, USA',
    bio: 'We build cutting-edge SaaS products and love working with talented freelancers worldwide.',
    avatar: null,
    companyLogo: null,
    memberSince: 'March 2023',
  },
  preferences: {
    preferredSkills: ['React', 'Node.js', 'UI/UX', 'Python'],
    budgetRange: { min: 500, max: 5000 },
    projectTypes: ['Web Development', 'Mobile App', 'Design'],
    remoteOnly: true,
  },
  notificationSettings: {
    emailNotifications: true,
    proposalAlerts: true,
    messageAlerts: true,
  },
  securitySettings: {
    twoFactorEnabled: false,
    emailVerified: true,
    recoveryEmail: 'sarah.backup@email.com',
    recoveryPhone: '+1 (555) 111-2222',
  },
  stats: {
    totalProjects: 0,
    activeProjects: 2,
    freelancersHired: 8,
    totalSpent: 12400,
  },
};

const initialProjects = [
  {
    id: 'proj-001',
    title: 'Build a Full-Stack SaaS Dashboard with React & Node',
    category: 'Web Development',
    subcategory: 'Full Stack',
    skills: ['React', 'Node.js', 'MongoDB', 'REST API'],
    experienceLevel: 'Expert',
    projectType: 'fixed',
    summary: 'Need a professional developer to build our internal SaaS dashboard.',
    budget: { min: 2000, max: 5000 },
    duration: '1-3 months',
    deadline: '2026-05-01',
    milestones: true,
    fullDescription: 'We are looking for an experienced full-stack developer to build a comprehensive SaaS dashboard. The project includes user management, analytics, billing integration, and real-time data visualization.',
    responsibilities: 'Frontend & backend development, API integration, testing',
    deliverables: 'Fully functional dashboard, documentation, deployment',
    referenceLinks: ['https://example-similar-project.com'],
    faqs: [{ question: 'Is remote work allowed?', answer: 'Yes, 100% remote.' }],
    attachments: { images: [], documents: [], links: [] },
    status: 'open',
    createdAt: '2026-02-15',
  },
  {
    id: 'proj-002',
    title: 'Design a Modern Mobile App UI for iOS & Android',
    category: 'Design',
    subcategory: 'UI/UX Design',
    skills: ['Figma', 'Adobe XD', 'Prototyping', 'Mobile Design'],
    experienceLevel: 'Intermediate',
    projectType: 'fixed',
    summary: 'Mobile app UI/UX design for fintech startup.',
    budget: { min: 800, max: 2000 },
    duration: '2-4 weeks',
    deadline: '2026-04-01',
    milestones: false,
    fullDescription: 'Looking for a talented UI/UX designer to create modern, clean mobile app screens for our fintech application. Must have experience with financial app design.',
    responsibilities: 'User research, wireframes, hi-fi mockups, prototype',
    deliverables: 'Figma file, design system, prototype',
    referenceLinks: [],
    faqs: [],
    attachments: { images: [], documents: [], links: [] },
    status: 'in-progress',
    createdAt: '2026-01-20',
  },
];

const initialSaved = [
  {
    id: 1,
    name: 'Alex Rivera',
    title: 'Senior Full Stack Developer',
    rating: 4.9,
    reviews: 124,
    hourlyRate: 45,
    skills: ['React', 'Node.js', 'AWS'],
    avatar: null,
    location: 'Ukraine'
  },
  {
    id: 2,
    name: 'Sophia Chen',
    title: 'UI/UX Product Designer',
    rating: 5.0,
    reviews: 89,
    hourlyRate: 55,
    skills: ['Figma', 'Prototyping', 'Product Design'],
    avatar: null,
    location: 'Singapore'
  }
];

export const ClientProvider = ({ children }) => {
  const [profile, setProfile] = useState(initialProfile);
  const [projects, setProjects] = useState(initialProjects);
  const [savedFreelancers, setSavedFreelancers] = useState(initialSaved);
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  const updateProfile = (section, data) => {
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
  };

  const addProject = (project) => {
    const newProject = {
      ...project,
      id: `proj-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setProjects((prev) => [...prev, newProject]);
    setProfile((prev) => ({
      ...prev,
      stats: { ...prev.stats, totalProjects: prev.stats.totalProjects + 1 },
    }));
    showToast('Project posted successfully! 🎉');
    return newProject;
  };

  const updateProject = (id, data) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
    showToast('Project updated successfully!');
  };

  const deleteProject = (id) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setProfile((prev) => ({
      ...prev,
      stats: { ...prev.stats, totalProjects: Math.max(0, prev.stats.totalProjects - 1) },
    }));
    showToast('Project deleted.', 'info');
  };

  const toggleSavedFreelancer = (freelancer) => {
    setSavedFreelancers(prev => {
      const exists = prev.find(f => f.id === freelancer.id);
      if (exists) {
        showToast('Freelancer removed from saved.', 'info');
        return prev.filter(f => f.id !== freelancer.id);
      } else {
        showToast('Freelancer saved successfully! 🔖');
        return [...prev, freelancer];
      }
    });
  };

  return (
    <ClientContext.Provider
      value={{
        profile, setProfile, updateProfile,
        projects, addProject, updateProject, deleteProject,
        savedFreelancers, toggleSavedFreelancer,
        toasts, showToast,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
};

