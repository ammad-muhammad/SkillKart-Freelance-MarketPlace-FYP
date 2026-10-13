const { registry, getProviderNames, isRegistered } = require('./registry');
const config = require('../../../config');

let instance = null;

/** Human-facing label for startup logs. */
const LABELS = { smtp: 'SMTP', gmail: 'Gmail API' };

const labelFor = (name) => LABELS[name] || name;

/**
 * Builds the provider named by EMAIL_PROVIDER.
 * An unknown name is a configuration error and throws — silently defaulting would
 * hide a typo that stops mail from going where the operator intended.
 */
const build = (name) => {
  if (!isRegistered(name)) {
    throw new Error(
      `Unknown EMAIL_PROVIDER "${name}". Valid providers: ${getProviderNames().join(', ')}`
    );
  }
  return new registry[name]();
};

/**
 * Resolves the active provider, falling back to SMTP when the requested provider
 * cannot be configured. Returns diagnostics rather than logging, so the caller
 * decides how to report.
 *
 * @returns {Promise<{ provider: object, requested: string, active: string, fellBack: boolean, error?: string }>}
 */
const resolve = async () => {
  const requested = config.email.provider;
  const provider = build(requested); // throws on unknown name

  const health = await provider.verify();
  if (health.ok) {
    return { provider, requested, active: requested, fellBack: false };
  }

  if (requested === 'smtp') {
    // Nothing to fall back to. Keep the provider: sends will surface the real error.
    return { provider, requested, active: requested, fellBack: false, error: health.error };
  }

  const fallback = build('smtp');
  const fallbackHealth = await fallback.verify();
  return {
    provider: fallbackHealth.ok ? fallback : provider,
    requested,
    active: fallbackHealth.ok ? 'smtp' : requested,
    fellBack: fallbackHealth.ok,
    error: health.error
  };
};

/** Lazily-built singleton, so a send outside startup still works. */
const getProvider = () => {
  if (!instance) {
    instance = build(config.email.provider);
  }
  return instance;
};

const setProvider = (provider) => {
  instance = provider;
};

const resetProvider = () => {
  instance = null;
};

module.exports = { resolve, getProvider, setProvider, resetProvider, labelFor };
