const mongoose = require('mongoose');

const fileUploadSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileName: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: String,
  size: Number,
  url: { type: String, required: true },
  cloudinaryId: String,
  fileType: { type: String, enum: ['cv', 'portfolio', 'document', 'image', 'other'] },
  isPublic: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('FileUpload', fileUploadSchema);