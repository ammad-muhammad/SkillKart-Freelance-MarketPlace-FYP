const SmtpProvider = require('./smtp.provider');
const GmailProvider = require('./gmail.provider');

/**
 * The single place providers are declared.
 *
 * To add a provider (SES, Brevo, Mailgun, Resend, ...): create the provider file
 * extending EmailProvider, then add one line here. Controllers, templates and
 * business logic never change.
 */
const registry = {
  smtp: SmtpProvider,
  gmail: GmailProvider
};

const getProviderNames = () => Object.keys(registry);

const isRegistered = (name) => Object.prototype.hasOwnProperty.call(registry, name);

module.exports = { registry, getProviderNames, isRegistered };
