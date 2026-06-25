const Gig = require('../models/Gig');
const Job = require('../models/Job');
const { sendSuccess, sendCreated, sendPaginated, sendError } = require('../utils/apiResponse');
const { asyncHandler, parsePagination } = require('../utils/helpers');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/apiError');
const cloudinaryService = require('../services/upload.service');
const { checkSkillGate } = require('../utils/skillGating');
const notifications = require('../services/notification.service');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Create Gig.
 * Skill-gated: the freelancer must have passed (verified) at least one skill
 * matching the gig's required skills / category before they can offer it.
 */
const createGig = asyncHandler(async (req, res) => {
  const gigData = req.body;
  const freelancerId = req.user._id;

  const gate = await checkSkillGate(freelancerId, gigData.skills, gigData.category);
  if (!gate.allowed) {
    return sendError(res, {
      statusCode: 403,
      message: 'You need to pass the skill test for this gig’s skills before you can publish it. Verify at least one of the required skills to continue.',
      errors: {
        skillTestRequired: true,
        requiredSkills: gigData.skills || [],
        category: gigData.category || '',
        verifiedSkills: gate.verifiedSkills,
      },
    });
  }

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

  // Skill-gate edits too — otherwise a freelancer could create a gig with a
  // verified skill, then edit in unverified skills/category, defeating the gate.
  const nextSkills = updates.skills !== undefined ? updates.skills : gig.skills;
  const nextCategory = updates.category !== undefined ? updates.category : gig.category;
  const gate = await checkSkillGate(req.user._id, nextSkills, nextCategory);
  if (!gate.allowed) {
    return sendError(res, {
      statusCode: 403,
      message: 'You need to pass the skill test for this gig’s skills before saving these changes.',
      errors: { skillTestRequired: true, requiredSkills: nextSkills || [], category: nextCategory || '', verifiedSkills: gate.verifiedSkills },
    });
  }

  Object.assign(gig, updates);
  await gig.save();
  
  sendSuccess(res, {
    message: 'Gig updated successfully',
    data: { gig }
  });
});

/**
 * List Gigs (with filters). Public: defaults to active gigs only.
 * Supports: category, subcategory, skill, search (q), price range, rating,
 * sort (newest|price_asc|price_desc|rating), plus owner/status overrides.
 */
const listGigs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { freelancerId, category, subcategory, skill, q, minPrice, maxPrice, minRating, sort, status } = req.query;

  const query = {};
  if (freelancerId) {
    query.freelancerId = freelancerId;
    if (status) query.status = status; // owner can view own drafts/paused
  } else {
    // Public listing only shows active gigs.
    query.status = status || 'active';
  }
  if (category) query.category = category;
  if (subcategory) query.subcategory = subcategory;
  if (skill) query.skills = { $in: [new RegExp(`^${escapeRegex(skill)}$`, 'i')] };
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    query.$or = [{ title: rx }, { shortDescription: rx }, { skills: rx }];
  }
  if (minPrice || maxPrice) {
    query['pricing.basic.price'] = {};
    if (minPrice) query['pricing.basic.price'].$gte = Number(minPrice);
    if (maxPrice) query['pricing.basic.price'].$lte = Number(maxPrice);
  }
  if (minRating) query['stats.rating'] = { $gte: Number(minRating) };

  let sortSpec = { createdAt: -1 };
  if (sort === 'price_asc') sortSpec = { 'pricing.basic.price': 1 };
  else if (sort === 'price_desc') sortSpec = { 'pricing.basic.price': -1 };
  else if (sort === 'rating') sortSpec = { 'stats.rating': -1, 'stats.reviewsCount': -1 };

  const total = await Gig.countDocuments(query);
  const gigs = await Gig.find(query)
    .populate('freelancerId', 'firstName lastName profilePicture rating')
    .skip(skip)
    .limit(limit)
    .sort(sortSpec);

  sendPaginated(res, { data: gigs, page, limit, total });
});

/**
 * Get a single gig by id (public). Increments view count.
 */
const getGigById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const gig = await Gig.findById(id)
    .populate('freelancerId', 'firstName lastName profilePicture rating');
  if (!gig) throw new NotFoundError('Gig not found');

  // best-effort view increment (don't block the response)
  Gig.updateOne({ _id: id }, { $inc: { 'stats.views': 1 } }).catch(() => {});

  sendSuccess(res, { message: 'Gig retrieved', data: { gig } });
});

/**
 * Order a gig (client buys a pricing tier).
 * Creates a Job linked to the gig (source='gig') that enters the SAME escrow +
 * delivery lifecycle as a hired project: hiredFreelancer = the gig owner,
 * clientId = the buyer, status = in-progress, budget = the chosen tier price.
 * The client then funds the 50% deposit via the existing payment flow.
 */
const createGigOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { tier = 'basic' } = req.body;

  if (!['basic', 'standard', 'premium'].includes(tier)) {
    throw new BadRequestError('Invalid pricing tier');
  }

  const gig = await Gig.findById(id);
  if (!gig) throw new NotFoundError('Gig not found');
  if (gig.status !== 'active') throw new BadRequestError('This gig is not available for ordering');
  if (String(gig.freelancerId) === String(req.user._id)) {
    throw new ForbiddenError('You cannot order your own gig');
  }

  const tierData = gig.pricing?.[tier];
  const price = Number(tierData?.price);
  if (!price || price <= 0) {
    throw new BadRequestError(`The "${tier}" package isn’t available for this gig`);
  }

  // Create the work item (a Job) representing this order.
  const order = await Job.create({
    title: `${gig.title} — ${tier.charAt(0).toUpperCase() + tier.slice(1)} package`,
    description: gig.fullDescription || gig.shortDescription || gig.title,
    clientId: req.user._id,
    hiredFreelancer: gig.freelancerId,
    budget: { min: price, max: price, type: 'fixed' },
    skills: Array.isArray(gig.skills) ? gig.skills : [],
    category: gig.category,
    subcategory: gig.subcategory,
    duration: tierData.deliveryTime || '',
    status: 'in-progress',
    source: 'gig',
    gigId: gig._id,
    gigTier: tier,
  });

  // Notify the freelancer (gig owner) of the new order.
  notifications.onGigOrdered(gig.freelancerId, { job: order, gigId: gig._id });

  sendCreated(res, 'Gig ordered successfully. Fund the deposit to start the work.', { order });
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

  const result = await cloudinaryService.uploadToCloudinary(req.file, 'skillkart/gigs/banners');

  sendSuccess(res, {
    message: 'Banner uploaded successfully',
    data: { 
      url: result.secure_url,
      public_id: result.public_id
    }
  });
});

module.exports = {
  createGig,
  updateGig,
  listGigs,
  getGigById,
  createGigOrder,
  listMyGigs,
  deleteGig,
  toggleStatus,
  uploadBanner
};
