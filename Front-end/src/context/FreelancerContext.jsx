import { createContext, useContext, useState, useEffect } from 'react';
import { freelancersAPI } from '../api/freelancers';
import { authAPI } from '../api/auth';
import { gigsAPI } from '../api/gigs';
import { proposalsAPI } from '../api/proposals';
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
  verifiedSkills: [],
  languages: [],
  portfolioLinks: [],
  socialLinks: {
    github: '',
    linkedin: '',
    website: '',
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
    totalGigs: 0,
    activeOrders: 0,
    completedOrders: 0,
    profileViews: 0,
  },
  verificationStatus: 'unverified',
  verificationDetails: {
    emailVerified: false,
    onboardingCompleted: false,
    profileCompleted: false,
    allSkillTestsPassed: false,
    identityVerified: false,
    paymentMethodAdded: false,
    portfolioReviewed: false,
    phoneVerified: false
  }
};

export const FreelancerProvider = ({ children }) => {
  const [profile, setProfile] = useState(emptyProfile);
  const [gigs, setGigs] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [savedProjects, setSavedProjects] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated, refreshUser } = useAuth();

  const fetchFreelancerData = async (refreshUserFirst = false) => {
    try {
      setLoading(true);

      let activeUser = user;
      if (refreshUserFirst) {
        activeUser = await refreshUser();
      }

      const [profileRes, gigsRes, savedRes, propRes] = await Promise.all([
        freelancersAPI.getProfile(),
        gigsAPI.listMyGigs(),
        freelancersAPI.getSavedJobs(),
        proposalsAPI.listProposals({ freelancerId: activeUser._id })
      ]);

      const dbProfile = profileRes.data.data.profile;
      
      const transformedProfile = {
        personalInfo: {
          fullName: `${activeUser.firstName} ${activeUser.lastName}`,
          username: activeUser.username || activeUser.email?.split('@')[0] || '',
          email: activeUser.email,
          phone: dbProfile.phone || '',
          bio: dbProfile.bio || '',
          title: dbProfile.title || '',
          location: dbProfile.timezone || 'Global',
          memberSince: new Date(activeUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          avatar: activeUser.profilePicture || null,
          experienceLevel: dbProfile.experienceLevel || 'Entry',
          hourlyRate: dbProfile.hourlyRate || 0,
          availability: dbProfile.availability || 'full-time',
          education: dbProfile.education || [],
          certifications: dbProfile.certifications || [],
        },
        skills: (dbProfile.skills || []).map(s => s.name),
        verifiedSkills: dbProfile.skills || [],
        languages: dbProfile.languages || [],
        portfolio: dbProfile.portfolio || [],
        portfolioLinks: dbProfile.portfolioLinks || [],
        socialLinks: dbProfile.socialLinks || { github: '', linkedin: '', website: '' },
        securitySettings: {
          recoveryEmail: dbProfile.securitySettings?.recoveryEmail || '',
          recoveryPhone: dbProfile.securitySettings?.recoveryPhone || '',
          twoFactorEnabled: dbProfile.securitySettings?.twoFactorEnabled !== false,
          loginAlerts: dbProfile.securitySettings?.loginAlerts !== false,
          passwordChangeAlerts: dbProfile.securitySettings?.passwordChangeAlerts !== false,
          emailVerified: activeUser?.isEmailVerified || false,
        },
        stats: {
          totalGigs: gigsRes.data.meta?.pagination?.total || (gigsRes.data.data?.length || 0),
          activeOrders: 0,
          completedOrders: dbProfile.completedProjects || 0,
          profileViews: 0,
        },
        verificationStatus: dbProfile.verificationStatus || 'unverified',
        verificationDetails: dbProfile.verificationDetails || emptyProfile.verificationDetails
      };

      console.log("[FreelancerContext] Gigs Response:", gigsRes.data);
      console.log("[FreelancerContext] Proposals Response:", propRes.data);

      setProfile(transformedProfile);
      setGigs(gigsRes.data.data || []);
      setSavedProjects(savedRes.data.data.savedJobs || []);
      setProposals(propRes.data.data || []);
    } catch (error) {
      console.error('Freelancer data fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch real profile on load or when auth changes
  useEffect(() => {
    if (isAuthenticated && user?.role === 'freelancer') {
      fetchFreelancerData();
    } else if (!isAuthenticated) {
      setProfile(emptyProfile);
      setGigs([]);
      setProposals([]);
    }
  }, [isAuthenticated, user?.role]);

  const fetchProfile = async () => {
    await fetchFreelancerData();
  };

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  const saveProfile = async (updatedData = null, options = {}) => {
    setLoading(true);
    try {
      const currentProfile = updatedData || profile;
      const { personalInfo, skills, languages, socialLinks, notificationSettings } = currentProfile;

      const nameParts = (personalInfo.fullName || '').trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      await authAPI.updateMe({
        firstName,
        lastName,
        phone: personalInfo.phone
      });

      const profilePayload = {
        username: personalInfo.username,
        bio: personalInfo.bio,
        title: personalInfo.title,
        phone: personalInfo.phone,
        hourlyRate: personalInfo.hourlyRate,
        availability: personalInfo.availability,
        skills,
        languages: (languages || []).map(l => ({
          language: typeof l === 'object' ? (l.language || l.name || "") : l,
          proficiency: typeof l === 'object' ? (l.proficiency || 'fluent') : 'fluent'
        })),
        socialLinks,
        notificationSettings,
        securitySettings: currentProfile.securitySettings || {},
        experienceLevel: personalInfo.experienceLevel,
        timezone: personalInfo.location,
        education: personalInfo.education || [],
        certifications: personalInfo.certifications || [],
        portfolio: currentProfile.portfolio || [],
        portfolioLinks: currentProfile.portfolioLinks || []
      };

      await freelancersAPI.updateProfile(profilePayload);

      const usernameChanged =
        personalInfo.username &&
        personalInfo.username !== user?.username;

      if (!options.skipFetch) {
        await fetchFreelancerData(usernameChanged);
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
      console.error("Save profile failed:", error);
      const message = error.response?.data?.message || 'Failed to save changes';
      const errors = error.response?.data?.errors || null;
      showToast(message, 'error');
      return { success: false, message, errors };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (section, data, silent = false, persist = false, options = {}) => {
    // 1. Update React state asynchronously
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

    // 2. Synchronously compute updated profile to prevent async state race conditions during API save
    if (persist) {
      let next;
      if (typeof data === 'function') {
        next = data(profile[section]);
      } else if (Array.isArray(data) || typeof data !== 'object' || data === null) {
        next = data;
      } else {
        next = { ...profile[section], ...data };
      }
      const updatedProfile = { ...profile, [section]: next };
      return await saveProfile(updatedProfile, options);
    } else if (!silent) {
      showToast('Profile updated (not yet saved to DB)');
    }
    return { success: true };
  };

  const addGig = async (gig) => {
    setLoading(true);
    try {
      const res = await gigsAPI.createGig(gig);
      await fetchFreelancerData();
      showToast('Gig published successfully! 🎉');
      return res.data.data.gig;
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to publish gig', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateGig = async (id, data) => {
    setLoading(true);
    try {
      await gigsAPI.updateGig(id, data);
      await fetchFreelancerData();
      showToast('Gig updated successfully!');
    } catch (error) {
      showToast('Failed to update gig', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteGig = async (id) => {
    setLoading(true);
    try {
      await gigsAPI.deleteGig(id);
      await fetchFreelancerData();
      showToast('Gig deleted.', 'info');
    } catch (error) {
      showToast('Failed to delete gig', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleGigStatus = async (id) => {
    setLoading(true);
    try {
      await gigsAPI.toggleStatus(id);
      await fetchFreelancerData();
      showToast('Gig status updated!');
    } catch (error) {
      showToast('Failed to update gig status', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleSavedProject = async (project) => {
    try {
      await freelancersAPI.toggleSavedJob(project._id || project.id);
      await fetchFreelancerData();
    } catch (error) {
      showToast('Failed to save project', 'error');
    }
  };

  const addPortfolioItem = async (item) => {
    setLoading(true);
    try {
      await freelancersAPI.addPortfolio(item);
      await fetchFreelancerData();
      showToast('Portfolio item added! 🚀');
      return true;
    } catch (error) {
      showToast('Failed to add portfolio item', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updatePortfolioItem = async (id, item) => {
    setLoading(true);
    try {
      await freelancersAPI.updatePortfolio(id, item);
      await fetchFreelancerData();
      showToast('Portfolio item updated!');
      return true;
    } catch (error) {
      showToast('Failed to update portfolio item', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deletePortfolioItem = async (id) => {
    setLoading(true);
    try {
      await freelancersAPI.deletePortfolio(id);
      await fetchFreelancerData();
      showToast('Portfolio item removed.', 'info');
      return true;
    } catch (error) {
      showToast('Failed to delete portfolio item', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <FreelancerContext.Provider
      value={{ 
        profile,
        gigs,
        proposals,
        savedProjects,
        loading,
        updateProfile,
        toggleSavedProject,
        refreshProfile: fetchFreelancerData,
        addGig,
        updateGig,
        deleteGig,
        toggleGigStatus,
        addPortfolioItem,
        updatePortfolioItem,
        deletePortfolioItem,
        toasts,
        showToast,
        saveProfile
      }}
    >
      {children}
    </FreelancerContext.Provider>
  );
};
