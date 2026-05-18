const ClientProfile = require('../models/ClientProfile');
const ClientOnboardingDraft = require('../models/ClientOnboardingDraft');
const User = require('../models/User');
const { uploadProfilePicture } = require('../services/upload.service');
const { sendSuccess, sendCreated, sendNotFound } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/helpers');
const { NotFoundError } = require('../utils/apiError');

/**
 * Calculate client profile completion
 */
const calculateCompletion = (profile, user = {}) => {
  let score = 0;
  const total = 7;
  
  if (profile.companyName) score++;
  if (profile.industryType) score++;
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
    profile = await ClientProfile.create({ userId });
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
    'companyName', 'companyType', 'companyLogo', 'companySize', 'industry', 'industryType', 
    'role', 'phone', 'website', 'description', 'location', 
    'techStack', 'services', 'hiringFrequency', 'technicalUnderstanding', 
    'urgency', 'aiAssistance', 'notificationSettings', 
    'recoveryEmail', 'recoveryPhone'
  ];

  // Update associated User fields if present
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  let userUpdated = false;
  if (updates.username && updates.username.trim() !== "" && updates.username !== user.username) {
    const existing = await User.findOne({ username: updates.username, _id: { $ne: userId } });
    if (existing) return res.status(400).json({ success: false, message: 'Username already taken' });
    user.username = updates.username.trim();
    userUpdated = true;
  }



  if (userUpdated) await user.save();

  allowedFields.forEach(field => {
    if (updates[field] !== undefined) {
      profile[field] = updates[field];
    }
  });

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

  const profileData = {
    userId,
    companyName: data.companyName,
    companyType: data.companyType,
    companyLogo: data.companyLogo,
    industryType: data.industryType,
    customIndustry: data.customIndustry,
    role: data.role,
    phone: data.phone,
    description: data.bio,
    languages: data.languages,
    location: data.location || { country: data.country },
    isNewToHiring: data.isNewToHiring,
    services: data.services,
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

  const fileUpload = await uploadProfilePicture(userId, req.file);
  const user = await User.findByIdAndUpdate(userId, { profilePicture: fileUpload.url }, { new: true });

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
    profile.companyLogo = fileUpload.url;
    profile.profileCompletion = calculateCompletion(profile, await User.findById(userId));
    await profile.save();
  }

  sendSuccess(res, {
    message: 'Company logo uploaded successfully',
    data: { url: fileUpload.url }
  });
});

/**
 * Toggle saved freelancer
 */
const toggleSavedFreelancer = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { freelancerId } = req.body;
  
  const profile = await ClientProfile.findOne({ userId });
  if (!profile) throw new NotFoundError('Profile not found');
  
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
  
  const profile = await ClientProfile.findOne({ userId })
    .populate({
      path: 'savedFreelancers',
      select: 'firstName lastName email profilePicture rating',
      populate: { path: 'freelancerProfile' }
    });
    
  if (!profile) throw new NotFoundError('Profile not found');
  
  sendSuccess(res, {
    message: 'Saved freelancers retrieved successfully',
    data: { savedFreelancers: profile.savedFreelancers }
  });
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
  toggleSavedFreelancer,
  getSavedFreelancers
};
