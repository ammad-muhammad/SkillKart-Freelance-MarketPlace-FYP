const ClientProfile = require('../models/ClientProfile');
const ClientOnboardingDraft = require('../models/ClientOnboardingDraft');
const User = require('../models/User');
const { uploadProfilePicture, cleanupOrphanedAsset } = require('../services/upload.service');
const { sendSuccess } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/helpers');
const { NotFoundError } = require('../utils/apiError');
const { applyUsernameUpdate } = require('../utils/username');
const { getAIProvider } = require('../services/ai');
const { stripHtml } = require('../utils/sanitizeInput');

/**
 * Calculate client profile completion
 */
const calculateCompletion = (profile, user = {}) => {
  let score = 0;
  const total = 7;
  
  if (profile.companyName) score++;
  if (profile.industryType && (Array.isArray(profile.industryType) ? profile.industryType.length > 0 : !!profile.industryType)) score++;
  if (profile.description) score++;
  if (profile.location?.country) score++;
  if (profile.website) score++;
  if (user.profilePicture) score++;
  if (profile.phone) score++;
  
  return Math.round((score / total) * 100);
};

/**
 * Transform budget string to object { min, max }
 * Handles formats like "$20k+", "$10k - $20k", etc.
 */
const transformBudget = (budget) => {
  if (typeof budget === 'object' && budget !== null) return budget;
  if (typeof budget !== 'string') return { min: 0, max: 0 };

  const clean = budget.replace(/[$,]/g, '').toLowerCase();
  
  // Case: "20k+"
  if (clean.includes('+')) {
    const val = parseInt(clean.replace('k', '000'));
    return { min: val || 0, max: 0 };
  }

  // Case: "<5k" or "up to 5k"
  if (clean.includes('<') || clean.includes('up to')) {
    let valStr = clean.replace('<', '').replace('up to', '').trim();
    if (valStr.includes('k')) valStr = valStr.replace('k', '000');
    const val = parseInt(valStr);
    return { min: 0, max: val || 5000 };
  }
  
  // Case: "10k - 20k"
  if (clean.includes('-')) {
    const parts = clean.split('-').map(p => {
      let val = p.trim();
      if (val.includes('k')) val = val.replace('k', '000');
      return parseInt(val) || 0;
    });
    return { min: parts[0] || 0, max: parts[1] || 0 };
  }

  // Fallback
  return { min: 0, max: 0 };
};

/**
 * Get client profile
 */
const getProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  let profile = await ClientProfile.findOne({ userId });

  if (!profile) {
    // Same race as freelancer getProfile: a fresh signup can fire this from
    // several components at once, so a concurrent create can lose to the
    // unique userId index instead of a 500 — fall back to the winner's doc.
    try {
      profile = await ClientProfile.create({ userId });
    } catch (err) {
      if (err.code === 11000) {
        profile = await ClientProfile.findOne({ userId });
      } else {
        throw err;
      }
    }
  }

  sendSuccess(res, {
    message: 'Profile retrieved successfully',
    data: { profile }
  });
});

/**
 * Update client profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const updates = req.body;
  
  let profile = await ClientProfile.findOne({ userId });
  
  if (!profile) {
    profile = new ClientProfile({ userId });
  }

  // Explicit mapping to prevent unsafe assignment
  const allowedFields = [
    'companyName', 'companyType', 'companyLogo', 'coverPhoto', 'companySize', 'industry', 'industryType', 
    'role', 'phone', 'website', 'description', 'location', 
    'techStack', 'services', 'hiringFrequency', 'technicalUnderstanding', 
    'urgency', 'aiAssistance', 'notificationSettings', 
    'recoveryEmail', 'recoveryPhone', 'languages', 'customIndustry', 'isNewToHiring',
    'timezone', 'socialLinks'
  ];

  // Update associated User fields if present
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  let userUpdated = false;
  if (updates.username !== undefined && updates.username !== null && String(updates.username).trim() !== '') {
    userUpdated = await applyUsernameUpdate(user, updates.username);
  }



  if (userUpdated) await user.save();

  allowedFields.forEach(field => {
    if (updates[field] !== undefined) {
      profile[field] = field === 'description' ? stripHtml(updates[field]) : updates[field];
    }
  });

  if (profile.companyType === 'Individual') {
    profile.companyName = '';
    profile.companyLogo = '';
    profile.companySize = '';
    profile.role = '';
    profile.industry = [];
    profile.industryType = [];
    profile.customIndustry = '';
  } else {
    if (updates.industry !== undefined) {
      profile.industry = Array.isArray(updates.industry) ? updates.industry : [updates.industry].filter(Boolean);
      profile.industryType = Array.isArray(updates.industry) ? updates.industry : [updates.industry].filter(Boolean);
    } else if (updates.industryType !== undefined) {
      profile.industry = Array.isArray(updates.industryType) ? updates.industryType : [updates.industryType].filter(Boolean);
      profile.industryType = Array.isArray(updates.industryType) ? updates.industryType : [updates.industryType].filter(Boolean);
    }
  }

  // Special handling for securitySettings nested structure
  if (updates.securitySettings !== undefined) {
    profile.securitySettings = {
      ...profile.securitySettings?.toObject(),
      ...updates.securitySettings
    };
  } else {
    if (updates.recoveryEmail !== undefined) {
      if (!profile.securitySettings) profile.securitySettings = {};
      profile.securitySettings.recoveryEmail = updates.recoveryEmail;
    }
    if (updates.recoveryPhone !== undefined) {
      if (!profile.securitySettings) profile.securitySettings = {};
      profile.securitySettings.recoveryPhone = updates.recoveryPhone;
    }
  }

  // Special handling for socialLinks nested structure
  if (updates.socialLinks !== undefined) {
    profile.socialLinks = {
      ...profile.socialLinks?.toObject(),
      ...updates.socialLinks
    };
  }

  // Special handling for budgetRange
  if (updates.budgetRange !== undefined) {
    profile.budgetRange = transformBudget(updates.budgetRange);
  }
  
  // Calculate completion
  profile.profileCompletion = calculateCompletion(profile, user);
  
  await profile.save();
  
  sendSuccess(res, {
    message: 'Profile updated successfully',
    data: { profile }
  });
});

/**
 * Get client by ID
 */
const getClientById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const profile = await ClientProfile.findOne({ userId: id })
    .populate('userId', 'firstName lastName email profilePicture');
  
  if (!profile) {
    throw new NotFoundError('Client not found');
  }
  
  sendSuccess(res, {
    message: 'Client retrieved successfully',
    data: { profile }
  });
});

/**
 * Get public client profile by ID
 */
// Only these fields are ever returned for a public (anonymous-visitor)
// client profile — same explicit-whitelist pattern as
// freelancer.controller.js's PUBLIC_FREELANCER_FIELDS, so a new sensitive
// field added to ClientProfile in the future doesn't auto-leak the way a
// blacklist would. `totalSpent` is deliberately included — it's a real,
// designed "trust signal" feature the public client-profile page displays
// (the freelancer-side equivalent, totalEarnings, is NOT public because no
// such feature exists there).
const PUBLIC_CLIENT_FIELDS = [
  'userId', 'companyName', 'companyType', 'companyLogo', 'coverPhoto',
  '_id', 'userId', 'companyName', 'companyType', 'role', 'companySizeRange',
  'companySize', 'industry', 'industryType', 'customIndustry', 'website',
  'description', 'location', 'services', 'techStack', 'hiringFrequency',
  'timezone', 'socialLinks', 'languages', 'rating', 'verificationStatus',
  'totalProjectsPosted', 'totalSpent', 'createdAt'
];

const getPublicClientById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let raw = await ClientProfile.findOne({ userId: id })
    .populate('userId', 'firstName lastName profilePicture')
    .lean();

  if (!raw) {
    raw = await ClientProfile.findById(id)
      .populate('userId', 'firstName lastName profilePicture')
      .lean();
  }

  if (!raw) {
    throw new NotFoundError('Client not found');
  }

  const clientId = raw.userId?._id || raw.userId;

  // Calculate dynamic total projects posted (excluding gig purchases)
  const Job = require('../models/Job');
  raw.totalProjectsPosted = await Job.countDocuments({
    clientId,
    source: { $ne: 'gig' },
    status: { $ne: 'draft' }
  });

  const profile = {};
  PUBLIC_CLIENT_FIELDS.forEach((field) => {
    if (raw[field] !== undefined) profile[field] = raw[field];
  });

  // Fetch reviews targeting this client (freelancer_to_client)
  const Review = require('../models/Review');
  const reviews = await Review.find({
    revieweeId: clientId,
    type: 'freelancer_to_client',
    isHidden: { $ne: true }
  })
    .populate('reviewerId', 'firstName lastName profilePicture')
    .sort({ createdAt: -1 })
    .lean();

  sendSuccess(res, {
    message: 'Public client profile retrieved successfully',
    data: { profile, reviews }
  });
});

/**
 * Submit verification documents
 */
const submitVerification = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { documents } = req.body;
  
  let profile = await ClientProfile.findOne({ userId });
  
  if (!profile) {
    profile = await ClientProfile.create({
      userId,
      verificationDocuments: documents,
      verificationStatus: 'pending'
    });
  } else {
    profile.verificationDocuments = documents;
    profile.verificationStatus = 'pending';
    await profile.save();
  }
  
  sendSuccess(res, {
    message: 'Verification submitted successfully',
    data: { profile }
  });
});

/**
 * Approve client verification (Admin)
 */
const approveVerification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const profile = await ClientProfile.findOne({ userId: id });
  if (!profile) {
    throw new NotFoundError('Client not found');
  }
  
  profile.verificationStatus = 'verified';
  profile.verifiedBy = req.user._id;
  await profile.save();
  
  sendSuccess(res, {
    message: 'Client verified successfully',
    data: { profile }
  });
});

/**
 * Reject client verification (Admin)
 */
const rejectVerification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  
  const profile = await ClientProfile.findOne({ userId: id });
  if (!profile) {
    throw new NotFoundError('Client not found');
  }
  
  profile.verificationStatus = 'rejected';
  profile.rejectionReason = reason;
  await profile.save();
  
  sendSuccess(res, {
    message: 'Verification rejected',
    data: { profile }
  });
});

/**
 * Get client statistics
 */
const getStats = asyncHandler(async (req, res) => {
  const stats = await ClientProfile.aggregate([
    {
      $group: {
        _id: '$verificationStatus',
        count: { $sum: 1 }
      }
    }
  ]);
  
  sendSuccess(res, {
    message: 'Statistics retrieved',
    data: { byStatus: stats }
  });
});

/**
 * Save onboarding draft
 */
const saveDraft = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { formData, step } = req.body;

  let draft = await ClientOnboardingDraft.findOne({ userId });

  if (!draft) {
    draft = new ClientOnboardingDraft({ userId, formData, step });
  } else {
    draft.formData = formData;
    draft.step = step;
  }

  await draft.save();

  sendSuccess(res, {
    message: 'Draft saved successfully',
    data: { draft }
  });
});

/**
 * Get onboarding draft
 */
const getDraft = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const draft = await ClientOnboardingDraft.findOne({ userId });

  sendSuccess(res, {
    message: 'Draft retrieved successfully',
    data: { draft }
  });
});

/**
 * Submit onboarding profile
 */
const submitOnboardingProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const data = req.body;

  let profile = await ClientProfile.findOne({ userId });

  const isIndividual = data.companyType === 'Individual';
  let industryValue = [];
  if (!isIndividual) {
    const rawVal = data.industryType || data.industry || [];
    industryValue = Array.isArray(rawVal) ? rawVal : [rawVal].filter(Boolean);
  }

  const profileData = {
    userId,
    companyName: isIndividual ? '' : data.companyName,
    companyType: data.companyType,
    companyLogo: isIndividual ? '' : data.companyLogo,
    website: isIndividual ? '' : data.companyWebsite,
    industry: industryValue,
    industryType: industryValue,
    customIndustry: '',
    role: isIndividual ? '' : data.role,
    phone: data.phone,
    description: data.bio,
    languages: data.languages,
    location: data.location || { country: data.country },
    isNewToHiring: data.isNewToHiring,
    services: [],
    techStack: data.techStack,
    budgetRange: transformBudget(data.budgetRange),
    hiringFrequency: data.hiringFrequency,
    technicalUnderstanding: data.technicalUnderstanding,
    urgency: data.urgency,
    aiAssistance: data.aiAssistance,
    onboardingStatus: 'completed',
    verificationStatus: 'pending'
  };

  if (!profile) {
    profile = new ClientProfile(profileData);
  } else {
    // Explicit mapping instead of Object.assign
    Object.keys(profileData).forEach(key => {
      profile[key] = profileData[key];
    });
  }

  profile.profileCompletion = calculateCompletion(profile, await User.findById(userId));
  await profile.save();

  // Update User model flag
  await User.findByIdAndUpdate(userId, { isOnBoardingCompleted: true });

  // Clear the draft
  await ClientOnboardingDraft.findOneAndDelete({ userId });

  sendSuccess(res, {
    message: 'Onboarding completed successfully',
    data: { profile }
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
  const profile = await ClientProfile.findOne({ userId });
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
 * Upload company logo
 */
const uploadCompanyLogo = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const fileUpload = await uploadProfilePicture(userId, req.file);

  const profile = await ClientProfile.findOne({ userId });
  if (profile) {
    const previousUrl = profile.companyLogo;
    profile.companyLogo = fileUpload.url;
    profile.profileCompletion = calculateCompletion(profile, await User.findById(userId));
    await profile.save();
    cleanupOrphanedAsset(userId, previousUrl);
  }

  sendSuccess(res, {
    message: 'Company logo uploaded successfully',
    data: { url: fileUpload.url }
  });
});

/**
 * Upload cover image
 */
const uploadCoverImage = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const fileUpload = await uploadProfilePicture(userId, req.file);

  const profile = await ClientProfile.findOne({ userId });
  if (profile) {
    const previousUrl = profile.coverPhoto;
    profile.coverPhoto = fileUpload.url;
    await profile.save();
    cleanupOrphanedAsset(userId, previousUrl);
  }

  sendSuccess(res, {
    message: 'Cover image uploaded successfully',
    data: { url: fileUpload.url }
  });
});

/**
 * Toggle saved freelancer
 */
const toggleSavedFreelancer = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { freelancerId } = req.body;

  let profile = await ClientProfile.findOne({ userId });
  if (!profile) profile = await ClientProfile.create({ userId });

  const index = profile.savedFreelancers.indexOf(freelancerId);
  if (index > -1) {
    profile.savedFreelancers.splice(index, 1);
  } else {
    profile.savedFreelancers.push(freelancerId);
  }
  
  await profile.save();
  
  sendSuccess(res, {
    message: index > -1 ? 'Freelancer removed from saved' : 'Freelancer saved successfully',
    data: { savedFreelancers: profile.savedFreelancers }
  });
});

/**
 * Get saved freelancers
 */
const getSavedFreelancers = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  let profile = await ClientProfile.findOne({ userId })
    .populate({
      path: 'savedFreelancers',
      select: 'firstName lastName email profilePicture rating'
    });

  if (!profile) profile = await ClientProfile.create({ userId });

  const FreelancerProfile = require('../models/FreelancerProfile');
  const userIds = profile.savedFreelancers.map(u => u._id);
  const profiles = await FreelancerProfile.find({ userId: { $in: userIds } }).lean();
  
  const saved = profile.savedFreelancers.map(u => {
    const userObj = typeof u.toObject === 'function' ? u.toObject() : u;
    userObj.freelancerProfile = profiles.find(fp => fp.userId.toString() === u._id.toString()) || null;
    return userObj;
  });
  
  sendSuccess(res, {
    message: 'Saved freelancers retrieved successfully',
    data: { savedFreelancers: saved }
  });
});

// checkUsername was a duplicate of authController.checkUsername — the client
// route now reuses the shared implementation. (removed)

/**
 * Recommend industries based on company details
 */
const recommendIndustry = asyncHandler(async (req, res) => {
  const { companyName, bio, techStack, website } = req.body;

  try {
    const ai = getAIProvider();
    const result = await ai.recommendIndustry(companyName, bio, techStack, website);
    
    sendSuccess(res, {
      message: 'Industry recommendations generated successfully',
      data: result
    });
  } catch (error) {
    console.error("recommendIndustry controller error:", error.message);
    const defaultRecommendations = ["Software & IT Services", "E-commerce", "Consulting"];
    sendSuccess(res, {
      message: 'Industry recommendations generated (Fallback)',
      data: { recommendations: defaultRecommendations }
    });
  }
});

module.exports = {
  getProfile,
  updateProfile,
  getClientById,
  submitVerification,
  approveVerification,
  rejectVerification,
  getStats,
  saveDraft,
  getDraft,
  submitOnboardingProfile,
  uploadAvatar,
  uploadCompanyLogo,
  uploadCoverImage,
  toggleSavedFreelancer,
  getSavedFreelancers,
  recommendIndustry,
  getPublicClientById
};
