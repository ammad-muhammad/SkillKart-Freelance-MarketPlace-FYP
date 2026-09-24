const CustomOffer = require('../models/CustomOffer');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Gig = require('../models/Gig');
const Job = require('../models/Job');
const User = require('../models/User');
const { sendSuccess, sendCreated } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/helpers');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/apiError');
const { stripHtml } = require('../utils/sanitizeInput');
const { containsContactInfo } = require('../utils/contactInfo');
const { buildRequirements, createGigOrderJob } = require('../services/gigOrder.service');
const notifications = require('../services/notification.service');

const OFFER_TTL_DAYS = 7;
const MAX_OPEN_OFFERS_PER_CHAT = 5;

const fullName = (u) => [u?.firstName, u?.lastName].filter(Boolean).join(' ');

/**
 * POST /offers — freelancer sends a custom offer inside an existing chat.
 * Only to a client they're already talking to (the chat must exist), which
 * is what makes "contact first, then order" the natural path to a custom
 * price instead of a suggestion.
 */
const createOffer = asyncHandler(async (req, res) => {
  const { conversationId, gigId, price, deliveryDays } = req.body;
  const revisions = req.body.revisions ?? 0;
  const freelancerId = req.user._id;

  const conversation = await Conversation.findOne({ _id: conversationId, participants: freelancerId });
  if (!conversation) throw new NotFoundError('Conversation not found');

  const clientId = conversation.participants.find((p) => String(p) !== String(freelancerId));
  const client = clientId ? await User.findById(clientId).select('role firstName lastName') : null;
  if (!client || client.role !== 'client') {
    throw new BadRequestError('Custom offers can only be sent to a client.');
  }

  let gig = null;
  if (gigId) {
    gig = await Gig.findOne({ _id: gigId, freelancerId }).select('_id title');
    if (!gig) throw new NotFoundError('Gig not found');
  }

  const title = stripHtml(req.body.title);
  const description = stripHtml(req.body.description);
  // Chat masks contact details after the fact; an offer is a binding
  // document the client accepts as-is, so it's rejected up front instead.
  if (containsContactInfo(title) || containsContactInfo(description)) {
    throw new BadRequestError('Offers can’t include email addresses or phone numbers — keep contact on SkillKart.');
  }

  const openOffers = await CustomOffer.countDocuments({
    conversationId, freelancerId, status: 'pending', expiresAt: { $gt: new Date() },
  });
  if (openOffers >= MAX_OPEN_OFFERS_PER_CHAT) {
    throw new BadRequestError(`You already have ${MAX_OPEN_OFFERS_PER_CHAT} open offers in this chat — withdraw one first.`);
  }

  const offer = await CustomOffer.create({
    freelancerId,
    clientId: client._id,
    conversationId,
    gigId: gig?._id,
    title,
    description,
    price,
    deliveryDays,
    revisions,
    expiresAt: new Date(Date.now() + OFFER_TTL_DAYS * 24 * 60 * 60 * 1000),
  });

  const message = await Message.create({
    conversationId,
    sender: freelancerId,
    content: `📦 Custom offer: ${title} — Rs. ${price}`,
    type: 'custom_offer',
    customOfferId: offer._id,
  });
  offer.messageId = message._id;
  await offer.save();

  conversation.lastMessage = message._id;
  const unread = conversation.unreadCount.get(String(client._id)) || 0;
  conversation.unreadCount.set(String(client._id), unread + 1);
  await conversation.save();

  notifications.onCustomOfferReceived(client._id, { offer, freelancerName: fullName(req.user) });

  sendCreated(res, 'Custom offer sent', { offer, message });
});

/**
 * POST /offers/:id/accept — client accepts. Creates the order
 * ('pending_payment') at the offer's price; the client then funds the 50%
 * deposit through the same payment flow as a package order.
 * Body: { requirements?: { description, referenceLinks } } — optional notes.
 */
const acceptOffer = asyncHandler(async (req, res) => {
  const offer = await CustomOffer.findById(req.params.id);
  if (!offer) throw new NotFoundError('Offer not found');
  if (String(offer.clientId) !== String(req.user._id)) {
    throw new ForbiddenError('Only the client this offer was sent to can accept it');
  }
  if (offer.status === 'pending' && offer.expiresAt <= new Date()) {
    await CustomOffer.updateOne({ _id: offer._id, status: 'pending' }, { $set: { status: 'expired' } });
    throw new BadRequestError('This offer has expired. Ask the freelancer to send a new one.');
  }

  const requirements = buildRequirements(req.body.requirements);

  // Atomic claim — a double-click must never create two orders.
  const claimed = await CustomOffer.findOneAndUpdate(
    { _id: offer._id, status: 'pending', expiresAt: { $gt: new Date() } },
    { $set: { status: 'accepted', respondedAt: new Date() } },
    { new: true }
  );
  if (!claimed) {
    const current = await CustomOffer.findById(offer._id);
    if (current?.status === 'accepted' && current.jobId) {
      const order = await Job.findById(current.jobId);
      return sendSuccess(res, { message: 'Offer already accepted', data: { offer: current, order } });
    }
    throw new BadRequestError(`This offer is no longer open (${current?.status || 'unknown'}).`);
  }

  const gig = claimed.gigId
    ? await Gig.findById(claimed.gigId).select('skills category subcategory')
    : null;

  let order;
  try {
    order = await createGigOrderJob({
      clientId: claimed.clientId,
      freelancerId: claimed.freelancerId,
      title: claimed.title,
      description: claimed.description,
      price: claimed.price,
      // Same free-text shape as a gig tier's deliveryTime ("2 days").
      duration: `${claimed.deliveryDays} day${claimed.deliveryDays === 1 ? '' : 's'}`,
      skills: gig?.skills,
      category: gig?.category,
      subcategory: gig?.subcategory,
      gigId: gig?._id,
      customOfferId: claimed._id,
      requirements,
    });
  } catch (err) {
    // No transactions in this codebase — undo the claim so the offer can
    // still be accepted once whatever failed is fixed.
    await CustomOffer.updateOne({ _id: claimed._id }, { $set: { status: 'pending' }, $unset: { respondedAt: 1 } });
    throw err;
  }

  claimed.jobId = order._id;
  await claimed.save();

  notifications.onCustomOfferAccepted(claimed.freelancerId, { offer: claimed, job: order });

  sendSuccess(res, { message: 'Offer accepted. Fund the deposit to start the work.', data: { offer: claimed, order } });
});

// Shared by decline (client) and withdraw (freelancer): a pending offer's
// own party closes it.
async function closePendingOffer(req, { party, status }) {
  const offer = await CustomOffer.findById(req.params.id);
  if (!offer) throw new NotFoundError('Offer not found');
  const ownerId = party === 'client' ? offer.clientId : offer.freelancerId;
  if (String(ownerId) !== String(req.user._id)) {
    throw new ForbiddenError(party === 'client'
      ? 'Only the client this offer was sent to can decline it'
      : 'Only the freelancer who sent this offer can withdraw it');
  }
  const closed = await CustomOffer.findOneAndUpdate(
    { _id: offer._id, status: 'pending' },
    { $set: { status, respondedAt: new Date() } },
    { new: true }
  );
  if (!closed) throw new BadRequestError(`This offer is no longer open (${offer.status}).`);
  return closed;
}

/** POST /offers/:id/decline — client declines. */
const declineOffer = asyncHandler(async (req, res) => {
  const offer = await closePendingOffer(req, { party: 'client', status: 'declined' });
  notifications.onCustomOfferDeclined(offer.freelancerId, { offer });
  sendSuccess(res, { message: 'Offer declined', data: { offer } });
});

/** POST /offers/:id/withdraw — freelancer takes back an offer not yet answered. */
const withdrawOffer = asyncHandler(async (req, res) => {
  const offer = await closePendingOffer(req, { party: 'freelancer', status: 'withdrawn' });
  sendSuccess(res, { message: 'Offer withdrawn', data: { offer } });
});

module.exports = {
  createOffer,
  acceptOffer,
  declineOffer,
  withdrawOffer,
};
