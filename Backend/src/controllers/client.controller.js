const ClientProfile = require('../models/ClientProfile');
const ClientOnboardingDraft = require('../models/ClientOnboardingDraft');
const User = require('../models/User');
const { sendSuccess, sendCreated, sendNotFound } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/helpers');
const { NotFoundError } = require('../utils/apiError');

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
    profile = new ClientProfile({ userId, ...updates });
  } else {
    Object.assign(profile, updates);
  }
  
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
    industryType: data.industryType,
    customIndustry: data.customIndustry,
    role: data.role,
    location: { country: data.country },
    isNewToHiring: data.isNewToHiring,
    services: data.services,
    techStack: data.techStack,
    budgetRange: data.budgetRange,
    hiringFrequency: data.hiringFrequency,
    technicalUnderstanding: data.technicalUnderstanding,
    urgency: data.urgency,
    aiAssistance: data.aiAssistance,
    onboardingStatus: 'completed',
    verificationStatus: 'pending' // Mark as pending for admin review
  };

  if (!profile) {
    profile = new ClientProfile(profileData);
  } else {
    Object.assign(profile, profileData);
  }

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
  submitOnboardingProfile
};
