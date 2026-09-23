/**
 * Off-platform contact detection (emails, phone numbers), shared by chat
 * messages (message.controller.js — masks + counts violations) and custom
 * offers (customOffer.controller.js — rejects outright).
 */

const EMAIL_REGEX = () => /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// A bare run of digits (order numbers, timestamps, invoice IDs) is NOT a phone
// number on its own — only treat a digit run as one when it's both a
// realistic phone length (7-15 digits) AND actually formatted like a phone
// number (a leading "+" or at least one separator between digits). Without
// the formatting check, something like a 13-digit timestamp would otherwise
// get masked and count as a contact-info violation.
const PHONE_CANDIDATE_REGEX = () => /\+?\d[\d\s\-.()]{5,18}\d/g;

const BLOCKED = '*** [CONTACT INFO BLOCKED] ***';

function isLikelyPhoneNumber(candidate) {
  const digitsOnly = candidate.replace(/\D/g, '');
  const hasSeparator = /[\s\-.()]/.test(candidate);
  const startsWithPlus = candidate.trim().startsWith('+');
  return digitsOnly.length >= 7 && digitsOnly.length <= 15 && (hasSeparator || startsWithPlus);
}

function matchesLikelyPhoneNumber(text) {
  const regex = PHONE_CANDIDATE_REGEX();
  let m;
  while ((m = regex.exec(text)) !== null) {
    if (isLikelyPhoneNumber(m[0])) return true;
  }
  return false;
}

function containsContactInfo(text) {
  if (!text) return false;
  return EMAIL_REGEX().test(text) || matchesLikelyPhoneNumber(text);
}

function maskContactInfo(text) {
  return text
    .replace(EMAIL_REGEX(), BLOCKED)
    .replace(PHONE_CANDIDATE_REGEX(), (candidate) => (isLikelyPhoneNumber(candidate) ? BLOCKED : candidate));
}

module.exports = { containsContactInfo, maskContactInfo };
