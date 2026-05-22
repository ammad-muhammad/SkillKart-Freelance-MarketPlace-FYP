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
    companyType: '',
    industry: '',
    customIndustry: '',
    role: '',
    isNewToHiring: '',
    website: '',
    location: '',
    timezone: '',
    linkedin: '',
    bio: '',
    avatar: null,
    companyLogo: null,
    memberSince: '',
    languages: [],
  },
  preferences: {
    preferredSkills: [],
    budgetRange: { min: 0, max: 0 },
    projectTypes: [],
    hiringFrequency: '',
    technicalUnderstanding: 5,
    urgency: '',
    remoteOnly: true,
  },
  securitySettings: {
    recoveryEmail: '',
    recoveryPhone: '',
    twoFactorEnabled: true,
    loginAlerts: true,
    passwordChangeAlerts: true,
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
  const { user, isAuthenticated, refreshUser } = useAuth();

  // Fetch real profile on load or when auth changes
  useEffect(() => {
    if (isAuthenticated && user?.role === 'client') {
      fetchProfile();
    } else if (!isAuthenticated) {
      setProfile(emptyProfile);
      setProjects([]);
    }
  }, [isAuthenticated, user?.role]);

  const fetchProfile = async (refreshUserFirst = false) => {
    if (!user?._id && !refreshUserFirst) return;

    setLoading(true);
    try {
      let activeUser = user;
      if (refreshUserFirst) {
        activeUser = await refreshUser();
      }

      // 1. Get Profile
      const profileRes = await clientsAPI.getProfile();
      const dbProfile = profileRes.data.data.profile;

      // 2. Transform to UI format with safety checks (username lives on User, not ClientProfile)
      const transformedProfile = {
        personalInfo: {
          fullName: activeUser ? `${activeUser.firstName || ''} ${activeUser.lastName || ''}`.trim() : '',
          username: activeUser?.username || activeUser?.email?.split('@')[0] || 'user',
          email: activeUser?.email || '',
          phone: dbProfile?.phone || '',
          companyName: dbProfile?.companyName || '',
          companyType: dbProfile?.companyType || '',
          industry: dbProfile?.industryType || dbProfile?.industry || '',
          customIndustry: dbProfile?.customIndustry || '',
          role: dbProfile?.role || '',
          isNewToHiring: dbProfile?.isNewToHiring || '',
          website: dbProfile?.website || '',
          location: dbProfile?.location?.country || '',
          timezone: dbProfile?.timezone || '',
          linkedin: dbProfile?.socialLinks?.linkedin || '',
          bio: dbProfile?.description || '',
          avatar: activeUser?.profilePicture || null,
          companyLogo: dbProfile?.companyLogo || null,
          memberSince: activeUser?.createdAt ? new Date(activeUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '',
          languages: dbProfile?.languages || [],
        },
        preferences: {
          preferredSkills: dbProfile?.techStack || [],
          budgetRange: dbProfile?.budgetRange || { min: 0, max: 0 }, 
          projectTypes: dbProfile?.services || [],
          hiringFrequency: dbProfile?.hiringFrequency || '',
          technicalUnderstanding: dbProfile?.technicalUnderstanding || 5,
          urgency: dbProfile?.urgency || '',
          remoteOnly: true,
        },
        securitySettings: {
          recoveryEmail: dbProfile?.securitySettings?.recoveryEmail || '',
          recoveryPhone: dbProfile?.securitySettings?.recoveryPhone || '',
          twoFactorEnabled: dbProfile?.securitySettings?.twoFactorEnabled !== false,
          loginAlerts: dbProfile?.securitySettings?.loginAlerts !== false,
          passwordChangeAlerts: dbProfile?.securitySettings?.passwordChangeAlerts !== false,
          emailVerified: activeUser?.isEmailVerified || false,
        },
        notificationSettings: dbProfile?.notificationSettings || {
          emailNotifications: true,
          proposalAlerts: true,
          messageAlerts: true,
        },
        stats: {
          totalProjects: dbProfile?.totalProjectsPosted || 0,
          activeProjects: 0, 
          freelancersHired: 0, 
          totalSpent: dbProfile?.totalSpent || 0,
        },
        verificationStatus: dbProfile?.verificationStatus || 'unverified'
      };

      console.log("Fetched client profile:", transformedProfile);
      setProfile(transformedProfile);

      // 3. Fetch Client's Projects using ownership-restricted API
      const jobsRes = await jobsAPI.getMyProjects();
      const dbJobs = Array.isArray(jobsRes.data.data) ? jobsRes.data.data : [];
      
      const transformedJobs = dbJobs.map(j => ({
        id: j._id,
        title: j.title,
        category: j.category,
        skills: j.skills || [],
        experienceLevel: j.experienceLevel,
        budget: j.budget,
        summary: j.description ? (j.description.slice(0, 150) + (j.description.length > 150 ? '...' : '')) : '',
        status: j.status,
        createdAt: new Date(j.createdAt).toLocaleDateString(),
        deadline: j.deadline ? new Date(j.deadline).toLocaleDateString() : 'N/A',
        duration: j.duration,
        proposals: j.proposals || []
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

  const saveProfile = async (updatedData = null, options = { skipFetch: false }) => {
    setLoading(true);
    try {
      const currentProfile = updatedData || profile;
      const { personalInfo, preferences, notificationSettings, securitySettings } = currentProfile;

      const nameParts = (personalInfo.fullName || '').trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Only update user basic info if it actually changed
      const hasUserChanges = 
        firstName !== user?.firstName || 
        lastName !== user?.lastName || 
        personalInfo.phone !== user?.phone;

      if (hasUserChanges) {
        await authAPI.updateMe({
          firstName,
          lastName,
          phone: personalInfo.phone
        });
      }

      const isIndiv = personalInfo.companyType === 'Individual';
      const profilePayload = {
        companyName: isIndiv ? '' : personalInfo.companyName,
        companyType: personalInfo.companyType,
        industryType: isIndiv ? '' : personalInfo.industry,
        industry: isIndiv ? '' : personalInfo.industry,
        customIndustry: '',
        role: isIndiv ? '' : personalInfo.role,
        isNewToHiring: personalInfo.isNewToHiring,
        companyLogo: isIndiv ? '' : personalInfo.companyLogo,
        website: isIndiv ? '' : personalInfo.website,
        description: personalInfo.bio,
        phone: personalInfo.phone,
        location: { country: personalInfo.location },
        timezone: personalInfo.timezone,
        socialLinks: { linkedin: personalInfo.linkedin },
        techStack: preferences.preferredSkills,
        services: [],
        budgetRange: preferences.budgetRange,
        hiringFrequency: preferences.hiringFrequency,
        technicalUnderstanding: preferences.technicalUnderstanding,
        urgency: preferences.urgency,
        notificationSettings,
        securitySettings: {
          ...securitySettings,
          recoveryEmail: securitySettings.recoveryEmail,
          recoveryPhone: securitySettings.recoveryPhone
        },
        username: personalInfo.username,
        email: personalInfo.email,
        languages: (personalInfo.languages || []).map(l => ({
          language: typeof l.language === 'object' ? (l.language.name || l.language.language || "") : l.language,
          proficiency: l.proficiency
        }))
      };

      await clientsAPI.updateProfile(profilePayload);

      const usernameChanged =
        personalInfo.username &&
        personalInfo.username !== user?.username;

      if (!options.skipFetch) {
        await fetchProfile(usernameChanged);
      } else if (usernameChanged) {
        await refreshUser();
        setProfile((prev) => ({
          ...prev,
          personalInfo: { ...prev.personalInfo, username: personalInfo.username }
        }));
      }
      
      showToast('All changes saved to database!');
      return { success: true };
    } catch (error) {
      console.error("Save client profile failed:", error);
      const message = error.response?.data?.message || 'Failed to save changes';
      const errors = error.response?.data?.errors || null;
      
      showToast(message, 'error');
      return { success: false, message, errors };
    } finally {
      setLoading(false);
    }
  };

  const updateMultipleSections = async (updates, silent = false, persist = false, options = {}) => {
    // 1. Update React state asynchronously
    setProfile(prev => {
      const next = { ...prev };
      Object.keys(updates).forEach(section => {
        next[section] = {
          ...next[section],
          ...updates[section]
        };
      });
      return next;
    });

    // 2. Synchronously compute updated profile to prevent async state race conditions during API save
    if (persist) {
      const finalProfile = { ...profile };
      Object.keys(updates).forEach(section => {
        finalProfile[section] = {
          ...finalProfile[section],
          ...updates[section]
        };
      });
      return await saveProfile(finalProfile, options);
    } else if (!silent) {
      showToast('Profile updated locally');
    }
    return { success: true };
  };

  const updateProfile = async (section, data, silent = false, persist = false, options = {}) => {
    return await updateMultipleSections({ [section]: data }, silent, persist, options);
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
    <ClientContext.Provider value={{
      profile,
      setProfile,
      updateProfile,
      updateMultipleSections,
      projects,
      setProjects,
      addProject,
      updateProject,
      deleteProject,
      savedFreelancers,
      setSavedFreelancers,
      toggleSavedFreelancer,
      toasts,
      setToasts,
      showToast,
      loading,
      setLoading,
      fetchProfile,
      saveProfile
    }}>
      {children}
    </ClientContext.Provider>
  );
};
