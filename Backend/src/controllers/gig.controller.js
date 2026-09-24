const Gig = require('../models/Gig');
const Job = require('../models/Job');
const { sendSuccess, sendCreated, sendPaginated, sendError } = require('../utils/apiResponse');
const { asyncHandler, parsePagination } = require('../utils/helpers');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/apiError');
const cloudinaryService = require('../services/upload.service');
const { checkSkillGate } = require('../utils/skillGating');
const notifications = require('../services/notification.service');
const { buildRequirements, createGigOrderJob, cancelUnpaidGigOrder } = require('../services/gigOrder.service');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Only content fields are ever taken from the body at creation — `stats`
// (views/orders/rating rollups) is never client-settable, same rule as
// createJob's CREATABLE_JOB_FIELDS whitelist.
const CREATABLE_GIG_FIELDS = ['title', 'shortDescription', 'fullDescription', 'category', 'subcategory', 'skills', 'pricing', 'media', 'faqs'];
const GIG_CREATE_STATUSES = ['draft', 'active'];

// An untouched optional tier (Standard/Premium) arrives from the form as
// {price: '', deliveryTime: '', revisions: ''} rather than being omitted.
// Strip it entirely rather than let Mongoose's Number caster turn '' into a
// real 0 — that would create a phantom free tier instead of no tier at all.
const sanitizeOptionalPricingTiers = (pricing) => {
  if (!pricing || typeof pricing !== 'object') return pricing;
  const cleaned = { ...pricing };
  for (const tier of ['standard', 'premium']) {
    if (cleaned[tier] && !Number(cleaned[tier].price)) {
      delete cleaned[tier];
    }
  }
  return cleaned;
};

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

  const fields = {};
  for (const key of CREATABLE_GIG_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(gigData, key)) {
      fields[key] = gigData[key];
    }
  }
  if (fields.pricing) fields.pricing = sanitizeOptionalPricingTiers(fields.pricing);
  if (GIG_CREATE_STATUSES.includes(gigData.status)) {
    fields.status = gigData.status;
  }

  const gig = new Gig({
    ...fields,
    freelancerId
  });

  await gig.save();

  // Trigger background suggestion flow for unrecognized skills
  const taxonomy = require('../services/taxonomy.service');
  taxonomy.proposeUnrecognizedSkills(gigData.skills, gigData.category, 'gig_creation', gig._id);
  taxonomy.invalidateCache();

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

  // Only content + status fields are editable — freelancerId (ownership) and
  // stats (views/orders/rating rollups) are never client-settable.
  const UPDATABLE_GIG_FIELDS = [...CREATABLE_GIG_FIELDS, 'status'];
  for (const key of UPDATABLE_GIG_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      gig[key] = key === 'pricing' ? sanitizeOptionalPricingTiers(updates[key]) : updates[key];
    }
  }
  await gig.save();

  // Trigger background suggestion flow for unrecognized skills
  const taxonomy = require('../services/taxonomy.service');
  taxonomy.proposeUnrecognizedSkills(gig.skills, gig.category, 'gig_creation', gig._id);
  taxonomy.invalidateCache();
  
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
  // Graph-aware taxonomy expansion (search across all taxonomy fields for safety)
  const applyTaxonomyFilter = async (term) => {
    const expanded = await require('../services/taxonomy.service').expandSearchTerms(term);
    const terms = expanded.length ? expanded : [term];
    if (!query.$and) query.$and = [];
    query.$and.push({
      $or: [
        { category: { $in: terms } },
        { subcategory: { $in: terms } },
        { skills: { $in: terms } }
      ]
    });
  };

  if (category) await applyTaxonomyFilter(category);
  if (subcategory) await applyTaxonomyFilter(subcategory);
  if (skill) await applyTaxonomyFilter(skill);
  if (q) {
    const { buildGraphSearchQuery } = require('../services/search.service');
    const graphSearch = await buildGraphSearchQuery(q, ['skills', 'category', 'subcategory']);
    if (graphSearch.$or) {
      // Merge with potential existing query parameters using $and
      const textRx = new RegExp(escapeRegex(q), 'i');
      const standardClause = {
        $or: [
          { title: textRx },
          { shortDescription: textRx },
          ...graphSearch.$or
        ]
      };
      query.$and = query.$and ? [...query.$and, standardClause] : [standardClause];
    } else {
      const rx = new RegExp(escapeRegex(q), 'i');
      query.$or = [{ title: rx }, { shortDescription: rx }, { skills: rx }];
    }
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
    .populate('freelancerId', 'firstName lastName profilePicture rating freelancerProfile')
    .skip(skip)
    .limit(limit)
    .sort(sortSpec)
    .lean();

  if (gigs && gigs.length > 0) {
    const FreelancerProfile = require('../models/FreelancerProfile');
    const userIds = gigs.map(g => g.freelancerId?._id).filter(Boolean);
    const profiles = await FreelancerProfile.find({ userId: { $in: userIds } }).select('userId rating').lean();
    const ratingMap = {};
    profiles.forEach(p => ratingMap[p.userId.toString()] = p.rating || 0);

    gigs.forEach(g => {
      if (g.freelancerId) {
        g.freelancerId.rating = ratingMap[g.freelancerId._id.toString()] || 0;
      }
    });
  }

  sendPaginated(res, { data: gigs, page, limit, total });
});

/**
 * Get a single gig by id (public). Increments view count.
 */
const getGigById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const gig = await Gig.findById(id)
    .populate('freelancerId', 'firstName lastName profilePicture rating freelancerProfile');

  if (!gig) throw new NotFoundError('Gig not found');
  // Draft/paused gigs aren't meant to be publicly browsable — only the
  // owning freelancer (or an admin) may view one directly by id. 'active'
  // gigs (the only ones listGigs surfaces) stay open to anyone.
  if (gig.status !== 'active') {
    const isOwner = req.user && String(gig.freelancerId?._id || gig.freelancerId) === String(req.user._id);
    const isAdmin = req.user && ['admin', 'superadmin'].includes(req.user.role);
    if (!isOwner && !isAdmin) {
      throw new NotFoundError('Gig not found');
    }
  }

  // best-effort view increment (don't block the response)
  Gig.updateOne({ _id: id }, { $inc: { 'stats.views': 1 } }).catch(() => {});

  const responseData = gig.toObject();
  
  if (responseData.freelancerId) {
    const FreelancerProfile = require('../models/FreelancerProfile');
    const profile = await FreelancerProfile.findOne({ userId: responseData.freelancerId._id }).select('rating').lean();
    responseData.freelancerId.rating = profile ? (profile.rating || 0) : 0;
  }

  sendSuccess(res, { message: 'Gig retrieved', data: { gig: responseData } });
});

/**
 * Order a gig (client buys a pricing tier).
 * Creates a Job linked to the gig (source='gig') in 'pending_payment', carrying
 * the client's requirements (what they actually want built — mandatory, see
 * validators/gigOrder.validator.js). The client then funds the 50% deposit via
 * the existing payment flow; only then does the order go 'in-progress' and
 * reach the freelancer (gigOrder.service.js's activateGigOrder).
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

  const requirements = buildRequirements(req.body.requirements);
  if (!requirements?.description) {
    throw new BadRequestError('Tell the freelancer what you need before placing the order');
  }

  // An unpaid order for this exact package is resumed instead of duplicated —
  // covers a double-click as well as coming back after abandoning checkout.
  // The latest requirements win. If the freelancer has repriced the package
  // since, the stale order is cancelled instead (its escrow row may already
  // be priced at the old amount) and a fresh one is created below.
  const unpaid = await Job.findOne({
    clientId: req.user._id,
    gigId: gig._id,
    gigTier: tier,
    status: 'pending_payment',
  }).sort({ createdAt: -1 });
  if (unpaid && Number(unpaid.budget?.min) === price) {
    unpaid.requirements = requirements;
    await unpaid.save();
    return sendCreated(res, 'Order updated. Fund the deposit to start the work.', { order: unpaid, resumed: true });
  }
  if (unpaid) {
    await cancelUnpaidGigOrder(unpaid, req.user._id);
  }

  const order = await createGigOrderJob({
    clientId: req.user._id,
    freelancerId: gig.freelancerId,
    title: `${gig.title} — ${tier.charAt(0).toUpperCase() + tier.slice(1)} package`,
    description: gig.fullDescription || gig.shortDescription || gig.title,
    price,
    duration: tierData.deliveryTime,
    skills: gig.skills,
    category: gig.category,
    subcategory: gig.subcategory,
    gigId: gig._id,
    gigTier: tier,
    requirements,
  });

  // Gig stats + the freelancer's "new order" notification happen when the
  // deposit lands (activateGigOrder), not here.
  sendCreated(res, 'Order created. Fund the deposit to start the work.', { order });
});

/**
 * Cancel a gig order the client hasn't paid for yet (POST /gigs/orders/:jobId/cancel).
 */
const cancelGigOrder = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.jobId);
  if (!job) throw new NotFoundError('Order not found');

  const cancelled = await cancelUnpaidGigOrder(job, req.user._id);

  // A custom-offer order was already announced to the freelancer when the
  // offer was accepted — tell them it's off. A package order never reached
  // them (that only happens once the deposit is paid), so stay quiet.
  if (cancelled.customOfferId && cancelled.hiredFreelancer) {
    notifications.onGigOrderCancelled(cancelled.hiredFreelancer, { job: cancelled });
  }

  sendSuccess(res, { message: 'Order cancelled. You were not charged.', data: { order: cancelled } });
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

  // Active-order counts so the UI can block deleting a gig mid-delivery.
  const gigIds = gigs.map((g) => g._id);
  const activeCounts = await Job.aggregate([
    { $match: { gigId: { $in: gigIds }, status: 'in-progress' } },
    { $group: { _id: '$gigId', count: { $sum: 1 } } },
  ]);
  const activeByGig = new Map(activeCounts.map((c) => [String(c._id), c.count]));
  const data = gigs.map((g) => ({ ...g.toObject(), activeOrders: activeByGig.get(String(g._id)) || 0 }));

  sendPaginated(res, { data, page, limit, total });
});

/**
 * Delete Gig
 */
const deleteGig = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const gig = await Gig.findOne({ _id: id, freelancerId: req.user._id });

  if (!gig) {
    throw new NotFoundError('Gig not found or unauthorized');
  }

  // Don't let a gig with an active order be deleted out from under a client
  // mid-delivery — the order's `gigId` would be left dangling.
  const activeOrder = await Job.findOne({ gigId: id, status: 'in-progress' }).select('_id');
  if (activeOrder) {
    throw new BadRequestError('This gig has an active order and cannot be deleted until it is completed or cancelled.');
  }

  // Unpaid orders for this gig can't go ahead once it's gone — cancel them
  // (nothing was charged) rather than leave the client a Pay button for a
  // gig that no longer exists.
  await Job.updateMany(
    { gigId: id, status: 'pending_payment' },
    { $set: { status: 'cancelled', cancelledBeforePayment: true } }
  );

  await gig.deleteOne();

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
  cancelGigOrder,
  listMyGigs,
  deleteGig,
  toggleStatus,
  uploadBanner
};
