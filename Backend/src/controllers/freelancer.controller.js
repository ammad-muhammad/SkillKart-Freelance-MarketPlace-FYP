const FreelancerProfile = require('../models/FreelancerProfile');
const User = require('../models/User');
const Review = require('../models/Review');
const { uploadProfilePicture, uploadPortfolioImage, cleanupOrphanedAsset } = require('../services/upload.service');
const { sendSuccess, sendCreated, sendPaginated } = require('../utils/apiResponse');
const { asyncHandler, parsePagination } = require('../utils/helpers');
const { NotFoundError } = require('../utils/apiError');
const { applyUsernameUpdate } = require('../utils/username');
const { syncFreelancerVerification } = require('../services/verification.service');
const { getConnectedBalance } = require('../services/stripe.service');
const { stripHtml } = require('../utils/sanitizeInput');

// Simple in-memory cache for semantic skill expansion

/**
 * Calculate profile completion percentage
 */
const calculateCompletion = (profile, user = {}) => {
  let score = 0;
  const total = 10;
  
  if (profile.bio) score++;
  if (profile.title) score++;
  if (profile.skills?.length > 0) score++;
  if (profile.portfolio?.length > 0) score++;
  if (profile.education?.length > 0) score++;
  if (profile.certifications?.length > 0) score++;
  if (profile.hourlyRate) score++;
  if (user.profilePicture) score++;
  if (profile.socialLinks?.linkedin) score++;
  if (profile.phone) score++;
  
  return Math.round((score / total) * 100);
};

// Per-skill ancestor lookup shared by both enrichment passes below — pulled
// out so both loops can run their per-name work concurrently (Promise.all)
// instead of one taxonomy round-trip at a time.
const professionAncestorsFor = async (taxonomy, name) => {
  const node = await taxonomy.resolveCanonical(name);
  if (!node) return [];
  const ancestors = await taxonomy.getAncestors(node._id, 4);
  return ancestors.filter(a => a.type === 'profession').map(a => a.name);
};

const enrichFreelancerProfile = async (profileObj) => {
  if (!profileObj) return null;
  const taxonomy = require('../services/taxonomy.service');
  const skillNames = (profileObj.skills || []).map(s => typeof s === 'object' ? s.name : s).filter(Boolean);
  const verifiedSkillNames = (profileObj.skills || [])
    .filter(s => typeof s === 'object' && s.isVerified)
    .map(s => s.name);

  // Every per-name taxonomy lookup below hits the same resolve/ancestor
  // caches — pre-warming once up front means the concurrent calls that
  // follow are cache hits instead of a stampede of identical cold queries.
  await taxonomy.warmResolveCache([...new Set([...skillNames, ...verifiedSkillNames])]);

  const [inferredCategories, professionsPerSkill, impactsAndProfessions] = await Promise.all([
    taxonomy.inferCategories(skillNames),
    Promise.all(skillNames.map((name) => professionAncestorsFor(taxonomy, name))),
    Promise.all(verifiedSkillNames.map(async (name) => {
      const [impact, professions] = await Promise.all([
        taxonomy.getCertificationImpact(name),
        professionAncestorsFor(taxonomy, name)
      ]);
      return { categories: impact.categories, professions };
    }))
  ]);

  const inferredProfessions = [...new Set(professionsPerSkill.flat())];
  const verifiedCategoriesSet = new Set();
  const verifiedProfessionsSet = new Set();
  impactsAndProfessions.forEach(({ categories, professions }) => {
    categories.forEach((c) => verifiedCategoriesSet.add(c));
    professions.forEach((p) => verifiedProfessionsSet.add(p));
  });

  profileObj.inferredCategories = inferredCategories;
  profileObj.inferredProfessions = inferredProfessions;
  profileObj.verifiedCategories = [...verifiedCategoriesSet];
  profileObj.verifiedProfessions = [...verifiedProfessionsSet];

  return profileObj;
};

/**
 * Get freelancer profile
 */
const getProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  let profile = await FreelancerProfile.findOne({ userId });

  if (!profile) {
    // Create empty profile. A fresh signup can fire this from several
    // components at once (onboarding form, dashboard shell, etc.) — the
    // first request past the findOne above wins the create; any concurrent
    // request racing it hits the unique userId index instead of a 500.
    try {
      profile = await FreelancerProfile.create({ userId });
    } catch (err) {
      if (err.code === 11000) {
        profile = await FreelancerProfile.findOne({ userId });
      } else {
        throw err;
      }
    }
  }

  // Always sync verification details before returning profile
  await syncFreelancerVerification(userId);
  const updatedProfile = await FreelancerProfile.findOne({ userId });
  
  const updatedProfileObj = updatedProfile ? updatedProfile.toObject() : null;
  if (updatedProfileObj) {
    await enrichFreelancerProfile(updatedProfileObj);
    
    // Fetch real-time Stripe wallet balance if onboarded
    if (updatedProfileObj.stripeAccountId && updatedProfileObj.stripeOnboardingComplete) {
      try {
        const stripeBalance = await getConnectedBalance(updatedProfileObj.stripeAccountId);
        // Expose stripe balances as additional info, keep walletBalance untouched as source of truth
        updatedProfileObj.stripeBalance = stripeBalance;
      } catch (e) {
        console.error('Failed to fetch stripe balance for profile:', e.message);
      }
    }
  }
  
  sendSuccess(res, {
    message: 'Profile retrieved successfully',
    data: { profile: updatedProfileObj }
  });
});

// Explicit whitelist to prevent mass assignment — never let a client write
// server-controlled fields (walletBalance, rating, totalEarnings, Stripe
// linkage, verification status, admin wallet-freeze flags, savedJobs) via
// this endpoint. Mirrors the same pattern already used in
// client.controller.js's updateProfile.
const FREELANCER_PROFILE_ALLOWED_FIELDS = [
  'bio', 'title', 'coverPhoto', 'phone', 'hourlyRate', 'skills',
  'portfolio', 'portfolioLinks', 'education', 'certifications', 'languages',
  'availability', 'timezone', 'socialLinks', 'experienceLevel',
  'notificationSettings', 'securitySettings'
];

// The only values the CV-analysis prompts are allowed to produce (see the
// `classification` field in each AI provider's parseAndAnalyzeCV prompt).
const AI_CV_CLASSIFICATIONS = ['Strong', 'Average', 'Weak'];

/**
 * Update freelancer profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const rawUpdates = { ...req.body };

  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  if (rawUpdates.username !== undefined && rawUpdates.username !== null && String(rawUpdates.username).trim() !== '') {
    await applyUsernameUpdate(user, rawUpdates.username);
    await user.save();
  }

  const updates = {};
  FREELANCER_PROFILE_ALLOWED_FIELDS.forEach(field => {
    if (rawUpdates[field] !== undefined) updates[field] = rawUpdates[field];
  });
  if (updates.bio !== undefined) updates.bio = stripHtml(updates.bio);

  let profile = await FreelancerProfile.findOne({ userId });

  // Handle skills transformation if they come as strings — and, for
  // object-shaped entries, always re-derive verification fields from the
  // freelancer's existing record rather than trusting client-supplied
  // isVerified/verificationScore (skill verification is only ever set by
  // the skill-test flow, never by a profile edit).
  if (updates.skills && Array.isArray(updates.skills)) {
    const transformedSkills = updates.skills.map(skill => {
      const name = typeof skill === 'string' ? skill : skill?.name;
      const level = typeof skill === 'string' ? 'Beginner' : (skill?.level || 'Beginner');
      const existing = profile?.skills?.find(s => s.name === name);
      return existing ? {
        name: existing.name,
        level,
        isVerified: existing.isVerified,
        verificationScore: existing.verificationScore,
        lastTestedAt: existing.lastTestedAt,
        expiresAt: existing.expiresAt
      } : { name, level, isVerified: false };
    }).filter(s => s.name);
    updates.skills = transformedSkills;
  }

  if (!profile) {
    profile = new FreelancerProfile({ userId, ...updates });
  } else {
    profile.set(updates);
  }

  profile.profileCompletion = calculateCompletion(profile, user);

  await profile.save();

  // Trigger background suggestion flow for unrecognized skills
  const taxonomy = require('../services/taxonomy.service');
  const skillNames = (profile.skills || []).map(s => s.name).filter(Boolean);
  taxonomy.proposeUnrecognizedSkills(skillNames, profile.title || 'Freelancer', 'profile_update', profile._id);
  taxonomy.invalidateCache();
  
  sendSuccess(res, {
    message: 'Profile updated successfully',
    data: { profile }
  });
});

/**
 * Submit onboarding profile with quality gating
 */
const submitOnboardingProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const rawUpdates = req.body;

  const updates = {};
  FREELANCER_PROFILE_ALLOWED_FIELDS.forEach(field => {
    if (rawUpdates[field] !== undefined) updates[field] = rawUpdates[field];
  });
  if (updates.bio !== undefined) updates.bio = stripHtml(updates.bio);

  let profile = await FreelancerProfile.findOne({ userId });

  // Handle skills transformation if they come as strings — never trust a
  // client-supplied isVerified/verificationScore for object-shaped entries.
  if (updates.skills && Array.isArray(updates.skills)) {
    updates.skills = updates.skills.map(skill => {
      const name = typeof skill === 'string' ? skill : skill?.name;
      const level = typeof skill === 'string' ? 'Beginner' : (skill?.level || 'Beginner');
      const existing = profile?.skills?.find(s => s.name === name);
      return existing ? {
        name: existing.name,
        level,
        isVerified: existing.isVerified,
        verificationScore: existing.verificationScore,
        lastTestedAt: existing.lastTestedAt,
        expiresAt: existing.expiresAt
      } : { name, level, isVerified: false };
    }).filter(s => s.name);
  }

  if (!profile) {
    profile = new FreelancerProfile({ userId, ...updates });
  } else {
    profile.set(updates);
  }

  // The AI CV analysis never actually reached this point: `updates` only carries
  // fields listed in FREELANCER_PROFILE_ALLOWED_FIELDS, which omits `aiAnalysis`
  // (rightly — it's an input DTO, not a profile field), so `updates.aiAnalysis`
  // was always undefined and `aiClassification` was never written once. Read it
  // off the raw body instead, and — exactly like the skills block above — don't
  // trust it: the browser runs the CV parse and posts the result, so only a
  // value from the known set is persisted.
  //
  // It is ADVISORY ONLY and deliberately does NOT gate verification.
  // syncFreelancerVerification() below is the single source of truth (and
  // already enforces bio/title/skills/portfolio more strictly than the local
  // `status` this replaced ever did). Gating on this instead would be both
  // bypassable — a client can just post "Strong" — and perverse, since
  // uploading a CV is optional: it would penalise only the freelancers who
  // actually use the feature.
  if (AI_CV_CLASSIFICATIONS.includes(rawUpdates.aiAnalysis?.classification)) {
    profile.aiClassification = rawUpdates.aiAnalysis.classification;
  }

  profile.profileCompletion = calculateCompletion(profile, await User.findById(userId));
  await profile.save();

  // Trigger background suggestion flow for unrecognized skills
  const taxonomy = require('../services/taxonomy.service');
  const onboardingSkills = (profile.skills || []).map(s => s.name).filter(Boolean);
  taxonomy.proposeUnrecognizedSkills(onboardingSkills, profile.title || 'FreelancerOnboarding', 'profile_update', profile._id);
  taxonomy.invalidateCache();
  
  // Update User model flag and personal info
  const userUpdates = { isOnBoardingCompleted: true };
  if (updates.firstName) userUpdates.firstName = updates.firstName;
  if (updates.lastName) userUpdates.lastName = updates.lastName;
  
  await User.findByIdAndUpdate(userId, userUpdates);

  // Modular Verification Sync
  const verification = await syncFreelancerVerification(userId);

  sendSuccess(res, {
    message: verification.isVerified ? 'Profile verified successfully!' : 'Profile saved. Complete required steps (Skill tests, Email) to get verified.',
    data: { 
      profile: await FreelancerProfile.findOne({ userId }), 
      status: verification.verificationStatus,
      verificationDetails: verification.details
    }
  });
});

/**
 * Get freelancer by ID (public)
 */
// Public profile — only fields meant for anonymous/visitor viewing. Never
// spread the raw profile document here: it also carries phone,
// securitySettings, notificationSettings, walletBalance, totalEarnings,
// stripeAccountId, savedJobs, and admin wallet-freeze fields, none of which
// should ever reach an unauthenticated request.
const PUBLIC_FREELANCER_FIELDS = [
  'userId', 'bio', 'title', 'coverPhoto', 'hourlyRate', 'skills',
  'portfolioLinks', 'portfolio', 'education', 'certifications', 'languages',
  'availability', 'timezone', 'socialLinks', 'experienceLevel',
  'profileCompletion', 'rating', 'completedProjects', 'verificationStatus',
  'inferredCategories', 'inferredProfessions', 'verifiedCategories', 'verifiedProfessions'
];

const getFreelancerById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const profile = await FreelancerProfile.findOne({ userId: id })
    .populate('userId', 'firstName lastName profilePicture')
    .lean();

  if (!profile) {
    throw new NotFoundError('Freelancer not found');
  }

  await enrichFreelancerProfile(profile);

  const publicProfile = {};
  PUBLIC_FREELANCER_FIELDS.forEach((field) => {
    if (profile[field] !== undefined) publicProfile[field] = profile[field];
  });

  // Fetch reviews targeting this freelancer
  const reviews = await Review.find({ revieweeId: id, type: 'client_to_freelancer' })
    .populate('reviewerId', 'firstName lastName profilePicture')
    .sort({ createdAt: -1 })
    .limit(10);

  sendSuccess(res, {
    message: 'Freelancer retrieved successfully',
    data: { profile: publicProfile, reviews }
  });
});

/**
 * Search freelancers
 */
const searchFreelancers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { q, skills, minRate, maxRate, availability, isVerified, sortBy, minRating, location } = req.query;
  
  const query = {};
  
  if (q) {
    // Escape regex metacharacters — this is a fully public, unauthenticated
    // endpoint, so an unescaped user-controlled pattern here is a ReDoS
    // vector (e.g. a catastrophic-backtracking pattern like "(a+)+$").
    const escapedQ = String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQ, 'i');
    const User = require('../models/User');
    const matchedUsers = await User.find({
      $or: [
        { firstName: regex },
        { lastName: regex },
        { username: regex }
      ]
    }).select('_id');
    const userIds = matchedUsers.map(u => u._id);

    // Expand search query terms via skill graph
    const expandedTerms = await require('../services/taxonomy.service').expandSearchTerms(q);

    query.$or = [
      { title: regex },
      { bio: regex },
      { 'skills.name': { $in: expandedTerms.map(t => new RegExp(`^${t}$`, 'i')) } },
      ...(userIds.length > 0 ? [{ userId: { $in: userIds } }] : [])
    ];
  }
  
  if (skills) {
    const skillsArray = Array.isArray(skills) ? skills : skills.split(',');
    
    // Graph-expanded skills search
    const taxonomy = require('../services/taxonomy.service');
    const expandedAll = (await Promise.all(skillsArray.map(s => taxonomy.expandSearchTerms(s)))).flat();
    const uniqueExpanded = [...new Set([...skillsArray, ...expandedAll])];

    query['skills.name'] = { $in: uniqueExpanded.map(s => new RegExp(`^${require('../utils/helpers').escapeRegex ? require('../utils/helpers').escapeRegex(s) : s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) };
  }
  
  if (minRating && !isNaN(minRating)) {
    query.rating = { $gte: Number(minRating) };
  }
  
  if (location) {
    const escapedLocation = location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.timezone = { $regex: new RegExp(escapedLocation, 'i') };
  }
  
  if (minRate || maxRate) {
    query.hourlyRate = {};
    if (minRate) query.hourlyRate.$gte = Number(minRate);
    if (maxRate) query.hourlyRate.$lte = Number(maxRate);
  }
  
  if (availability) {
    query.availability = availability;
  }

  if (isVerified === 'true') {
    query.verificationStatus = 'verified';
  }

  // Sorting logic
  let sort = { 'verificationStatus': -1, 'skills.verificationScore': -1 }; // Default: prioritize experts
  if (sortBy === 'rate_asc') sort = { hourlyRate: 1 };
  if (sortBy === 'rate_desc') sort = { hourlyRate: -1 };
  
  const [profiles, total] = await Promise.all([
    FreelancerProfile.find(query)
      .populate('userId', 'firstName lastName profilePicture')
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .lean(),
    FreelancerProfile.countDocuments(query)
  ]);
  
  // Pre-warm the resolve cache once for every skill name across this whole
  // page before enriching each profile concurrently — without this, the
  // per-profile enrichments below race to cold-resolve the same overlapping
  // skill names in parallel (the original N+1 storm this endpoint was slow
  // from: ~13s cold for a full page of results).
  const allSkillNames = profiles.flatMap(p => (p.skills || []).map(s => typeof s === 'object' ? s.name : s).filter(Boolean));
  await require('../services/taxonomy.service').warmResolveCache(allSkillNames);

  const enrichedProfiles = await Promise.all(profiles.map(p => enrichFreelancerProfile(p)));

  sendPaginated(res, {
    data: enrichedProfiles,
    page,
    limit,
    total,
    message: 'Freelancers retrieved successfully'
  });
});

/**
 * Add portfolio item
 */
const addPortfolioItem = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const portfolioItem = req.body;
  
  let profile = await FreelancerProfile.findOne({ userId });
  
  if (!profile) {
    profile = await FreelancerProfile.create({ userId, portfolio: [portfolioItem] });
  } else {
    profile.portfolio.push(portfolioItem);
    await profile.save();
  }
  
  sendCreated(res, 'Portfolio item added', { profile });
});

/**
 * Update portfolio item
 */
const updatePortfolioItem = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { itemId } = req.params;
  const updates = req.body;
  
  const profile = await FreelancerProfile.findOne({ userId });
  if (!profile) {
    throw new NotFoundError('Profile not found');
  }
  
  const item = profile.portfolio.id(itemId);
  if (!item) {
    throw new NotFoundError('Portfolio item not found');
  }

  const previousImages = Array.isArray(item.images) ? [...item.images] : [];
  Object.assign(item, updates);
  await profile.save();

  const nextImages = Array.isArray(item.images) ? item.images : [];
  const removedImages = previousImages.filter((url) => !nextImages.includes(url));
  removedImages.forEach((url) => cleanupOrphanedAsset(userId, url));

  sendSuccess(res, {
    message: 'Portfolio item updated',
    data: { profile }
  });
});

/**
 * Delete portfolio item
 */
const deletePortfolioItem = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { itemId } = req.params;
  
  const profile = await FreelancerProfile.findOne({ userId });
  if (!profile) {
    throw new NotFoundError('Profile not found');
  }

  const removedImages = profile.portfolio.id(itemId)?.images || [];
  profile.portfolio.pull(itemId);
  await profile.save();
  removedImages.forEach((url) => cleanupOrphanedAsset(userId, url));

  sendSuccess(res, {
    message: 'Portfolio item deleted'
  });
});

/**
 * Get freelancer statistics
 */
const getStats = asyncHandler(async (req, res) => {
  const stats = await FreelancerProfile.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        avgRate: { $avg: '$hourlyRate' },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);
  
  sendSuccess(res, {
    message: 'Statistics retrieved',
    data: stats[0] || { total: 0, avgRate: 0, avgRating: 0 }
  });
});

/**
 * Upload avatar
 */
const uploadAvatar = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const previousUrl = (await User.findById(userId).select('profilePicture').lean())?.profilePicture;
  const fileUpload = await uploadProfilePicture(userId, req.file);
  const user = await User.findByIdAndUpdate(userId, { profilePicture: fileUpload.url }, { new: true });
  cleanupOrphanedAsset(userId, previousUrl);

  // Recalculate profile completion
  const profile = await FreelancerProfile.findOne({ userId });
  if (profile) {
    profile.profileCompletion = calculateCompletion(profile, user);
    await profile.save();
  }

  sendSuccess(res, {
    message: 'Avatar uploaded successfully',
    data: { url: fileUpload.url }
  });
});

/**
 * Toggle saved job
 */
const toggleSavedJob = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { jobId } = req.params;

  let profile = await FreelancerProfile.findOne({ userId });
  if (!profile) {
    // See getProfile() above — a fresh signup can race this create from
    // several components at once.
    try {
      profile = await FreelancerProfile.create({ userId });
    } catch (err) {
      if (err.code !== 11000) throw err;
      profile = await FreelancerProfile.findOne({ userId });
    }
  }

  const index = profile.savedJobs.findIndex(id => String(id) === String(jobId));
  if (index === -1) {
    profile.savedJobs.push(jobId);
  } else {
    profile.savedJobs.splice(index, 1);
  }
  
  await profile.save();
  sendSuccess(res, { 
    message: index === -1 ? 'Job saved' : 'Job unsaved',
    data: { savedJobs: profile.savedJobs } 
  });
});

/**
 * Get saved jobs
 */
const getSavedJobs = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  let profile = await FreelancerProfile.findOne({ userId }).populate({
    path: 'savedJobs',
    populate: { path: 'clientId', select: 'firstName lastName profilePicture' }
  });

  if (!profile) {
    // See getProfile() above — a fresh signup can race this create from
    // several components at once (this endpoint fires concurrently with
    // getProfile() on the onboarding page's initial load).
    try {
      profile = await FreelancerProfile.create({ userId });
    } catch (err) {
      if (err.code !== 11000) throw err;
      profile = await FreelancerProfile.findOne({ userId }).populate({
        path: 'savedJobs',
        populate: { path: 'clientId', select: 'firstName lastName profilePicture' }
      });
    }
  }

  sendSuccess(res, { data: { savedJobs: profile.savedJobs } });
});

/**
 * Upload portfolio media
 */
const uploadPortfolioMedia = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const fileUpload = await uploadPortfolioImage(userId, req.file);
  
  sendSuccess(res, {
    message: 'Portfolio image uploaded successfully',
    data: { url: fileUpload.url }
  });
});

/**
 * Get distinct locations (timezones)
 */
const getLocations = asyncHandler(async (req, res) => {
  const locations = await FreelancerProfile.distinct('timezone');
  // Filter out null/empty and sort
  const validLocations = locations.filter(Boolean).sort();
  sendSuccess(res, {
    message: 'Locations retrieved successfully',
    data: validLocations
  });
});

module.exports = {
  getProfile,
  updateProfile,
  getFreelancerById,
  searchFreelancers,
  addPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  getStats,
  submitOnboardingProfile,
  uploadAvatar,
  uploadPortfolioMedia,
  toggleSavedJob,
  getSavedJobs,
  getLocations
};
