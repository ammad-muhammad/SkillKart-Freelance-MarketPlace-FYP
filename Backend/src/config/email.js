const config = require('./index');
const { resolve, getProvider, setProvider, labelFor } = require('../services/email/providers/factory');
const { getProviderNames } = require('../services/email/providers/registry');

/**
 * Email configuration + startup initialization.
 *
 * Follows the same init/get shape as config/redis.js and config/supabase.js.
 * Transport selection lives in services/email/providers/factory.js — this module
 * only validates configuration and wires the chosen provider in at boot.
 */

/**
 * Validates email config without touching the network.
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
const validateEmailConfig = () => {
  const errors = [];
  const warnings = [];
  const { provider, enabled, sandbox, sandboxRecipient } = config.email;

  if (!getProviderNames().includes(provider)) {
    errors.push(`EMAIL_PROVIDER="${provider}" is not valid. Use one of: ${getProviderNames().join(', ')}`);
  }
  if (!enabled) {
    warnings.push('EMAIL_ENABLED=false — all sends will be skipped');
  }
  if (sandbox && !sandboxRecipient) {
    errors.push('EMAIL_SANDBOX=true requires EMAIL_SANDBOX_RECIPIENT');
  }
  if (!config.email.smtp.fromEmail) {
    warnings.push('No SMTP_FROM_EMAIL (or EMAIL_FROM) set — provider default will be used');
  }

  return { valid: errors.length === 0, errors, warnings };
};

/**
 * Verifies the configured provider and installs it as the active one, falling back
 * to SMTP when the requested provider is unusable.
 *
 * Never throws on connectivity problems — mirrors checkAIHealth() so a bad mail
 * config degrades the app instead of stopping boot. An invalid EMAIL_PROVIDER
 * *name* is still fatal, because that is an operator typo, not an outage.
 *
 * @returns {Promise<{ status: 'success'|'degraded'|'failed', provider: string, error?: string }>}
 */
const initEmail = async () => {
  const { valid, errors, warnings } = validateEmailConfig();
  warnings.forEach((w) => console.log(`⚠️  Email: ${w}`));

  if (!valid) {
    const message = errors.join('; ');
    if (errors.some((e) => e.includes('EMAIL_PROVIDER'))) {
      throw new Error(message); // operator typo — fail loudly
    }
    return { status: 'failed', provider: config.email.provider, error: message };
  }

  if (!config.email.enabled) {
    return { status: 'success', provider: 'disabled' };
  }

  try {
    const { provider, requested, active, fellBack, error } = await resolve();
    setProvider(provider);

    if (fellBack) {
      return {
        status: 'degraded',
        provider: active,
        error: `${labelFor(requested)} unavailable (${error}) — fell back to ${labelFor(active)}`
      };
    }
    if (error) {
      return { status: 'degraded', provider: active, error };
    }
    return { status: 'success', provider: active };
  } catch (error) {
    return { status: 'failed', provider: config.email.provider, error: error.message };
  }
};

/** Health check for the currently active provider. */
const verifyEmail = () => getProvider().verify();

module.exports = { initEmail, getProvider, verifyEmail, validateEmailConfig, labelFor };
