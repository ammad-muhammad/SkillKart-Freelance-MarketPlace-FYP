const User = require('../models/User');

/**
 * The chat model requires Message.sender and Conversation.participants to be real
 * User documents. Admins are AdminUsers (or .env credentials), so they have no
 * User id to attribute a message to. To let an admin chat with a user AND have
 * the user see/reply to it in their normal inbox, all admin-originated messages
 * are sent AS a single dedicated "SkillKart Support" system User.
 *
 * This account is created lazily and cached. It is flagged with role 'admin' and
 * a sentinel email so it can be recognised (and excluded from public listings).
 */
const SUPPORT_EMAIL = 'support@skillkart.system';

let cachedId = null;

const getSupportUser = async () => {
  if (cachedId) {
    const existing = await User.findById(cachedId).lean();
    if (existing) return existing;
    cachedId = null; // was deleted — fall through and recreate
  }

  let user = await User.findOne({ email: SUPPORT_EMAIL });
  if (!user) {
    user = await User.create({
      email: SUPPORT_EMAIL,
      firstName: 'SkillKart',
      lastName: 'Support',
      role: 'admin',
      isEmailVerified: true,
      isActive: true,
      isSystemAccount: true,
      authProvider: 'email'
    });
  }
  cachedId = user._id;
  return user.toObject ? user.toObject() : user;
};

const isSupportUser = (u) => {
  if (!u) return false;
  const email = typeof u === 'object' ? u.email : null;
  return email === SUPPORT_EMAIL;
};

module.exports = { getSupportUser, isSupportUser, SUPPORT_EMAIL };
