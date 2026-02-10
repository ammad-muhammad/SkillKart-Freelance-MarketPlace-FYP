const cloudinary = require('cloudinary').v2;
const config = require('../config');
const FileUpload = require('../models/FileUpload');
const { FileUploadError } = require('../utils/apiError');

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret
});

/**
 * Upload file to Cloudinary
 */
const uploadToCloudinary = async (file, folder = 'uploads') => {
  try {
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(file.buffer);
    });

    return result;
  } catch (error) {
    throw new FileUploadError('File upload failed');
  }
};

/**
 * Upload profile picture
 */
const uploadProfilePicture = async (userId, file) => {
  const result = await uploadToCloudinary(file, 'profile-pictures');

  const fileUpload = await FileUpload.create({
    userId,
    fileName: result.public_id,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    url: result.secure_url,
    cloudinaryId: result.public_id,
    fileType: 'image',
    isPublic: true
  });

  return fileUpload;
};

/**
 * Upload CV
 */
const uploadCV = async (userId, file) => {
  const result = await uploadToCloudinary(file, 'cvs');

  const fileUpload = await FileUpload.create({
    userId,
    fileName: result.public_id,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    url: result.secure_url,
    cloudinaryId: result.public_id,
    fileType: 'cv',
    isPublic: false
  });

  return fileUpload;
};

/**
 * Upload portfolio item
 */
const uploadPortfolioImage = async (userId, file) => {
  const result = await uploadToCloudinary(file, 'portfolio');

  const fileUpload = await FileUpload.create({
    userId,
    fileName: result.public_id,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    url: result.secure_url,
    cloudinaryId: result.public_id,
    fileType: 'portfolio',
    isPublic: true
  });

  return fileUpload;
};

/**
 * Delete file from Cloudinary
 */
const deleteFromCloudinary = async (cloudinaryId) => {
  try {
    await cloudinary.uploader.destroy(cloudinaryId);
    return true;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
};

/**
 * Delete file
 */
const deleteFile = async (fileId, userId) => {
  const file = await FileUpload.findById(fileId);
  
  if (!file) {
    throw new FileUploadError('File not found');
  }

  if (file.userId.toString() !== userId.toString()) {
    throw new FileUploadError('Unauthorized');
  }

  await deleteFromCloudinary(file.cloudinaryId);
  await FileUpload.deleteOne({ _id: fileId });

  return true;
};

/**
 * Get user files
 */
const getUserFiles = async (userId, fileType = null) => {
  const query = { userId };
  if (fileType) query.fileType = fileType;

  return await FileUpload.find(query).sort({ createdAt: -1 });
};

module.exports = {
  uploadToCloudinary,
  uploadProfilePicture,
  uploadCV,
  uploadPortfolioImage,
  deleteFromCloudinary,
  deleteFile,
  getUserFiles
};
