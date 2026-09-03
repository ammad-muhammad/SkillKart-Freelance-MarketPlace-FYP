const multer = require('multer');
const path = require('path');
const { FileUploadError } = require('../utils/apiError');
const { matchesExtension } = require('../utils/fileSignature');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExts = ['.jpeg', '.jpg', '.png', '.webp', '.pdf', '.doc', '.docx', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  if (allowedExts.includes(ext) && allowedMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  }
  cb(new FileUploadError('Invalid file type. Only PDF, DOC, DOCX, TXT, and images are allowed.'));
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter
});

// Multer's fileFilter only sees metadata (name/mimetype), not the actual
// bytes — both are trivially spoofable. Once memoryStorage has buffered the
// file, verify its real magic bytes match the extension it claims to be.
const verifyFileSignature = (req, res, next) => {
  const files = req.files
    ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat())
    : (req.file ? [req.file] : []);

  for (const file of files) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!matchesExtension(file.buffer, ext)) {
      return next(new FileUploadError('File content does not match its extension.'));
    }
  }

  next();
};

const uploadSingle = (fieldName) => [upload.single(fieldName), verifyFileSignature];
const uploadMultiple = (fieldName, maxCount = 5) => [upload.array(fieldName, maxCount), verifyFileSignature];
const uploadFields = (fields) => [upload.fields(fields), verifyFileSignature];

module.exports = { upload, uploadSingle, uploadMultiple, uploadFields };
