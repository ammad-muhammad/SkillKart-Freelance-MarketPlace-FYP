/**
 * Reusable upload helper for all file uploads in the platform.
 * Routes uploads through the backend which persists to Cloudinary.
 */
import client from '../api/client';

/**
 * Upload a profile avatar image.
 * @param {File} file - The image file to upload
 * @param {'freelancer'|'client'} role - The user role (determines API path)
 * @returns {Promise<string>} The Cloudinary URL of the uploaded image
 */
export const uploadAvatar = async (file, role = 'freelancer') => {
  const formData = new FormData();
  formData.append('avatar', file);

  const endpoint = role === 'client'
    ? '/clients/upload/avatar'
    : '/freelancers/profile/avatar';

  const { data } = await client.post(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

  return data.data.url;
};

/**
 * Upload a portfolio image.
 * @param {File} file - The image file to upload
 * @returns {Promise<string>} The Cloudinary URL
 */
export const uploadPortfolioImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);

  const { data } = await client.post('/freelancers/portfolio/media', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

  return data.data.url;
};

/**
 * Validate file before upload.
 * @param {File} file
 * @param {object} options
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateFile = (file, options = {}) => {
  const {
    maxSizeMB = 10,
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  } = options;

  if (!file) return { valid: false, error: 'No file selected' };

  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return { valid: false, error: `File size must be under ${maxSizeMB}MB` };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` };
  }

  return { valid: true };
};

/**
 * Upload a project/job attachment.
 * @param {File} file 
 * @returns {Promise<string>} The Cloudinary URL
 */
export const uploadJobAttachment = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await client.post('/jobs/upload/attachment', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

  return data.data.url;
};

/**
 * Upload a gig banner image.
 * @param {File} file - The image file to upload
 * @returns {Promise<string>} The Cloudinary URL
 */
export const uploadBanner = async (file) => {
  const formData = new FormData();
  formData.append('banner', file);

  const { data } = await client.post('/gigs/upload/banner', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

  return data.data.url;
};
