const cmsService = require('../services/cms.service');
const { sendSuccess, sendCreated, sendNotFound, sendPaginated } = require('../utils/apiResponse');
const { asyncHandler, parsePagination } = require('../utils/helpers');

/**
 * Create CMS page
 */
const createPage = asyncHandler(async (req, res) => {
  const pageData = req.body;
  const userId = req.user._id;
  
  const page = await cmsService.createPage(pageData, userId);
  
  sendCreated(res, 'Page created successfully', { page });
});

/**
 * Update CMS page
 */
const updatePage = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const updates = req.body;
  const userId = req.user._id;
  
  const page = await cmsService.updatePage(pageId, updates, userId);
  
  sendSuccess(res, {
    message: 'Page updated successfully',
    data: { page }
  });
});

/**
 * Get page (admin view)
 */
const getPage = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  
  const page = await cmsService.getPageForEdit(pageId);
  
  sendSuccess(res, {
    message: 'Page retrieved successfully',
    data: { page }
  });
});

/**
 * Get public page
 */
const getPublicPage = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  
  const page = await cmsService.getPublicPage(pageId);
  
  if (!page) {
    throw new NotFoundError('Page not found');
  }
  
  sendSuccess(res, {
    message: 'Page retrieved successfully',
    data: { page: page.toPublicJSON() }
  });
});

/**
 * List all published pages
 */
const listPublishedPages = asyncHandler(async (req, res) => {
  const pages = await cmsService.getAllPublishedPages();
  
  sendSuccess(res, {
    message: 'Pages retrieved successfully',
    data: { pages }
  });
});

/**
 * Publish page
 */
const publishPage = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const { comment } = req.body;
  const userId = req.user._id;
  
  const page = await cmsService.publishPage(pageId, userId, comment);
  
  sendSuccess(res, {
    message: 'Page published successfully',
    data: { page }
  });
});

/**
 * Unpublish page
 */
const unpublishPage = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const { comment } = req.body;
  const userId = req.user._id;
  
  const page = await cmsService.unpublishPage(pageId, userId, comment);
  
  sendSuccess(res, {
    message: 'Page unpublished successfully',
    data: { page }
  });
});

/**
 * Schedule publish
 */
const schedulePublish = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const { publishDate } = req.body;
  const userId = req.user._id;
  
  const page = await cmsService.schedulePublish(pageId, new Date(publishDate), userId);
  
  sendSuccess(res, {
    message: 'Page scheduled for publishing',
    data: { page }
  });
});

/**
 * Delete page
 */
const deletePage = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  
  await cmsService.deletePage(pageId);
  
  sendSuccess(res, {
    message: 'Page deleted successfully'
  });
});

/**
 * Search content
 */
const searchContent = asyncHandler(async (req, res) => {
  const { q, status, pageType, page = 1, limit = 10 } = req.query;
  
  const results = await cmsService.searchContent(q, {
    status,
    pageType,
    page: parseInt(page),
    limit: parseInt(limit)
  });
  
  sendSuccess(res, {
    message: 'Search completed',
    data: { results }
  });
});

/**
 * Restore version
 */
const restoreVersion = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const { versionNumber } = req.body;
  const userId = req.user._id;
  
  const page = await cmsService.restoreVersion(pageId, versionNumber, userId);
  
  sendSuccess(res, {
    message: 'Version restored successfully',
    data: { page }
  });
});

/**
 * Export page as JSON
 */
const exportPage = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  
  const page = await cmsService.getPublicPage(pageId);
  
  if (!page) {
    throw new NotFoundError('Page not found');
  }
  
  res.json(page.toPublicJSON());
});

module.exports = {
  createPage,
  updatePage,
  getPage,
  getPublicPage,
  listPublishedPages,
  publishPage,
  unpublishPage,
  schedulePublish,
  deletePage,
  searchContent,
  restoreVersion,
  exportPage
};
