const User = require('../models/User');
const ClientProfile = require('../models/ClientProfile');
const FreelancerProfile = require('../models/FreelancerProfile');
const authService = require('../services/auth.service');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Create client profile
 * POST /api/profile/client
 */
const createClientProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Check if profile already exists
  const existingProfile = await ClientProfile.findOne({ userId });
  if (existingProfile) {
    throw new ApiError(400, 'Profile already exists');
  }

  const profile = await ClientProfile.create({
    userId,
    ...req.body,
  });

  // Mark profile as complete
  await authService.markProfileComplete(userId);

  res.status(201).json(
    new ApiResponse(201, profile, 'Client profile created successfully')
  );
});

/**
 * Create freelancer profile
 * POST /api/profile/freelancer
 */
const createFreelancerProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Check if profile already exists
  const existingProfile = await FreelancerProfile.findOne({ userId });
  if (existingProfile) {
    throw new ApiError(400, 'Profile already exists');
  }

  const profile = await FreelancerProfile.create({
    userId,
    ...req.body,
  });

  // Mark profile as complete
  await authService.markProfileComplete(userId);

  res.status(201).json(
    new ApiResponse(201, profile, 'Freelancer profile created successfully')
  );
});

/**
 * Get own profile
 * GET /api/profile/me
 */
const getMyProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;

  const Model = role === 'client' ? ClientProfile : FreelancerProfile;
  const profile = await Model.findOne({ userId });

  if (!profile) {
    throw new ApiError(404, 'Profile not found');
  }

  res.status(200).json(
    new ApiResponse(200, profile, 'Profile retrieved successfully')
  );
});

/**
 * Update own profile
 * PUT /api/profile/me
 */
const updateMyProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;

  const Model = role === 'client' ? ClientProfile : FreelancerProfile;
  const profile = await Model.findOneAndUpdate(
    { userId },
    { $set: req.body },
    { new: true, runValidators: true }
  );

  if (!profile) {
    throw new ApiError(404, 'Profile not found');
  }

  res.status(200).json(
    new ApiResponse(200, profile, 'Profile updated successfully')
  );
});

/**
 * Get public profile by ID
 * GET /api/profile/:userId
 */
const getProfileById = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const Model = user.role === 'client' ? ClientProfile : FreelancerProfile;
  const profile = await Model.findOne({ userId });

  if (!profile) {
    throw new ApiError(404, 'Profile not found');
  }

  res.status(200).json(
    new ApiResponse(200, { user, profile }, 'Profile retrieved successfully')
  );
});

module.exports = {
  createClientProfile,
  createFreelancerProfile,
  getMyProfile,
  updateMyProfile,
  getProfileById,
};
