/**
 * Centralized email configuration reader & validator.
 *
 * Single responsibility: turn raw environment variables into a validated,
 * frozen config object — or throw a descriptive error naming the exact missing
 * variable. Provider selection, feature flags and per-provider settings all
 * resolve here so the rest of the system never touches `process.env` directly.
 */
const { PROVIDERS } = require('./email.constants');
const { getRegisteredProviders } = require('./email.registry');

const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';

/**
 * Build the global (provider-agnostic) config slice.
 */
function readGlobalConfig() {
  return {
    provider: (process.env.EMAIL_PROVIDER || PROVIDERS.SMTP).trim().toLowerCase(),
    // EMAIL_ENABLED defaults to true; only the literal string 'false' disables.
    enabled: process.env.EMAIL_ENABLED !== 'false',
    sandbox: process.env.EMAIL_SANDBOX === 'true',
    sandboxRecipient: process.env.EMAIL_SANDBOX_RECIPIENT || '',
  };
}

/**
 * Resolve SMTP config, honouring legacy EMAIL_* fallbacks.
 * @param {string[]} warnings  collects deprecation warnings
 */
function readSmtpConfig(warnings) {
  const legacyKeys = [
    ['EMAIL_HOST', 'SMTP_HOST'],
    ['EMAIL_PORT', 'SMTP_PORT'],
    ['EMAIL_SECURE', 'SMTP_SECURE'],
    ['EMAIL_USER', 'SMTP_USER'],
    ['EMAIL_PASSWORD', 'SMTP_PASSWORD'],
    ['EMAIL_FROM', 'SMTP_FROM_EMAIL'],
    ['EMAIL_FROM_NAME', 'SMTP_FROM_NAME'],
  ];
  for (const [legacy, modern] of legacyKeys) {
    if (isBlank(process.env[modern]) && !isBlank(process.env[legacy])) {
      warnings.push(
        `[email] Using legacy "${legacy}". Consider migrating to "${modern}".`
      );
    }
  }

  return {
    host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
    port: process.env.SMTP_PORT || process.env.EMAIL_PORT || 587,
    secure:
      (process.env.SMTP_SECURE || process.env.EMAIL_SECURE) === 'true',
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    password: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD,
    fromEmail:
      process.env.SMTP_FROM_EMAIL ||
      process.env.EMAIL_FROM ||
      process.env.SMTP_USER ||
      process.env.EMAIL_USER,
    fromName:
      process.env.SMTP_FROM_NAME || process.env.EMAIL_FROM_NAME || 'SkillKart',
    replyTo: process.env.SMTP_REPLY_TO || '',
  };
}

/**
 * Resolve Resend config.
 */
function readResendConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL,
    fromName: process.env.RESEND_FROM_NAME || 'SkillKart',
    replyTo: process.env.RESEND_REPLY_TO || '',
  };
}

/**
 * Validate the required variables for the selected provider.
 * Throws with the exact missing variable name on failure.
 */
function validate(global, providerConfig) {
  const registered = getRegisteredProviders();
  if (!registered.includes(global.provider)) {
    throw new Error(
      `Invalid EMAIL_PROVIDER "${global.provider}". Available: ${registered.join(', ')}`
    );
  }

  if (global.sandbox && isBlank(global.sandboxRecipient)) {
    throw new Error(
      'EMAIL_SANDBOX=true requires EMAIL_SANDBOX_RECIPIENT to be set.'
    );
  }

  if (global.provider === PROVIDERS.SMTP) {
    if (isBlank(providerConfig.host)) throw new Error('Missing SMTP_HOST (or legacy EMAIL_HOST).');
    if (isBlank(providerConfig.user)) throw new Error('Missing SMTP_USER (or legacy EMAIL_USER).');
    if (isBlank(providerConfig.password)) throw new Error('Missing SMTP_PASSWORD (or legacy EMAIL_PASSWORD).');
  }

  if (global.provider === PROVIDERS.RESEND) {
    if (isBlank(providerConfig.apiKey)) throw new Error('Missing RESEND_API_KEY.');
    if (isBlank(providerConfig.fromEmail)) throw new Error('Missing RESEND_FROM_EMAIL.');
  }
}

/**
 * Load, validate and freeze the full email config.
 * @returns {{ config: object, warnings: string[] }}
 */
function loadEmailConfig() {
  const warnings = [];
  const global = readGlobalConfig();

  let providerConfig;
  if (global.provider === PROVIDERS.RESEND) {
    providerConfig = readResendConfig();
  } else {
    // Default / smtp path also reads legacy vars for the compat wrapper.
    providerConfig = readSmtpConfig(warnings);
  }

  validate(global, providerConfig);

  const config = Object.freeze({
    ...global,
    providerConfig: Object.freeze(providerConfig),
  });

  return { config, warnings };
}

module.exports = {
  loadEmailConfig,
  // exported for tests
  readGlobalConfig,
  readSmtpConfig,
  readResendConfig,
};
