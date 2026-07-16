const { Resend } = require('resend');
const EmailProvider = require('./email.provider.interface');
const { PROVIDERS } = require('../email.constants');

/**
 * Resend provider — wrapper around the Resend SDK.
 * Creates the Resend client once (singleton) in the constructor.
 *
 * NOTE: the Resend SDK (v6) resolves with `{ data, error }` instead of
 * throwing on API errors. We normalise that here: on `error` we throw an
 * Error carrying `statusCode` so the retry utility can classify it.
 */
class ResendProvider extends EmailProvider {
  constructor(config) {
    super(PROVIDERS.RESEND, config);
    this.client = new Resend(config.apiKey);
  }

  get capabilities() {
    return {
      attachments: true,
      inlineImages: false,
      replyTo: true,
      batchSending: true,
    };
  }

  async send({ to, subject, html, text, replyTo, attachments }) {
    const payload = {
      from: this.buildFrom(),
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    };

    if (text) payload.text = text;

    const effectiveReplyTo = replyTo || this.defaults.replyTo;
    if (effectiveReplyTo) payload.replyTo = effectiveReplyTo;
    if (attachments && attachments.length) payload.attachments = attachments;

    const { data, error } = await this.client.emails.send(payload);

    if (error) {
      const err = new Error(error.message || 'Resend send failed');
      err.name = error.name || 'ResendError';
      // Resend surfaces a statusCode on errors; default to 400 (non-retryable).
      err.statusCode = error.statusCode || 400;
      err.providerError = error;
      throw err;
    }

    return {
      messageId: data?.id || null,
      requestId: data?.id || null,
      raw: data,
    };
  }

  async verify() {
    // Domains list is the cheapest authenticated call that proves the API key
    // is valid and reachable. An invalid key resolves with an error object.
    const { error } = await this.client.domains.list();
    if (!error) return true;

    // A "sending-only" (restricted) API key is valid for sending but lacks
    // permission to list domains. Treat that specific case as a pass — the key
    // still works for our only use case (sending mail).
    const msg = String(error.message || '').toLowerCase();
    if (msg.includes('restricted') || error.statusCode === 401 && msg.includes('send')) {
      return true;
    }

    const err = new Error(error.message || 'Resend verification failed');
    err.name = error.name || 'ResendError';
    err.statusCode = error.statusCode || 401;
    throw err;
  }
}

module.exports = ResendProvider;
