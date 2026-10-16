import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { clientsAPI } from '../api/clients';
import { authAPI } from '../api/auth';
import { jobsAPI } from '../api/jobs';
import { useAuth } from '../hooks/useAuth';
import { getUserId } from '../utils/user';
import { tokenManager } from '../utils/tokenManager';
import { log } from "../utils/logger";
import { notify } from '../utils/notify';

const ClientContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
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
  walletBalance: 0,
  verificationStatus: 'unverified'
};

// Normalize a populated saved-freelancer (a User doc with optional freelancerProfile)
// from the backend into the shape the Saved Freelancers UI renders.
const normalizeSavedFreelancer = (u) => {
  if (!u || typeof u !== 'object') return null;
  const fp = u.freelancerProfile || {};
  const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim();
  return {
    id: u._id || u.id,
    name: fullName || u.email?.split('@')[0] || 'Freelancer',
    title: fp.title || '',
    rating: u.rating || fp.rating || 0,
    reviews: fp.completedProjects || 0,
    hourlyRate: fp.hourlyRate || 0,
    skills: (fp.skills || []).map(s => (typeof s === 'object' ? s.name : s)).filter(Boolean).slice(0, 4),
    avatar: u.profilePicture || null,
    location: fp.timezone || '',
    description: fp.bio || '',
  };
};

export const ClientProvider = ({ children }) => {
  const [profile, setProfile] = useState(emptyProfile);
  const [projects, setProjects] = useState([]);
  const [savedFreelancers, setSavedFreelancers] = useState([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated, refreshUser, loading: authLoading } = useAuth();
  const fetchGenerationRef = useRef(0);

  const fetchProfile = useCallback(async (refreshUserFirst = false, attempt = 0, silent = false) => {
    const generation = ++fetchGenerationRef.current;
    if (!silent) setLoading(true);

    try {
      if (!tokenManager.getAccessToken() && attempt < 4) {
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        if (generation !== fetchGenerationRef.current) return;
        return fetchProfile(refreshUserFirst, attempt + 1, silent);
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
          return fetchProfile(refreshUserFirst, attempt + 1, silent);
        }
        return;
      }

      // 1. Get Profile
      const profileRes = await clientsAPI.getProfile();
      if (generation !== fetchGenerationRef.current) return;
      const dbProfile = profileRes.data.data.profile;

      // 2. Transform to UI format with safety checks (username lives on User, not ClientProfile)
      const transformedProfile = {
        personalInfo: {
          fullName: activeUser ? `${activeUser.firstName || ''} ${activeUser.lastName || ''}`.trim() : '',
          // Don't fall back to an email-derived value here — that fake
          // "username" would get silently resubmitted as a real change on
          // every save (the backend's dot-restricted username format often
          // rejects it, since email local-parts commonly contain dots the
          // real username field disallows), even though the user never
          // touched this field. Leave it genuinely empty when unset.
          username: activeUser?.username || '',
          email: activeUser?.email || '',
          phone: dbProfile?.phone || '',
          companyName: dbProfile?.companyName || '',
          companyType: dbProfile?.companyType || '',
          // First NON-EMPTY of the two — `[]` is truthy, so a plain `||`
          // let an empty industryType hide a filled-in industry.
          industry: [dbProfile?.industryType, dbProfile?.industry]
            .find((v) => (Array.isArray(v) ? v.length > 0 : !!v)) || '',
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
          coverPhoto: dbProfile?.coverPhoto || null,
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
        walletBalance: dbProfile?.walletBalance || 0,
        verificationStatus: dbProfile?.verificationStatus || 'unverified'
      };

      log("Fetched client profile:", transformedProfile);
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
        proposals: j.proposals || [],
        source: j.source || 'project',
        gigTier: j.gigTier || null,
        customOfferId: j.customOfferId || null,
        description: j.description || '',
        requirements: j.requirements || null,
        hiredFreelancer: j.hiredFreelancer,
        payment: j.payment,
        // Only a real submission counts — older gig orders carry an empty
        // `{ links: [] }` delivery stub (see Backend Job.js).
        delivery: j.delivery?.submittedAt ? j.delivery : null,
        lastRevision: j.lastRevision || null,
        revisions: j.revisions || [],
        milestones: j.milestones || [],
        currentMilestone: j.currentMilestone || null,
        contractId: j.contractId?._id || null,
        contractStatus: j.contractId?.status || null,
        contractType: j.contractType || 'fixed',
        hourlyRate: j.hourlyRate || 0,
        weeklyLimit: j.weeklyLimit || 0,
        hourlyEscrow: j.hourlyEscrow || null,
        timerActive: j.timerActive || false,
        timerStartedAt: j.timerStartedAt || null,
        endRequest: j.endRequest || null,
        dispute: j.dispute || null,
        lastTimeLog: j.lastTimeLog || null,
        totalDuration: j.totalDuration || 0,
        hasReviewed: j.hasReviewed || false
      }));

      setProjects(transformedJobs);

      // 4. Fetch saved freelancers (best-effort; doesn't block profile load)
      try {
        const savedRes = await clientsAPI.getSavedFreelancers();
        if (generation === fetchGenerationRef.current) {
          const list = savedRes.data?.data?.savedFreelancers || [];
          setSavedFreelancers(list.map(normalizeSavedFreelancer).filter(Boolean));
        }
      } catch (savedErr) {
        console.error('Failed to fetch saved freelancers:', savedErr);
      } finally {
        if (generation === fetchGenerationRef.current) setSavedLoading(false);
      }

    } catch (error) {
      console.error("Failed to fetch client profile/jobs:", error);
      if (attempt < 2 && generation === fetchGenerationRef.current) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
        if (generation === fetchGenerationRef.current) {
          return fetchProfile(refreshUserFirst, attempt + 1, silent);
        }
      }
    } finally {
      if (generation === fetchGenerationRef.current && !silent) {
        setLoading(false);
      }
    }
  }, [user, refreshUser]);

  // Fetch when auth is ready and user id is available
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setProfile(emptyProfile);
      setProjects([]);
      setSavedFreelancers([]);
      setSavedLoading(false);
      setLoading(false);
      return;
    }

    if (user?.role === 'client' && getUserId(user)) {
      fetchProfile();
    } else if (user?.role === 'client') {
      setLoading(true);
    } else {
      setLoading(false);
    }
    // Deliberately depend on primitive user fields, not `user` itself — the
    // object reference can change without these values changing and would
    // over-fire this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.role, user?.id, user?._id, authLoading, fetchProfile]);

  const showToast = useCallback((message, type = 'success') => {
    notify(message, { type });
  }, []);

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
      const errors = error.response?.data?.errors || null;
      // "Validation failed" alone doesn't say what to fix — name the field.
      const message = (Array.isArray(errors) && errors[0]?.message)
        || error.response?.data?.message || 'Failed to save changes';

      showToast(message, 'error');
      return { success: false, message, errors };
    } finally {
      setLoading(false);
    }
  };

  const mergeSections = (base, updates) => {
    const next = { ...base };
    Object.keys(updates).forEach(section => {
      next[section] = { ...next[section], ...updates[section] };
    });
    return next;
  };

  const updateMultipleSections = async (updates, silent = false, persist = false, options = {}) => {
    // Compute the merged profile from the FRESHEST state (prev inside the
    // updater), and reuse that exact object for the API save — never re-read the
    // closure-stale `profile`, which caused rapid sequential saves to persist
    // old data.
    let merged = null;
    setProfile(prev => {
      merged = mergeSections(prev, updates);
      return merged;
    });

    if (persist) {
      return await saveProfile(merged, options);
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
      return { success: true, job: res.data.data.job };
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to post project', 'error');
      return { success: false, error: error.response?.data?.message };
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
      return true;
    } catch (error) {
      showToast(error.response?.data?.errors?.[0]?.message || error.response?.data?.message || 'Failed to update project', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Accept a freelancer's delivered work → project completed.
  const acceptDelivery = async (id) => {
    setLoading(true);
    try {
      await jobsAPI.acceptDelivery(id);
      await fetchProfile();
      showToast('Delivery accepted. Project completed! 🎉');
      return { success: true };
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to accept delivery', 'error');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // Send the project back to the freelancer for changes.
  const requestRevision = async (id, note) => {
    setLoading(true);
    try {
      await jobsAPI.requestRevision(id, note);
      await fetchProfile();
      showToast('Revision requested. The freelancer will make changes.', 'info');
      return { success: true };
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to request revision', 'error');
      return { success: false };
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
      return { success: true };
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to delete project', 'error');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const toggleSavedFreelancer = async (freelancer) => {
    const freelancerId = freelancer.id || freelancer._id;
    if (!freelancerId) return { success: false };

    const exists = savedFreelancers.some(f => f.id === freelancerId);
    const previous = savedFreelancers;

    // Optimistic update
    setSavedFreelancers(prev =>
      exists ? prev.filter(f => f.id !== freelancerId) : [...prev, normalizeSavedFreelancer(freelancer) || freelancer]
    );

    try {
      await clientsAPI.toggleSavedFreelancer(freelancerId);
      showToast(exists ? 'Freelancer removed from saved.' : 'Freelancer saved successfully! 🔖', exists ? 'info' : 'success');
      return { success: true, saved: !exists };
    } catch (error) {
      // Roll back on failure
      setSavedFreelancers(previous);
      showToast(error.response?.data?.message || 'Failed to update saved list', 'error');
      return { success: false };
    }
  };

  // Memoized so consumers don't re-render on every provider render. Keyed on the
  // state slices; the handler functions are recreated each render but are cheap
  // and stable in behaviour, so we intentionally exclude them from deps.
  const value = useMemo(() => ({
    profile,
    setProfile,
    updateProfile,
    updateMultipleSections,
    projects,
    setProjects,
    addProject,
    updateProject,
    acceptDelivery,
    requestRevision,
    deleteProject,
    savedFreelancers,
    setSavedFreelancers,
    savedLoading,
    toggleSavedFreelancer,
    toasts,
    setToasts,
    showToast,
    loading,
    setLoading,
    fetchProfile,
    saveProfile
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [profile, projects, savedFreelancers, savedLoading, toasts, loading, fetchProfile]);

  return (
    <ClientContext.Provider value={value}>
      {children}
    </ClientContext.Provider>
  );
};
