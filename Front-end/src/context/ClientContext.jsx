import { createContext, useContext, useState, useEffect } from 'react';
import { clientsAPI } from '../api/clients';
import { authAPI } from '../api/auth';
import { jobsAPI } from '../api/jobs';
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
  securitySettings: {
    recoveryEmail: '',
    recoveryPhone: '',
    twoFactorEnabled: false,
    emailVerified: false,
  },
  notificationSettings: {
    emailNotifications: true,
    proposalAlerts: true,
    messageAlerts: true,
  },
  stats: {
    totalProjects: 0,
    activeProjects: 0,
    freelancersHired: 0,
    totalSpent: 0,
  },
  verificationStatus: 'unverified'
};

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
  const [savedFreelancers, setSavedFreelancers] = useState(initialSaved);
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
      const dbUser = userRes.data.data.user;

      // 3. Transform to UI format
      const transformedProfile = {
        personalInfo: {
          fullName: `${dbUser.firstName} ${dbUser.lastName}`,
          username: dbUser.email.split('@')[0],
          email: dbUser.email,
          phone: dbProfile.phone || '',
          companyName: dbProfile.companyName || 'Not Set',
          industry: dbProfile.industryType || 'Not Set',
          website: dbProfile.website || '',
          location: dbProfile.location?.country || dbProfile.timezone || 'Global',
          bio: dbProfile.description || '',
          avatar: dbUser.profilePicture || null,
          companyLogo: null, 
          memberSince: new Date(dbUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        },
        preferences: {
          preferredSkills: dbProfile.techStack || [],
          budgetRange: { min: 0, max: 0 }, 
          projectTypes: dbProfile.services || [],
          remoteOnly: true,
        },
        stats: {
          totalProjects: dbProfile.totalProjectsPosted || 0,
          activeProjects: 0, 
          freelancersHired: 0, 
          totalSpent: dbProfile.totalSpent || 0,
        },
        verificationStatus: dbProfile.verificationStatus || 'unverified'
      };

      setProfile(transformedProfile);

      // 4. Fetch Client's Projects
      const jobsRes = await jobsAPI.listJobs({ clientId: dbUser._id });
      const dbJobs = jobsRes.data.data.items || [];
      
      const transformedJobs = dbJobs.map(j => ({
        id: j._id,
        title: j.title,
        category: j.category,
        skills: j.skills,
        experienceLevel: j.experienceLevel,
        budget: j.budget,
        summary: j.description.slice(0, 150) + (j.description.length > 150 ? '...' : ''),
        status: j.status,
        createdAt: new Date(j.createdAt).toLocaleDateString(),
        deadline: j.deadline ? new Date(j.deadline).toLocaleDateString() : 'N/A',
        duration: j.duration
      }));

      setProjects(transformedJobs);

    } catch (error) {
      console.error("Failed to fetch client profile/jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  const saveProfile = async (updatedData = null) => {
    setLoading(true);
    try {
      const currentProfile = updatedData || profile;
      const { personalInfo, preferences, notificationSettings } = currentProfile;

      const nameParts = (personalInfo.fullName || '').trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      await authAPI.updateMe({
        firstName,
        lastName,
        phone: personalInfo.phone
      });

      const profilePayload = {
        companyName: personalInfo.companyName,
        industryType: personalInfo.industry,
        website: personalInfo.website,
        description: personalInfo.bio,
        phone: personalInfo.phone,
        location: { country: personalInfo.location },
        techStack: preferences.preferredSkills,
        services: preferences.projectTypes,
        notificationSettings
      };

      await clientsAPI.updateProfile(profilePayload);
      await fetchProfile();
      showToast('All changes saved to database!');
      return true;
    } catch (error) {
      console.error("Save client profile failed:", error);
      showToast(error.response?.data?.message || 'Failed to save changes', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (section, data, silent = false, persist = false) => {
    let newProfile;
    setProfile((prev) => {
      let next;
      if (typeof data === 'function') {
        next = data(prev[section]);
      } else if (Array.isArray(data) || typeof data !== 'object' || data === null) {
        next = data;
      } else {
        next = { ...prev[section], ...data };
      }
      newProfile = { ...prev, [section]: next };
      return newProfile;
    });

    if (persist) {
      await saveProfile(newProfile);
    } else if (!silent) {
      showToast('Profile updated locally');
    }
  };

  const addProject = async (project) => {
    setLoading(true);
    try {
      const res = await jobsAPI.createJob(project);
      await fetchProfile(); // Refresh list and stats
      showToast('Project posted successfully! 🎉');
      return res.data.data.job;
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to post project', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateProject = async (id, data) => {
    setLoading(true);
    try {
      await jobsAPI.updateJob(id, data);
      await fetchProfile();
      showToast('Project updated successfully!');
    } catch (error) {
      showToast('Failed to update project', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (id) => {
    setLoading(true);
    try {
      await jobsAPI.deleteJob(id);
      await fetchProfile();
      showToast('Project deleted.', 'info');
    } catch (error) {
      showToast('Failed to delete project', 'error');
    } finally {
      setLoading(false);
    }
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
        loading, fetchProfile, saveProfile
      }}
    >
      {children}
    </ClientContext.Provider>
  );
};

