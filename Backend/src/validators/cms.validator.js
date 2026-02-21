const { body, query, param } = require('express-validator');
const { CMS_STATUS, CMS_PAGE_TYPES, CMS_SECTION_TYPES } = require('../utils/constants');

/**
 * Validation rules for CMS content endpoints
 */

// Create CMS page validation
const createPageValidation = [
  body('pageId')
    .trim()
    .notEmpty().withMessage('Page ID is required')
    .matches(/^[a-z0-9-]+$/).withMessage('Page ID must contain only lowercase letters, numbers, and hyphens')
    .isLength({ min: 2, max: 50 }).withMessage('Page ID must be 2-50 characters'),

  body('pageName')
    .trim()
    .notEmpty().withMessage('Page name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Page name must be 2-100 characters'),

  body('pageType')
    .optional()
    .isIn(Object.values(CMS_PAGE_TYPES))
    .withMessage('Invalid page type'),

  body('content')
    .optional()
    .isObject().withMessage('Content must be an object'),

  body('content.hero')
    .optional()
    .isObject().withMessage('Hero must be an object'),

  body('content.hero.title')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Hero title too long'),

  body('content.hero.subtitle')
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage('Hero subtitle too long'),

  body('content.hero.backgroundImage')
    .optional()
    .isURL().withMessage('Invalid background image URL'),

  body('content.sections')
    .optional()
    .isArray().withMessage('Sections must be an array'),

  body('content.sections.*.sectionType')
    .optional()
    .isIn(Object.values(CMS_SECTION_TYPES))
    .withMessage('Invalid section type'),

  body('content.seo.metaTitle')
    .optional()
    .trim()
    .isLength({ max: 60 }).withMessage('Meta title should not exceed 60 characters'),

  body('content.seo.metaDescription')
    .optional()
    .trim()
    .isLength({ max: 160 }).withMessage('Meta description should not exceed 160 characters'),

  body('isPublic')
    .optional()
    .isBoolean().withMessage('isPublic must be a boolean')
];

// Update CMS page validation
const updatePageValidation = [
  param('pageId')
    .trim()
    .notEmpty().withMessage('Page ID is required'),

  body('pageName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Page name must be 2-100 characters'),

  body('pageType')
    .optional()
    .isIn(Object.values(CMS_PAGE_TYPES))
    .withMessage('Invalid page type'),

  body('content')
    .optional()
    .isObject().withMessage('Content must be an object'),

  body('isPublic')
    .optional()
    .isBoolean().withMessage('isPublic must be a boolean')
];

// Get page validation
const getPageValidation = [
  param('pageId')
    .trim()
    .notEmpty().withMessage('Page ID is required')
];

// Delete page validation
const deletePageValidation = [
  param('pageId')
    .trim()
    .notEmpty().withMessage('Page ID is required')
];

// List pages validation
const listPagesValidation = [
  query('status')
    .optional()
    .isIn(Object.values(CMS_STATUS))
    .withMessage('Invalid status filter'),

  query('pageType')
    .optional()
    .isIn(Object.values(CMS_PAGE_TYPES))
    .withMessage('Invalid page type filter'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'pageName', 'publishedAt', 'viewCount'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

// Publish page validation
const publishPageValidation = [
  param('pageId')
    .trim()
    .notEmpty().withMessage('Page ID is required'),

  body('comment')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Comment must not exceed 500 characters')
];

// Unpublish page validation
const unpublishPageValidation = [
  param('pageId')
    .trim()
    .notEmpty().withMessage('Page ID is required'),

  body('comment')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Comment must not exceed 500 characters')
];

// Archive page validation
const archivePageValidation = [
  param('pageId')
    .trim()
    .notEmpty().withMessage('Page ID is required'),

  body('comment')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Comment must not exceed 500 characters')
];

// Schedule publish validation
const schedulePublishValidation = [
  param('pageId')
    .trim()
    .notEmpty().withMessage('Page ID is required'),

  body('publishDate')
    .notEmpty().withMessage('Publish date is required')
    .isISO8601().withMessage('Invalid date format')
    .custom((value) => {
      const publishDate = new Date(value);
      const now = new Date();
      if (publishDate <= now) {
        throw new Error('Publish date must be in the future');
      }
      return true;
    })
];

// Restore version validation
const restoreVersionValidation = [
  param('pageId')
    .trim()
    .notEmpty().withMessage('Page ID is required'),

  body('versionNumber')
    .notEmpty().withMessage('Version number is required')
    .isInt({ min: 1 }).withMessage('Version number must be a positive integer')
];

// Add comment validation
const addCommentValidation = [
  param('pageId')
    .trim()
    .notEmpty().withMessage('Page ID is required'),

  body('comment')
    .trim()
    .notEmpty().withMessage('Comment is required')
    .isLength({ min: 1, max: 1000 }).withMessage('Comment must be 1-1000 characters')
];

// Resolve comment validation
const resolveCommentValidation = [
  param('pageId')
    .trim()
    .notEmpty().withMessage('Page ID is required'),

  param('commentId')
    .notEmpty().withMessage('Comment ID is required')
    .isMongoId().withMessage('Invalid comment ID')
];

// Search content validation
const searchContentValidation = [
  query('q')
    .trim()
    .notEmpty().withMessage('Search query is required')
    .isLength({ min: 2, max: 100 }).withMessage('Search query must be 2-100 characters'),

  query('status')
    .optional()
    .isIn(Object.values(CMS_STATUS))
    .withMessage('Invalid status filter'),

  query('pageType')
    .optional()
    .isIn(Object.values(CMS_PAGE_TYPES))
    .withMessage('Invalid page type filter'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
];

// Update SEO validation
const updateSEOValidation = [
  param('pageId')
    .trim()
    .notEmpty().withMessage('Page ID is required'),

  body('metaTitle')
    .optional()
    .trim()
    .isLength({ max: 60 }).withMessage('Meta title should not exceed 60 characters'),

  body('metaDescription')
    .optional()
    .trim()
    .isLength({ max: 160 }).withMessage('Meta description should not exceed 160 characters'),

  body('metaKeywords')
    .optional()
    .isArray().withMessage('Meta keywords must be an array'),

  body('metaKeywords.*')
    .trim()
    .isLength({ max: 50 }).withMessage('Each keyword must not exceed 50 characters'),

  body('ogImage')
    .optional()
    .isURL().withMessage('Invalid OG image URL'),

  body('ogTitle')
    .optional()
    .trim()
    .isLength({ max: 60 }).withMessage('OG title too long'),

  body('ogDescription')
    .optional()
    .trim()
    .isLength({ max: 160 }).withMessage('OG description too long'),

  body('canonicalUrl')
    .optional()
    .isURL().withMessage('Invalid canonical URL')
];

// Add section validation
const addSectionValidation = [
  param('pageId')
    .trim()
    .notEmpty().withMessage('Page ID is required'),

  body('sectionType')
    .notEmpty().withMessage('Section type is required')
    .isIn(Object.values(CMS_SECTION_TYPES))
    .withMessage('Invalid section type'),

  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Section title too long'),

  body('order')
    .optional()
    .isInt({ min: 0 }).withMessage('Order must be a non-negative integer'),

  body('isVisible')
    .optional()
    .isBoolean().withMessage('isVisible must be a boolean'),

  body('content')
    .optional()
    .isObject().withMessage('Content must be an object')
];

// Update section validation
const updateSectionValidation = [
  param('pageId')
    .trim()
    .notEmpty().withMessage('Page ID is required'),

  param('sectionId')
    .trim()
    .notEmpty().withMessage('Section ID is required'),

  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Section title too long'),

  body('order')
    .optional()
    .isInt({ min: 0 }).withMessage('Order must be a non-negative integer'),

  body('isVisible')
    .optional()
    .isBoolean().withMessage('isVisible must be a boolean')
];

// Delete section validation
const deleteSectionValidation = [
  param('pageId')
    .trim()
    .notEmpty().withMessage('Page ID is required'),

  param('sectionId')
    .trim()
    .notEmpty().withMessage('Section ID is required')
];

// Clone page validation
const clonePageValidation = [
  param('pageId')
    .trim()
    .notEmpty().withMessage('Page ID is required'),

  body('newPageId')
    .trim()
    .notEmpty().withMessage('New page ID is required')
    .matches(/^[a-z0-9-]+$/).withMessage('New page ID must contain only lowercase letters, numbers, and hyphens'),

  body('newPageName')
    .trim()
    .notEmpty().withMessage('New page name is required')
    .isLength({ min: 2, max: 100 }).withMessage('New page name must be 2-100 characters')
];

module.exports = {
  createPageValidation,
  updatePageValidation,
  getPageValidation,
  deletePageValidation,
  listPagesValidation,
  publishPageValidation,
  unpublishPageValidation,
  archivePageValidation,
  schedulePublishValidation,
  restoreVersionValidation,
  addCommentValidation,
  resolveCommentValidation,
  searchContentValidation,
  updateSEOValidation,
  addSectionValidation,
  updateSectionValidation,
  deleteSectionValidation,
  clonePageValidation
};
