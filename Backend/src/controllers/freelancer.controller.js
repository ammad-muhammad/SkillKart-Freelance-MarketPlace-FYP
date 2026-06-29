const FreelancerProfile = require('../models/FreelancerProfile');
const User = require('../models/User');
const Review = require('../models/Review');
const { uploadProfilePicture, uploadPortfolioImage } = require('../services/upload.service');
const { sendSuccess, sendCreated, sendNotFound, sendPaginated } = require('../utils/apiResponse');
const { asyncHandler, parsePagination } = require('../utils/helpers');
const { NotFoundError } = require('../utils/apiError');
const { applyUsernameUpdate } = require('../utils/username');
const { syncFreelancerVerification } = require('../services/verification.service');
const { getAIProvider } = require('../services/ai');

// Simple in-memory cache for semantic skill expansion
const skillExpansionCache = new Map();

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

/**
 * Get freelancer profile
 */
const getProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  let profile = await FreelancerProfile.findOne({ userId });
  
  if (!profile) {
    // Create empty profile
    profile = await FreelancerProfile.create({ userId });
  }

  // Always sync verification details before returning profile
  await syncFreelancerVerification(userId);
  const updatedProfile = await FreelancerProfile.findOne({ userId });
  
  sendSuccess(res, {
    message: 'Profile retrieved successfully',
    data: { profile: updatedProfile }
  });
});

/**
 * Update freelancer profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const updates = { ...req.body };

  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  if (updates.username !== undefined && updates.username !== null && String(updates.username).trim() !== '') {
    await applyUsernameUpdate(user, updates.username);
    await user.save();
  }
  delete updates.username;
  
  let profile = await FreelancerProfile.findOne({ userId });
  
  // Handle skills transformation if they come as strings
  if (updates.skills && Array.isArray(updates.skills)) {
    const transformedSkills = updates.skills.map(skill => {
      if (typeof skill === 'string') {
        const existing = profile?.skills?.find(s => s.name === skill);
        return existing ? {
          name: existing.name,
          level: existing.level,
          isVerified: existing.isVerified,
          verificationScore: existing.verificationScore,
          lastTestedAt: existing.lastTestedAt,
          expiresAt: existing.expiresAt
        } : { name: skill, level: 'Beginner', isVerified: false };
      }
      return skill;
    });
    updates.skills = transformedSkills;
  }

  if (!profile) {
    profile = new FreelancerProfile({ userId, ...updates });
  } else {
    profile.set(updates);
  }
  
  profile.profileCompletion = calculateCompletion(profile, user);
  
  await profile.save();
  
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
  const updates = req.body;
  
  let profile = await FreelancerProfile.findOne({ userId });
  
  // Handle skills transformation if they come as strings
  if (updates.skills && Array.isArray(updates.skills)) {
    updates.skills = updates.skills.map(skill => {
      if (typeof skill === 'string') {
        const existing = profile?.skills?.find(s => s.name === skill);
        return existing || { name: skill, level: 'Beginner', isVerified: false };
      }
      return skill;
    });
  }

  if (!profile) {
    profile = new FreelancerProfile({ userId, ...updates });
  } else {
    profile.set(updates);
  }

  // Smart Gating Logic (Verification Status)
  let status = 'verified';
  
  // 1. Structural Completeness Check
  const hasBio = profile.bio && profile.bio.trim().length > 0;
  const hasTitle = profile.title && profile.title.trim().length > 0;
  const hasSkills = profile.skills && profile.skills.length > 0;
  const hasPortfolio = profile.portfolio && profile.portfolio.length > 0;
  
  if (!hasBio || !hasTitle || !hasSkills || !hasPortfolio) {
    status = 'unverified';
  }

  // 2. AI Quality Gate Check
  if (updates.aiAnalysis) {
    profile.aiClassification = updates.aiAnalysis.classification;
    if (profile.aiClassification === 'Weak') {
      status = 'unverified';
    }
  }

  profile.profileCompletion = calculateCompletion(profile, await User.findById(userId));
  await profile.save();
  
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
const getFreelancerById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const profile = await FreelancerProfile.findOne({ userId: id })
    .populate('userId', 'firstName lastName email profilePicture rating');
  
  if (!profile) {
    throw new NotFoundError('Freelancer not found');
  }

  // Fetch reviews targeting this freelancer
  const reviews = await Review.find({ revieweeId: id, type: 'client_to_freelancer' })
    .populate('reviewerId', 'firstName lastName profilePicture')
    .sort({ createdAt: -1 })
    .limit(10);
  
  sendSuccess(res, {
    message: 'Freelancer retrieved successfully',
    data: { profile, reviews }
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
    const regex = new RegExp(q, 'i');
    // Find matching users by name or username
    const User = require('../models/User');
    const matchedUsers = await User.find({
      $or: [
        { firstName: regex },
        { lastName: regex },
        { username: regex }
      ]
    }).select('_id');
    const userIds = matchedUsers.map(u => u._id);

    query.$or = [
      { title: regex },
      { bio: regex },
      { 'skills.name': regex },
      ...(userIds.length > 0 ? [{ userId: { $in: userIds } }] : [])
    ];
  }
  
  if (skills) {
    const skillsArray = Array.isArray(skills) ? skills : skills.split(',');
    
    // Semantic Expansion
    let expandedSkills = [...skillsArray];
    try {
      const aiProvider = getAIProvider();
      const expansionPromises = skillsArray.map(async (s) => {
        const lowerS = s.toLowerCase().trim();
        if (skillExpansionCache.has(lowerS)) {
           return skillExpansionCache.get(lowerS);
        }
        const expanded = await aiProvider.expandSearchSkills(s);
        if (expanded && expanded.length > 0) {
           skillExpansionCache.set(lowerS, expanded);
           return expanded;
        }
        return [];
      });
      const results = await Promise.all(expansionPromises);
      results.forEach(res => {
         if (Array.isArray(res)) expandedSkills.push(...res);
      });
    } catch (err) {
      console.error("AI Expansion failed during search:", err);
    }
    
    // Deduplicate
    expandedSkills = [...new Set(expandedSkills)];

    query['skills.name'] = { $in: expandedSkills.map(s => new RegExp(`^${s}$`, 'i')) };
  }
  
  if (minRating && !isNaN(minRating)) {
    query.rating = { $gte: Number(minRating) };
  }
  
  if (location) {
    query.timezone = { $regex: new RegExp(location, 'i') };
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
      .skip(skip),
    FreelancerProfile.countDocuments(query)
  ]);
  
  sendPaginated(res, {
    data: profiles,
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
  
  Object.assign(item, updates);
  await profile.save();
  
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
  
  profile.portfolio.pull(itemId);
  await profile.save();
  
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

  const fileUpload = await uploadProfilePicture(userId, req.file);
  const user = await User.findByIdAndUpdate(userId, { profilePicture: fileUpload.url }, { new: true });

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
  
  const profile = await FreelancerProfile.findOne({ userId });
  if (!profile) throw new NotFoundError('Profile not found');
  
  const index = profile.savedJobs.indexOf(jobId);
  if (index === -1) {
    profile.savedJobs.push(jobId);
  } else {
    profile.savedJobs.splice(index, 1);
  }
  
  await profile.save();
  sendSuccess(res, { message: index === -1 ? 'Job saved' : 'Job unsaved' });
});

/**
 * Get saved jobs
 */
const getSavedJobs = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const profile = await FreelancerProfile.findOne({ userId }).populate({
    path: 'savedJobs',
    populate: { path: 'clientId', select: 'firstName lastName profilePicture' }
  });
  
  if (!profile) throw new NotFoundError('Profile not found');
  
  sendSuccess(res, { data: profile.savedJobs });
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
