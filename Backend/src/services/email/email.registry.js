/**
 * Provider Registry — Map-based, self-registering.
 *
 * Adding a new provider is a two-step change with zero business-logic edits:
 *   1. Create `providers/<name>.provider.js` extending EmailProvider
 *   2. registerProvider('<name>', require('./providers/<name>.provider'))
 *
 * No switch statements, no if-chains anywhere in the send path.
 */
const { PROVIDERS } = require('./email.constants');

const registry = new Map();

/**
 * Register a provider class under a name.
 * @param {string} name
 * @param {Function} ProviderClass  A class extending EmailProvider
 */
function registerProvider(name, ProviderClass) {
  registry.set(name, ProviderClass);
}

/**
 * Resolve a provider class by name.
 * @param {string} name
 * @returns {Function} the provider class
 * @throws if the provider is not registered
 */
function getProviderClass(name) {
  const ProviderClass = registry.get(name);
  if (!ProviderClass) {
    const available = [...registry.keys()].join(', ') || '(none)';
    throw new Error(
      `Unknown email provider "${name}". Available: ${available}`
    );
  }
  return ProviderClass;
}

/** @returns {string[]} list of registered provider names */
function getRegisteredProviders() {
  return [...registry.keys()];
}

// ── Self-register built-in providers ──
registerProvider(PROVIDERS.SMTP, require('./providers/smtp.provider'));
registerProvider(PROVIDERS.RESEND, require('./providers/resend.provider'));

module.exports = {
  registerProvider,
  getProviderClass,
  getRegisteredProviders,
};
