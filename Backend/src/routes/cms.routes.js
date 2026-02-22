const express = require('express');
const router = express.Router();
const cmsController = require('../controllers/cms.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validation.middleware');
const {
  createPageValidation,
  updatePageValidation,
  getPageValidation,
  deletePageValidation,
  listPagesValidation,
  publishPageValidation,
  schedulePublishValidation,
  restoreVersionValidation,
  searchContentValidation
} = require('../validators/cms.validator');

/**
 * Public routes
 */

// Get published page (public)
router.get('/public/:pageId',
  optionalAuth,
  getPageValidation,
  validate,
  cmsController.getPublicPage
);

// List all published pages
router.get('/public',
  optionalAuth,
  cmsController.listPublishedPages
);

// Search content (public)
router.get('/search',
  optionalAuth,
  searchContentValidation,
  validate,
  cmsController.searchContent
);

/**
 * Protected routes (Content Editors, Admins)
 */

// Create page
router.post('/',
  authenticate,
  requirePermission('cms:create'),
  createPageValidation,
  validate,
  cmsController.createPage
);

// List pages (admin view)
router.get('/',
  authenticate,
  requirePermission('cms:read'),
  listPagesValidation,
  validate,
  cmsController.getPage
);

// Get page for editing
router.get('/:pageId',
  authenticate,
  requirePermission('cms:read'),
  getPageValidation,
  validate,
  cmsController.getPage
);

// Update page
router.put('/:pageId',
  authenticate,
  requirePermission('cms:update'),
  updatePageValidation,
  validate,
  cmsController.updatePage
);

// Publish page
router.post('/:pageId/publish',
  authenticate,
  requirePermission('cms:publish'),
  publishPageValidation,
  validate,
  cmsController.publishPage
);

// Unpublish page
router.post('/:pageId/unpublish',
  authenticate,
  requirePermission('cms:publish'),
  cmsController.unpublishPage
);

// Schedule publish
router.post('/:pageId/schedule',
  authenticate,
  requirePermission('cms:publish'),
  schedulePublishValidation,
  validate,
  cmsController.schedulePublish
);

// Restore version
router.post('/:pageId/restore',
  authenticate,
  requirePermission('cms:update'),
  restoreVersionValidation,
  validate,
  cmsController.restoreVersion
);

// Export page as JSON
router.get('/:pageId/export',
  authenticate,
  requirePermission('cms:read'),
  cmsController.exportPage
);

// Delete page
router.delete('/:pageId',
  authenticate,
  requirePermission('cms:delete'),
  deletePageValidation,
  validate,
  cmsController.deletePage
);

module.exports = router;
