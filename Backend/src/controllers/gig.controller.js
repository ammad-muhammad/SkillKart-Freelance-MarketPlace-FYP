const Gig = require('../models/Gig');
const { sendSuccess, sendCreated, sendPaginated } = require('../utils/apiResponse');
const { asyncHandler, parsePagination } = require('../utils/helpers');
const { NotFoundError } = require('../utils/apiError');
const cloudinaryService = require('../services/upload.service');

/**
 * Create Gig
 */
const createGig = asyncHandler(async (req, res) => {
  const gigData = req.body;
  const freelancerId = req.user._id;
  
  const gig = new Gig({
    ...gigData,
    freelancerId
  });
  
  await gig.save();
  sendCreated(res, 'Gig created successfully', { gig });
});

/**
 * Update Gig
 */
const updateGig = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const gig = await Gig.findOne({ _id: id, freelancerId: req.user._id });
  if (!gig) {
    throw new NotFoundError('Gig not found or unauthorized');
  }
  
  Object.assign(gig, updates);
  await gig.save();
  
  sendSuccess(res, {
    message: 'Gig updated successfully',
    data: { gig }
  });
});

/**
 * List Gigs (with filters)
 */
const listGigs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { freelancerId, category, status } = req.query;
  
  const query = {};
  if (freelancerId) query.freelancerId = freelancerId;
  if (category) query.category = category;
  if (status) query.status = status;
  
  const total = await Gig.countDocuments(query);
  const gigs = await Gig.find(query)
    .populate('freelancerId', 'firstName lastName profilePicture')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });
  
  sendPaginated(res, { data: gigs, page, limit, total });
});

/**
 * List My Gigs (Freelancer Dashboard)
 */
const listMyGigs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const freelancerId = req.user._id;
  
  const query = { freelancerId };
  
  const total = await Gig.countDocuments(query);
  const gigs = await Gig.find(query)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });
  
  sendPaginated(res, { data: gigs, page, limit, total });
});

/**
 * Delete Gig
 */
const deleteGig = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const gig = await Gig.findOneAndDelete({ _id: id, freelancerId: req.user._id });
  
  if (!gig) {
    throw new NotFoundError('Gig not found or unauthorized');
  }
  
  sendSuccess(res, { message: 'Gig deleted successfully' });
});

/**
 * Toggle Gig Status
 */
const toggleStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const gig = await Gig.findOne({ _id: id, freelancerId: req.user._id });
  
  if (!gig) {
    throw new NotFoundError('Gig not found or unauthorized');
  }
  
  gig.status = gig.status === 'active' ? 'paused' : 'active';
  await gig.save();
  
  sendSuccess(res, {
    message: `Gig status updated to ${gig.status}`,
    data: { gig }
  });
});

/**
 * Upload Gig Banner
 */
const uploadBanner = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const result = await cloudinaryService.uploadFile(req.file.buffer, {
    folder: 'skillkart/gigs/banners'
  });

  sendSuccess(res, {
    message: 'Banner uploaded successfully',
    data: { url: result.secure_url }
  });
});

module.exports = {
  createGig,
  updateGig,
  listGigs,
  listMyGigs,
  deleteGig,
  toggleStatus,
  uploadBanner
};
