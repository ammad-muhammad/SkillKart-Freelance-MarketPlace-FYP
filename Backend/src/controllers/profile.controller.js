const FreelancerProfile = require('../models/FreelancerProfile');
const ClientProfile = require('../models/ClientProfile');
const uploadService = require('../services/upload.service');
const otpService = require('../services/otp.service');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/helpers');

/**
 * Upload profile picture
 */
const uploadProfilePicture = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const file = req.file;
  
  const upload = await uploadService.uploadProfilePicture(userId, file);
  
  // Update user
  const User = require('../models/User');
  await User.findByIdAndUpdate(userId, { profilePicture: upload.url });
  
  sendSuccess(res, {
    message: 'Profile picture uploaded successfully',
    data: { url: upload.url }
  });
});

/**
 * Upload CV (Freelancer)
 */
const uploadCV = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const file = req.file;
  
  const upload = await uploadService.uploadCV(userId, file);
  
  sendSuccess(res, {
    message: 'CV uploaded successfully',
    data: { cv: upload }
  });
});

/**
 * Upload portfolio image
 */
const uploadPortfolioImage = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const file = req.file;
  
  const upload = await uploadService.uploadPortfolioImage(userId, file);
  
  sendSuccess(res, {
    message: 'Portfolio image uploaded successfully',
    data: { url: upload.url }
  });
});

/**
 * Request OTP for profile update
 */
const requestProfileUpdateOTP = asyncHandler(async (req, res) => {
  const email = req.user.email;
  
  await otpService.generateAndSendOTP(email, 'profile_update');
  
  sendSuccess(res, {
    message: 'OTP sent to your email'
  });
});

/**
 * Update profile with OTP verification
 */
const updateProfileWithOTP = asyncHandler(async (req, res) => {
  const { otp, profileData, profileType } = req.body;
  const userId = req.user._id;
  const email = req.user.email;
  
  // Verify OTP
  const otpResult = await otpService.verifyOTP(email, otp, 'profile_update');
  if (!otpResult.valid) {
    return sendError(res, { statusCode: 400, message: otpResult.message });
  }
  
  let profile;
  
  if (profileType === 'freelancer') {
    profile = await FreelancerProfile.findOneAndUpdate(
      { userId },
      profileData,
      { new: true, upsert: true }
    );
  } else {
    profile = await ClientProfile.findOneAndUpdate(
      { userId },
      profileData,
      { new: true, upsert: true }
    );
  }
  
  sendSuccess(res, {
    message: 'Profile updated successfully',
    data: { profile }
  });
});

/**
 * Delete file
 */
const deleteFile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { fileId } = req.params;
  
  await uploadService.deleteFile(fileId, userId);
  
  sendSuccess(res, {
    message: 'File deleted successfully'
  });
});

/**
 * Get user files
 */
const getUserFiles = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { fileType } = req.query;
  
  const files = await uploadService.getUserFiles(userId, fileType);
  
  sendSuccess(res, {
    message: 'Files retrieved successfully',
    data: { files }
  });
});

module.exports = {
  uploadProfilePicture,
  uploadCV,
  uploadPortfolioImage,
  requestProfileUpdateOTP,
  updateProfileWithOTP,
  deleteFile,
  getUserFiles
};
