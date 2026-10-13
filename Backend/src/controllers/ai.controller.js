const { sendSuccess, sendError } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/helpers');
const { BadRequestError } = require('../utils/apiError');
const { getAIProvider } = require('../services/ai');

// Per-IP guest message cap for Buddy AI. Logged-in users are exempt. Keeps a
// rolling 24h window in memory (sufficient for the demo; swap to Redis for HA).
const GUEST_BUDDY_LIMIT = 3;
const GUEST_WINDOW_MS = 24 * 60 * 60 * 1000;
const guestBuddyHits = new Map(); // ip -> { count, resetAt }

const checkGuestBuddyQuota = (ip) => {
  const now = Date.now();
  let rec = guestBuddyHits.get(ip);
  if (!rec || now > rec.resetAt) {
    rec = { count: 0, resetAt: now + GUEST_WINDOW_MS };
    guestBuddyHits.set(ip, rec);
  }
  return rec;
};

/**
 * POST /ai/buddy — conversational assistant for the platform.
 * Body: { message, history?: [{role, content}] }
 * Guests get GUEST_BUDDY_LIMIT messages; logged-in users are unlimited (subject
 * to the route's generic rate limiter).
 */
const buddyChat = asyncHandler(async (req, res) => {
  const { message, history } = req.body;
  if (!message || !String(message).trim()) {
    throw new BadRequestError('message is required');
  }

  const isGuest = !req.user;
  if (isGuest) {
    const rec = checkGuestBuddyQuota(req.ip);
    if (rec.count >= GUEST_BUDDY_LIMIT) {
      return sendError(res, {
        statusCode: 403,
        message: `You've used your ${GUEST_BUDDY_LIMIT} free messages. Log in to keep chatting with Buddy.`,
        data: { loginRequired: true, limit: GUEST_BUDDY_LIMIT },
      });
    }
    rec.count += 1;
  }

  const result = await getAIProvider().buddyChat(String(message).slice(0, 1000), history || []);

  const payload = { ...result };
  if (isGuest) {
    const rec = guestBuddyHits.get(req.ip);
    payload.guestRemaining = Math.max(0, GUEST_BUDDY_LIMIT - rec.count);
    payload.guestLimit = GUEST_BUDDY_LIMIT;
  }
  sendSuccess(res, { message: 'Buddy reply', data: payload });
});

/**
 * POST /ai/cost-estimate — AI budget estimate for a project brief.
 * Body: { title, description, category, skills, complexity, timeline }
 */
const estimateCost = asyncHandler(async (req, res) => {
  const { title, description, category, skills, complexity, timeline } = req.body;
  if (!description && !title) {
    throw new BadRequestError('Provide at least a project title or description');
  }

  const result = await getAIProvider().estimateCost({ title, description, category, skills, complexity, timeline });
  sendSuccess(res, { message: 'Cost estimate', data: result });
});

/**
 * POST /ai/suggest-brief — infer category + skills + budget from a description.
 * Body: { description, title? }
 */
const suggestBrief = asyncHandler(async (req, res) => {
  const { description, title } = req.body;
  if (!description || !String(description).trim()) {
    throw new BadRequestError('description is required');
  }

  const result = await getAIProvider().suggestBrief(String(description).slice(0, 1500), title || '');
  sendSuccess(res, { message: 'Brief suggestion', data: result });
});

/**
 * POST /ai/validate-skill — public, rate-limited skill validation + live
 * suggestions. Same AI logic as the authenticated /skills/validate, exposed
 * without auth so free public tools (e.g. the Cost Estimator) can offer
 * type-ahead skill suggestions to logged-out visitors.
 * Body: { input }
 */
const validateSkill = asyncHandler(async (req, res) => {
  const { input } = req.body;
  if (!input || !String(input).trim()) {
    throw new BadRequestError('input is required');
  }

  const result = await getAIProvider().validateSkill(String(input).slice(0, 60));
  sendSuccess(res, { message: 'Skill validated', data: result });
});

/**
 * POST /ai/expand-skills — Semantic skill search
 * Body: { query }
 */
const expandSkills = asyncHandler(async (req, res) => {
  const { query } = req.body;
  if (!query || !String(query).trim()) {
    throw new BadRequestError('query is required');
  }

  const result = await getAIProvider().expandSearchSkills(String(query).slice(0, 100));
  sendSuccess(res, { message: 'Skills expanded', data: result });
});

// Context values are free-form key/value pairs (title, category, skills,
// tier, name, etc) — cap what reaches the prompt so a caller can't blow up
// token usage with an oversized payload.
const sanitizeGenerateContext = (context) => {
  if (!context || typeof context !== 'object' || Array.isArray(context)) return {};
  const out = {};
  for (const [key, value] of Object.entries(context).slice(0, 20)) {
    if (value == null) continue;
    out[String(key).slice(0, 40)] = Array.isArray(value)
      ? value.slice(0, 20).map((v) => String(v).slice(0, 100))
      : String(value).slice(0, 300);
  }
  return out;
};

/**
 * POST /ai/generate-text — generic "generate with AI" for a free-text field
 * (job/gig description, bio, portfolio description, FAQ answer, etc).
 * Body: { fieldLabel, context?, existingText? }
 */
const generateText = asyncHandler(async (req, res) => {
  const { fieldLabel, context, existingText } = req.body;
  if (!fieldLabel || !String(fieldLabel).trim()) {
    throw new BadRequestError('fieldLabel is required');
  }

  const result = await getAIProvider().generateText({
    fieldLabel: String(fieldLabel).slice(0, 200),
    context: sanitizeGenerateContext(context),
    existingText: String(existingText || '').slice(0, 2000),
  });
  sendSuccess(res, { message: 'Text generated', data: result });
});

module.exports = { buddyChat, estimateCost, suggestBrief, validateSkill, expandSkills, generateText };
