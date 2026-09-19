const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * Firebase Cloud Messaging push notifications for the Capacitor mobile app.
 *
 * Fails OPEN when unconfigured: every call here is a no-op until a service
 * account credential is supplied via EITHER FIREBASE_SERVICE_ACCOUNT_JSON
 * (inline — for hosts like Railway with no persistent file storage) or
 * FIREBASE_SERVICE_ACCOUNT_PATH (a file — for local dev). See config/index.js.
 * That keeps local dev and any deploy without Firebase set up working
 * exactly as before — same pattern as recaptcha/email/AI providers. Callers
 * (notification.service.js) never need to check `isConfigured()` themselves.
 */

let getMessagingFn = null; // set by getApp() — firebase-admin/messaging's getMessaging
let initAttempted = false;
let app = null;

function loadServiceAccount() {
  if (config.push.serviceAccountJson) {
    try {
      return JSON.parse(config.push.serviceAccountJson);
    } catch (error) {
      console.error('[push] FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON:', error.message);
      return null;
    }
  }

  const resolvedPath = path.isAbsolute(config.push.serviceAccountPath)
    ? config.push.serviceAccountPath
    : path.join(process.cwd(), config.push.serviceAccountPath);
  if (!fs.existsSync(resolvedPath)) return null;

  try {
    return JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  } catch (error) {
    console.error('[push] failed to read service account file:', error.message);
    return null;
  }
}

const isConfigured = () => Boolean(loadServiceAccount());

/** Lazily requires firebase-admin and initializes the app at most once. */
function getApp() {
  if (app || initAttempted) return app;
  initAttempted = true;

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) return null;

  try {
    // Required lazily: a project that never configures push shouldn't pay
    // the require() cost, and firebase-admin is a fairly heavy dependency.
    //
    // firebase-admin v12+ dropped the old namespaced API this used to call
    // (`admin.apps`, `admin.app()`, `admin.credential.cert()`,
    // `admin.messaging()`) — `require('firebase-admin')`'s top-level export
    // no longer has any of those properties at all in v14 (the installed
    // version here), so every one of those calls threw
    // "Cannot read properties of undefined". That silently degraded to the
    // designed fail-open no-op path, indistinguishable from "not configured"
    // — push looked inert even with a fully valid credential file. Import
    // the modular subpaths instead, which is the only API v14 actually has.
    // eslint-disable-next-line global-require
    const { initializeApp, cert, getApps, getApp: getExistingApp } = require('firebase-admin/app');
    // eslint-disable-next-line global-require
    ({ getMessaging: getMessagingFn } = require('firebase-admin/messaging'));
    app = getApps().length ? getExistingApp() : initializeApp({ credential: cert(serviceAccount) });
  } catch (error) {
    console.error('[push] Firebase init failed, push notifications disabled:', error.message);
    app = null;
  }
  return app;
}

/**
 * Sends a push to every device registered for a user. Invalid/unregistered
 * tokens FCM reports back are pruned from the user doc so they stop being
 * retried forever.
 *
 * @param {import('mongoose').Types.ObjectId|string} userId
 * @param {{title: string, body?: string, link?: string}} payload
 */
async function sendToUser(userId, { title, body = '', link = '' }) {
  const firebaseApp = getApp();
  if (!firebaseApp || !userId || !title) return;

  try {
    // Required here, not at module scope — only reachable once getApp()
    // has already confirmed firebase-admin is installed and configured.
    const User = require('../models/User');
    const user = await User.findById(userId).select('pushTokens').lean();
    const tokens = user?.pushTokens || [];
    if (!tokens.length) return;

    const response = await getMessagingFn(firebaseApp).sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: link ? { link } : {},
    });

    const deadTokens = response.responses
      .map((r, i) => (!r.success && ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(r.error?.code) ? tokens[i] : null))
      .filter(Boolean);

    if (deadTokens.length) {
      await User.updateOne({ _id: userId }, { $pull: { pushTokens: { $in: deadTokens } } });
    }
  } catch (error) {
    console.error('[push] send failed:', error.message);
  }
}

/** Adds a device token for a user (idempotent — no duplicate entries). */
async function registerToken(userId, token) {
  if (!userId || !token) return;
  const User = require('../models/User');
  await User.updateOne({ _id: userId }, { $addToSet: { pushTokens: token } });
}

/** Removes a device token, e.g. on logout so that device stops getting pushes. */
async function removeToken(userId, token) {
  if (!userId || !token) return;
  const User = require('../models/User');
  await User.updateOne({ _id: userId }, { $pull: { pushTokens: token } });
}

module.exports = { isConfigured, sendToUser, registerToken, removeToken };
