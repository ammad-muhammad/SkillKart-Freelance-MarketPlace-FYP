const cloudinary = require('../config/cloudinary');
const FileUpload = require('../models/FileUpload');
const ApiError = require('../utils/ApiError');
const { v4: uuidv4 } = require('uuid');

class UploadService {
  /**
   * Upload file to Cloudinary
   */
  async uploadFile(file, userId, fileType) {
    try {
      const fileName = `${uuidv4()}-${file.originalname}`;
      const folder = `skillkart/${fileType}`;

      // Upload to Cloudinary using buffer
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'auto',
            public_id: fileName,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        uploadStream.end(file.buffer);
      });

      // Save file metadata to database
      const fileUpload = await FileUpload.create({
        userId,
        fileType,
        originalName: file.originalname,
        fileName,
        mimeType: file.mimetype,
        fileSize: file.size,
        url: result.secure_url,
        cloudinaryPublicId: result.public_id,
      });

      return fileUpload;
    } catch (error) {
      throw new ApiError(500, `File upload failed: ${error.message}`);
    }
  }

  /**
   * Delete file from Cloudinary
   */
  async deleteFile(fileId, userId) {
    const file = await FileUpload.findOne({ _id: fileId, userId });

    if (!file) {
      throw new ApiError(404, 'File not found');
    }

    try {
      // Delete from Cloudinary
      await cloudinary.uploader.destroy(file.cloudinaryPublicId);

      // Mark as deleted in database
      file.isDeleted = true;
      await file.save();

      return { message: 'File deleted successfully' };
    } catch (error) {
      throw new ApiError(500, `File deletion failed: ${error.message}`);
    }
  }

  /**
   * Get user files
   */
  async getUserFiles(userId, fileType = null) {
    const query = { userId, isDeleted: false };

    if (fileType) {
      query.fileType = fileType;
    }

    const files = await FileUpload.find(query).sort({ createdAt: -1 });

    return files;
  }
}

module.exports = new UploadService();
