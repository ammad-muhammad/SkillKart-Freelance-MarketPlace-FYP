const config = require('../config');

/**
 * The browser origins allowed to call this API: CORS_ORIGIN and FRONTEND_URL
 * (comma-separated lists) plus the two local dev ports. Shared by the CORS
 * middleware (app.js) and the admin CSRF guard (adminAuth.middleware.js) so the
 * two can never disagree about who is "ours". The Capacitor apps' fixed WebView
 * origin (https://localhost) is allowed by listing it in CORS_ORIGIN.
 */
const getAllowedOrigins = () => [
  ...new Set([
    ...(config.cors.origin || '').split(','),
    ...(config.frontend.url || '').split(','),
    'http://localhost:3000',
    'http://localhost:3001',
  ].map((origin) => origin.trim()).filter(Boolean)),
];

module.exports = { getAllowedOrigins };
