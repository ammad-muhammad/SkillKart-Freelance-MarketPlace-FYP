const mongoose = require('mongoose');

const fileUploadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fileType: {
      type: String,
      enum: ['resume', 'portfolio', 'job-attachment', 'proposal-attachment', 'avatar'],
      required: true,
      index: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
      unique: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    cloudinaryPublicId: {
      type: String,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
fileUploadSchema.index({ userId: 1, fileType: 1 });
fileUploadSchema.index({ fileName: 1 });

module.exports = mongoose.model('FileUpload', fileUploadSchema);
