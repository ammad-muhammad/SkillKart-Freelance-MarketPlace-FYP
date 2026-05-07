import { createContext, useContext, useState, useEffect } from 'react';
import { freelancersAPI } from '../api/freelancers';
import { authAPI } from '../api/auth';
import { useAuth } from '../hooks/useAuth';

const FreelancerContext = createContext(null);

export const useFreelancer = () => {
  const ctx = useContext(FreelancerContext);
  if (!ctx) throw new Error('useFreelancer must be used inside FreelancerProvider');
  return ctx;
};

const emptyProfile = {
  personalInfo: {
    fullName: '',
    username: '',
    email: '',
    phone: '',
    bio: '',
    title: '',
    location: '',
    memberSince: '',
    avatar: null,
    experienceLevel: 'Entry',
    education: '',
    certifications: '',
  },
  skills: [],
  languages: [],
  portfolio: [],
  socialLinks: {
    github: '',
    linkedin: '',
    website: '',
  },
  stats: {
    totalGigs: 0,
    activeOrders: 0,
    completedOrders: 0,
    profileViews: 0,
  },
  verificationStatus: 'unverified'
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
  const [profile, setProfile] = useState(emptyProfile);
  const [gigs, setGigs] = useState([]);
  const [savedProjects, setSavedProjects] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(false); // Default to false, fetch will set true if needed
  const { user, isAuthenticated } = useAuth();

  // Fetch real profile on load or when auth changes
  useEffect(() => {
    if (isAuthenticated && user?.role === 'freelancer') {
      fetchProfile();
    } else if (!isAuthenticated) {
      setProfile(emptyProfile);
      setGigs([]);
    }
  }, [isAuthenticated, user?.role]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      // 1. Get Profile
      const profileRes = await freelancersAPI.getProfile();
      const dbProfile = profileRes.data.data.profile;

      // 2. Get User Info (for name, email, avatar)
      const userRes = await authAPI.getCurrentUser();
      const user = userRes.data.data.user;

      // 3. Transform to UI format
      const transformedProfile = {
        personalInfo: {
          fullName: `${user.firstName} ${user.lastName}`,
          username: user.email.split('@')[0],
          email: user.email,
          phone: dbProfile.phone || '',
          bio: dbProfile.bio || '',
          title: dbProfile.title || '',
          location: dbProfile.timezone || 'Global',
          memberSince: new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          avatar: user.profilePicture || null,
          experienceLevel: dbProfile.experienceLevel || 'Entry',
          education: dbProfile.education?.[0]?.institution || '',
          certifications: dbProfile.certifications?.[0]?.name || '',
        },
        skills: dbProfile.skills || [],
        languages: dbProfile.languages?.map(l => l.language) || [],
        portfolio: dbProfile.portfolio || [],
        socialLinks: dbProfile.socialLinks || { github: '', linkedin: '', website: '' },
        stats: {
          totalGigs: 0, // Will be updated by gigs fetch
          activeOrders: 0, // Placeholder
          completedOrders: dbProfile.completedProjects || 0,
          profileViews: 0, // Placeholder
        },
        verificationStatus: dbProfile.verificationStatus || 'unverified'
      };

      setProfile(transformedProfile);
      
      // 4. Fetch Gigs (TODO: implement when backend gig route exists)
      // For now keep empty or mock if needed, but the requirement says keep demo if DB not exists
      // setGigs([]); 

    } catch (error) {
      console.error("Failed to fetch freelancer profile:", error);
    } finally {
      setLoading(false);
    }
  };

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
        toasts, showToast,
        loading, fetchProfile
      }}
    >
      {children}
    </FreelancerContext.Provider>
  );
};

