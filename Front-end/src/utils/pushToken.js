/**
 * The FCM device token this app instance registered with the backend, so that
 * logout can send it along and have the server unregister the device in the same
 * authenticated request (see AuthContext.logout / Backend auth.controller.logout).
 *
 * Kept in module memory only: it is re-issued by Firebase on every app start and
 * re-registered by usePushNotifications once the user signs in, so it needs no
 * persistence of its own.
 */
let currentPushToken = null;

export const setPushToken = (token) => { currentPushToken = token || null; };
export const getPushToken = () => currentPushToken;
export const clearPushToken = () => { currentPushToken = null; };
