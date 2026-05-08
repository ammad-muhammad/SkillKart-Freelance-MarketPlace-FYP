const FreelancerProfile = require('../models/FreelancerProfile');
const User = require('../models/User');
const { uploadProfilePicture, uploadPortfolioImage } = require('../services/upload.service');
const { sendSuccess, sendCreated, sendNotFound, sendPaginated } = require('../utils/apiResponse');
const { asyncHandler, parsePagination } = require('../utils/helpers');
const { NotFoundError } = require('../utils/apiError');

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
  
  sendSuccess(res, {
    message: 'Profile retrieved successfully',
    data: { profile }
  });
});

/**
 * Update freelancer profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const updates = req.body;
  
  let profile = await FreelancerProfile.findOne({ userId });
  
  if (!profile) {
    profile = new FreelancerProfile({ userId, ...updates });
  } else {
    Object.assign(profile, updates);
  }
  
  // Calculate completion
  const user = await User.findById(userId);
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
  
  if (!profile) {
    profile = new FreelancerProfile({ userId, ...updates });
  } else {
    Object.assign(profile, updates);
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

  profile.verificationStatus = status;
  profile.profileCompletion = calculateCompletion(profile, await User.findById(userId));
  
  await profile.save();
  
  // Update User model flag
  await User.findByIdAndUpdate(userId, { isOnBoardingCompleted: true });
  
  sendSuccess(res, {
    message: status === 'verified' ? 'Profile verified successfully!' : 'Profile saved but marked unverified due to incomplete sections.',
    data: { profile, status }
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
  
  sendSuccess(res, {
    message: 'Freelancer retrieved successfully',
    data: { profile }
  });
});

/**
 * Search freelancers
 */
const searchFreelancers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { skills, minRate, maxRate, availability } = req.query;
  
  const query = { verificationStatus: 'verified' };
  
  if (skills) {
    const skillsArray = skills.split(',').map(s => s.trim());
    query.skills = { $in: skillsArray };
  }
  
  if (minRate || maxRate) {
    query.hourlyRate = {};
    if (minRate) query.hourlyRate.$gte = parseFloat(minRate);
    if (maxRate) query.hourlyRate.$lte = parseFloat(maxRate);
  }
  
  if (availability) {
    query.availability = availability;
  }
  
  const total = await FreelancerProfile.countDocuments(query);
  const profiles = await FreelancerProfile.find(query)
    .populate('userId', 'firstName lastName email profilePicture')
    .skip(skip)
    .limit(limit)
    .sort({ rating: -1 });
  
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
  getSavedJobs
};
