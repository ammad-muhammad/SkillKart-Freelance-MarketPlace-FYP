const uploadService = require('../services/upload.service');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Upload file
 * POST /api/upload
 */
const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No file provided');
  }

  const { fileType } = req.body;

  if (!fileType) {
    throw new ApiError(400, 'File type is required');
  }

  const file = await uploadService.uploadFile(req.file, req.user._id, fileType);

  res.status(201).json(
    new ApiResponse(201, file, 'File uploaded successfully')
  );
});

/**
 * Get user files
 * GET /api/upload/my
 */
const getMyFiles = asyncHandler(async (req, res) => {
  const { fileType } = req.query;

  const files = await uploadService.getUserFiles(req.user._id, fileType);

  res.status(200).json(
    new ApiResponse(200, files, 'Files retrieved successfully')
  );
});

/**
 * Delete file
 * DELETE /api/upload/:id
 */
const deleteFile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await uploadService.deleteFile(id, req.user._id);

  res.status(200).json(
    new ApiResponse(200, result, 'File deleted successfully')
  );
});

module.exports = {
  uploadFile,
  getMyFiles,
  deleteFile,
};
