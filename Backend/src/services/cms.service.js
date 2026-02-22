const CMSContent = require('../models/CMSContent');
const { NotFoundError } = require('../utils/apiError');

/**
 * Create CMS page
 */
const createPage = async (pageData, userId) => {
  const page = new CMSContent({
    ...pageData,
    createdBy: userId,
    lastModifiedBy: userId,
    modificationHistory: [{
      modifiedBy: userId,
      modifiedAt: new Date(),
      changes: 'Page created',
      action: 'created'
    }]
  });

  await page.save();
  return page;
};

/**
 * Update CMS page
 */
const updatePage = async (pageId, updates, userId) => {
  const page = await CMSContent.findOne({ pageId });
  if (!page) throw new NotFoundError('Page not found');

  Object.assign(page, updates);
  page.lastModifiedBy = userId;
  
  page.modificationHistory.push({
    modifiedBy: userId,
    modifiedAt: new Date(),
    changes: 'Page updated',
    action: 'updated'
  });

  await page.save();
  return page;
};

/**
 * Publish page
 */
const publishPage = async (pageId, userId, comment = '') => {
  const page = await CMSContent.findOne({ pageId });
  if (!page) throw new NotFoundError('Page not found');

  await page.publish(userId, comment);
  return page;
};

/**
 * Unpublish page
 */
const unpublishPage = async (pageId, userId, comment = '') => {
  const page = await CMSContent.findOne({ pageId });
  if (!page) throw new NotFoundError('Page not found');

  await page.unpublish(userId, comment);
  return page;
};

/**
 * Get published page (public)
 */
const getPublicPage = async (pageId) => {
  const page = await CMSContent.getPublicContent(pageId);
  
  if (page) {
    await page.incrementViews(true);
  }
  
  return page;
};

/**
 * Get all published pages
 */
const getAllPublishedPages = async () => {
  return await CMSContent.getAllPublishedPages();
};

/**
 * Search content
 */
const searchContent = async (query, options = {}) => {
  return await CMSContent.searchContent(query, options);
};

/**
 * Schedule publish
 */
const schedulePublish = async (pageId, publishDate, userId) => {
  const page = await CMSContent.findOne({ pageId });
  if (!page) throw new NotFoundError('Page not found');

  await page.schedulePublish(publishDate, userId);
  return page;
};

/**
 * Process scheduled publications (cron job)
 */
const processScheduledPublications = async () => {
  return await CMSContent.publishScheduledContent();
};

/**
 * Restore version
 */
const restoreVersion = async (pageId, versionNumber, userId) => {
  const page = await CMSContent.findOne({ pageId });
  if (!page) throw new NotFoundError('Page not found');

  await page.restoreVersion(versionNumber, userId);
  return page;
};

/**
 * Delete page
 */
const deletePage = async (pageId) => {
  const result = await CMSContent.deleteOne({ pageId });
  if (result.deletedCount === 0) {
    throw new NotFoundError('Page not found');
  }
  return true;
};

/**
 * Get page with full details (admin)
 */
const getPageForEdit = async (pageId) => {
  const page = await CMSContent.findOne({ pageId })
    .populate('createdBy', 'firstName lastName email')
    .populate('lastModifiedBy', 'firstName lastName email');
    
  if (!page) throw new NotFoundError('Page not found');
  return page;
};

module.exports = {
  createPage,
  updatePage,
  publishPage,
  unpublishPage,
  getPublicPage,
  getAllPublishedPages,
  searchContent,
  schedulePublish,
  processScheduledPublications,
  restoreVersion,
  deletePage,
  getPageForEdit
};
