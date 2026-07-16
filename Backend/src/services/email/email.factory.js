/**
 * Email Factory — orchestrates provider initialization and caches the
 * singleton provider instance for the whole process.
 *
 * `initializeEmailProvider()` is called once at server startup. `getProvider()`
 * is used everywhere else and lazily initialises on first use so that scripts
 * (seeders, tests) that never call the startup hook still work.
 */
const { loadEmailConfig } = require('./email.config');
const { getProviderClass } = require('./email.registry');
const metrics = require('./email.metrics');

let providerInstance = null;
let cachedConfig = null;
let initPromise = null;

/**
 * Build (and verify) the provider. Idempotent: repeated calls return the
 * cached instance and info.
 * @returns {Promise<object>} startup info descriptor
 */
async function initializeEmailProvider() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { config, warnings } = loadEmailConfig();
    warnings.forEach((w) => console.warn(`⚠️  ${w}`));

    cachedConfig = config;

    const ProviderClass = getProviderClass(config.provider);
    providerInstance = new ProviderClass(config.providerConfig);
    metrics.setProvider(config.provider);

    const info = {
      provider: config.provider,
      from: providerInstance.defaults.from,
      fromName: providerInstance.defaults.fromName,
      enabled: config.enabled,
      sandbox: config.sandbox,
      sandboxRecipient: config.sandboxRecipient,
      capabilities: providerInstance.capabilities,
      verified: false,
    };

    // Health check — non-fatal. A failed verify still leaves a usable provider;
    // real send errors will surface at send time with retries.
    if (config.enabled) {
      try {
        await providerInstance.verify();
        info.verified = true;
      } catch (error) {
        info.verified = false;
        info.verifyError = error.message;
        console.warn(
          `⚠️  Email provider "${config.provider}" verify() failed: ${error.message}`
        );
      }
    }

    return info;
  })();

  return initPromise;
}

/**
 * Get the cached provider instance, initialising synchronously-lazily if the
 * startup hook was never called. Because init is async, callers that reach
 * here before initialization must await ensureProvider() instead.
 */
function getProvider() {
  if (!providerInstance) {
    throw new Error(
      'Email provider not initialised. Call initializeEmailProvider() first (or use ensureProvider()).'
    );
  }
  return providerInstance;
}

/**
 * Ensure the provider exists, initialising on demand. Preferred entry point
 * for the email service so it works both under the server and standalone
 * scripts.
 * @returns {Promise<object>} the provider instance
 */
async function ensureProvider() {
  if (providerInstance) return providerInstance;
  await initializeEmailProvider();
  return providerInstance;
}

/** @returns {object|null} the frozen email config (or null pre-init) */
function getEmailConfig() {
  return cachedConfig;
}

/** Test/util hook to force re-initialisation. */
function _reset() {
  providerInstance = null;
  cachedConfig = null;
  initPromise = null;
}

module.exports = {
  initializeEmailProvider,
  getProvider,
  ensureProvider,
  getEmailConfig,
  _reset,
};
