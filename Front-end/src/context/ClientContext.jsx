import { createContext, useContext, useState, useEffect } from 'react';
import { clientsAPI } from '../api/clients';
import { authAPI } from '../api/auth';
import { useAuth } from '../hooks/useAuth';

const ClientContext = createContext(null);

export const useClient = () => {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error('useClient must be used inside ClientProvider');
  return ctx;
};

const emptyProfile = {
  personalInfo: {
    fullName: '',
    username: '',
    email: '',
    phone: '',
    companyName: '',
    industry: '',
    website: '',
    location: '',
    bio: '',
    avatar: null,
    companyLogo: null,
    memberSince: '',
  },
  preferences: {
    preferredSkills: [],
    budgetRange: { min: 0, max: 0 },
    projectTypes: [],
    remoteOnly: true,
  },
  stats: {
    totalProjects: 0,
    activeProjects: 0,
    freelancersHired: 0,
    totalSpent: 0,
  },
  verificationStatus: 'unverified'
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
  const [profile, setProfile] = useState(emptyProfile);
  const [projects, setProjects] = useState([]);
  const [savedFreelancers, setSavedFreelancers] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user, isAuthenticated } = useAuth();

  // Fetch real profile on load or when auth changes
  useEffect(() => {
    if (isAuthenticated && user?.role === 'client') {
      fetchProfile();
    } else if (!isAuthenticated) {
      setProfile(emptyProfile);
      setProjects([]);
    }
  }, [isAuthenticated, user?.role]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      // 1. Get Profile
      const profileRes = await clientsAPI.getProfile();
      const dbProfile = profileRes.data.data.profile;

      // 2. Get User Info
      const userRes = await authAPI.getCurrentUser();
      const user = userRes.data.data.user;

      // 3. Transform to UI format
      const transformedProfile = {
        personalInfo: {
          fullName: `${user.firstName} ${user.lastName}`,
          username: user.email.split('@')[0],
          email: user.email,
          phone: dbProfile.phone || '',
          companyName: dbProfile.companyName || 'Not Set',
          industry: dbProfile.industryType || 'Not Set',
          website: dbProfile.website || '',
          location: dbProfile.location?.country || dbProfile.timezone || 'Global',
          bio: dbProfile.description || '',
          avatar: user.profilePicture || null,
          companyLogo: null, // Placeholder
          memberSince: new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        },
        preferences: {
          preferredSkills: dbProfile.techStack || [],
          budgetRange: { min: 0, max: 0 }, // Placeholder
          projectTypes: dbProfile.services || [],
          remoteOnly: true,
        },
        stats: {
          totalProjects: dbProfile.totalProjectsPosted || 0,
          activeProjects: 0, // Placeholder
          freelancersHired: 0, // Placeholder
          totalSpent: dbProfile.totalSpent || 0,
        },
        verificationStatus: dbProfile.verificationStatus || 'unverified'
      };

      setProfile(transformedProfile);

      // 4. Fetch Projects (TODO: implement when backend project route exists)
      // setProjects([]);

    } catch (error) {
      console.error("Failed to fetch client profile:", error);
    } finally {
      setLoading(false);
    }
  };

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
        loading, fetchProfile
      }}
    >
      {children}
    </ClientContext.Provider>
  );
};

