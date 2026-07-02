import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { freelancersAPI } from '../api/freelancers';
import { authAPI } from '../api/auth';
import { gigsAPI } from '../api/gigs';
import { proposalsAPI } from '../api/proposals';
import { useAuth } from '../hooks/useAuth';
import { getUserId } from '../utils/user';
import { tokenManager } from '../utils/tokenManager';

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
  walletBalance: 0,
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
  const { user, isAuthenticated, refreshUser, loading: authLoading } = useAuth();
  const fetchGenerationRef = useRef(0);

  const fetchFreelancerData = useCallback(async (refreshUserFirst = false, attempt = 0) => {
    const generation = ++fetchGenerationRef.current;
    setLoading(true);

    try {
      if (!tokenManager.getAccessToken() && attempt < 4) {
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        if (generation !== fetchGenerationRef.current) return;
        return fetchFreelancerData(refreshUserFirst, attempt + 1);
      }

      let activeUser = user;
      if (refreshUserFirst) {
        activeUser = await refreshUser();
      }

      const userId = getUserId(activeUser || user);
      if (!userId) {
        if (attempt < 4) {
          await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
          if (generation !== fetchGenerationRef.current) return;
          return fetchFreelancerData(refreshUserFirst, attempt + 1);
        }
        return;
      }

      const [profileRes, gigsRes, savedRes, propRes] = await Promise.all([
        freelancersAPI.getProfile(),
        gigsAPI.listMyGigs(),
        freelancersAPI.getSavedJobs(),
        proposalsAPI.listProposals({ freelancerId: userId })
      ]);
      if (generation !== fetchGenerationRef.current) return;

      const dbProfile = profileRes.data.data.profile;
      
      const transformedProfile = {
        personalInfo: {
          fullName: `${activeUser.firstName} ${activeUser.lastName}`,
          username: activeUser.username || activeUser.email?.split('@')[0] || '',
          email: activeUser.email,
          phone: dbProfile.phone || '',
          bio: dbProfile.bio || '',
          title: dbProfile.title || '',
          coverPhoto: dbProfile.coverPhoto || null,
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
        // Must be mapped here — saveProfile() reads & re-sends notificationSettings,
        // so omitting it would overwrite the DB with `undefined` on every save.
        notificationSettings: dbProfile.notificationSettings || emptyProfile.notificationSettings,
        stats: {
          totalGigs: gigsRes.data.meta?.pagination?.total || (gigsRes.data.data?.length || 0),
          activeOrders: 0,
          completedOrders: dbProfile.completedProjects || 0,
          profileViews: 0,
          rating: dbProfile.rating || activeUser?.rating || 0,
        },
        walletBalance: dbProfile.walletBalance || 0,
        totalEarnings: dbProfile.totalEarnings || 0,
        verificationStatus: dbProfile.verificationStatus || 'unverified',
        verificationDetails: dbProfile.verificationDetails || emptyProfile.verificationDetails,
        stripeOnboardingComplete: dbProfile.stripeOnboardingComplete || false,
        stripeAccountId: dbProfile.stripeAccountId || ''
      };

      console.log("[FreelancerContext] Gigs Response:", gigsRes.data);
      console.log("[FreelancerContext] Proposals Response:", propRes.data);

      setProfile(transformedProfile);
      setGigs(gigsRes.data.data || []);
      setSavedProjects(savedRes.data.data.savedJobs || []);
      setProposals(propRes.data.data || []);
    } catch (error) {
      console.error('Freelancer data fetch failed:', error);
      if (attempt < 2 && generation === fetchGenerationRef.current) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
        if (generation === fetchGenerationRef.current) {
          return fetchFreelancerData(refreshUserFirst, attempt + 1);
        }
      }
    } finally {
      if (generation === fetchGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [user, refreshUser]);

  // Fetch when auth is ready and user id is available
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setProfile(emptyProfile);
      setGigs([]);
      setProposals([]);
      setLoading(false);
      return;
    }

    if (user?.role === 'freelancer' && getUserId(user)) {
      fetchFreelancerData();
    } else if (user?.role === 'freelancer') {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user?.role, user?.id, user?._id, authLoading, fetchFreelancerData]);

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
        coverPhoto: personalInfo.coverPhoto,
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

  // All gig mutators return a consistent { success, error?, gig? } contract so
  // callers can branch reliably instead of guessing the return shape.
  const addGig = async (gig) => {
    setLoading(true);
    try {
      const res = await gigsAPI.createGig(gig);
      await fetchFreelancerData();
      showToast('Gig published successfully! 🎉');
      return { success: true, gig: res.data.data.gig };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to publish gig';
      // Skill-gating block (403): surface the flag so the caller can route the
      // freelancer to the skill test instead of just showing an error toast.
      const gate = error.response?.data?.errors;
      if (error.response?.status === 403 && gate?.skillTestRequired) {
        showToast(message, 'error');
        return { success: false, error: message, skillTestRequired: true, requiredSkills: gate.requiredSkills || [], category: gate.category || '' };
      }
      showToast(message, 'error');
      return { success: false, error: message };
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
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update gig';
      showToast(message, 'error');
      return { success: false, error: message };
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
      return { success: true };
    } catch (error) {
      showToast('Failed to delete gig', 'error');
      return { success: false, error: error.response?.data?.message };
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
      return { success: true };
    } catch (error) {
      showToast('Failed to update gig status', 'error');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const toggleSavedProject = async (project) => {
    try {
      const res = await freelancersAPI.toggleSavedJob(project._id || project.id);
      await fetchFreelancerData();
      showToast(res.data?.message || 'Saved jobs updated!', 'success');
      return true;
    } catch (error) {
      showToast('Failed to save project', 'error');
      return false;
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

  // Memoized so consumers don't re-render on every provider render (keyed on
  // the state slices; handler identities are intentionally excluded).
  const value = useMemo(() => ({
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [profile, gigs, proposals, savedProjects, loading, toasts, fetchFreelancerData]);

  return (
    <FreelancerContext.Provider value={value}>
      {children}
    </FreelancerContext.Provider>
  );
};
