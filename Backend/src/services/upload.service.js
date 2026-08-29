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

const IMAGE_MIME_PREFIX = 'image/';

const extensionFromName = (name = '') => {
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

const resolveResourceType = (mimetype = '') => {
  if (mimetype.startsWith(IMAGE_MIME_PREFIX)) return 'image';
  // Cloudinary's "Restricted media types" account security setting blocks
  // public delivery of `raw` resources (401 "deny or ACL failure") unless
  // "Allow delivery of PDF and ZIP files" is explicitly enabled in the
  // console. PDFs can instead be uploaded as `image` resources — Cloudinary
  // treats PDFs as a first-class image type there (page thumbnails, etc.)
  // and that delivery path isn't subject to the raw-file restriction, so
  // this sidesteps the block without needing an account setting change.
  if (mimetype === 'application/pdf') return 'image';
  return 'raw';
};

/**
 * Build a browser-friendly URL for uploaded job documents (PDF, DOC, etc.)
 */
const buildDocumentDeliveryUrl = (result, originalName = '') => {
  const ext = extensionFromName(originalName) || result.format || '';

  if (result.resource_type === 'raw') {
    return result.secure_url;
  }

  // PDFs sometimes land as image resource — rebuild URL for inline viewing
  if (ext === 'pdf' || result.format === 'pdf') {
    return cloudinary.url(result.public_id, {
      resource_type: 'image',
      format: 'pdf',
      secure: true
    });
  }

  return result.secure_url;
};

/**
 * Upload file to Cloudinary
 */
const uploadToCloudinary = async (file, folder = 'uploads', options = {}) => {
  try {
    const resourceType = options.resource_type || resolveResourceType(file.mimetype);
    const ext = extensionFromName(file.originalname);

    const uploadOptions = {
      folder,
      resource_type: resourceType,
      access_mode: 'public',
      use_filename: true,
      unique_filename: true
    };

    if (resourceType === 'raw' && ext) {
      uploadOptions.format = ext;
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, uploadResult) => {
          if (error) reject(error);
          else resolve(uploadResult);
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
 * Upload job attachment (image or document) with correct Cloudinary resource type
 */
const uploadJobAttachment = async (file) => {
  const result = await uploadToCloudinary(file, 'skillkart/jobs/attachments');
  const isImage = file.mimetype?.startsWith(IMAGE_MIME_PREFIX);

  return {
    url: isImage ? result.secure_url : buildDocumentDeliveryUrl(result, file.originalname),
    originalName: file.originalname,
    mimeType: file.mimetype,
    resourceType: result.resource_type
  };
};

/**
 * Upload an external URL to Cloudinary (Mirroring)
 */
const uploadFromUrl = async (url, folder = 'uploads') => {
  try {
    const result = await cloudinary.uploader.upload(url, {
      folder,
      resource_type: 'auto'
    });
    return result;
  } catch (error) {
    console.error('Cloudinary mirror failed:', error);
    return null;
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
  uploadJobAttachment,
  uploadFromUrl,
  uploadProfilePicture,
  uploadCV,
  uploadPortfolioImage,
  deleteFromCloudinary,
  deleteFile,
  getUserFiles
};
