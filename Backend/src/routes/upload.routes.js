const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const { authenticate } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');

router.use(authenticate);

router.post('/', upload.single('file'), handleMulterError, uploadController.uploadFile);

router.get('/my', uploadController.getMyFiles);

router.delete('/:id', uploadController.deleteFile);

module.exports = router;
