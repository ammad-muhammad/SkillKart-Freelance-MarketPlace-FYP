const mongoose = require('mongoose');

// Tracks every issued refresh token so a JWT's signature being valid is no
// longer sufficient by itself — the token must also still exist here,
// unrevoked. This is what makes rotation + reuse-detection possible:
// verifyRefreshToken() only proves the token was *signed by us*, not that
// it's still the current, non-superseded token for that session.
const refreshTokenSchema = new mongoose.Schema({
  // The refresh JWT's `jti` claim. Never store the token itself.
  jti: { type: String, required: true, unique: true },
  // String, not ObjectId — the synthetic superadmin session uses the literal
  // id 'superadmin', which isn't a valid ObjectId.
  userId: { type: String, required: true, index: true },
  // Shared across an entire rotation chain (set once at login, carried
  // forward on every rotation) so reuse detection can revoke the whole
  // family in one query instead of walking a replacedByJti linked list.
  familyId: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  revokedAt: { type: Date, default: null },
  // Set only when this token was rotated forward to a newer one (as opposed
  // to being revoked via logout/theft-response) — that distinction is what
  // separates "stale replay of a rotated token" (theft signal) from "this
  // session was already logged out" (not a theft signal) in refreshAccessToken.
  replacedByJti: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
