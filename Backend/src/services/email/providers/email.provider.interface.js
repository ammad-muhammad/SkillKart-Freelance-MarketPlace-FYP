/**
 * EmailProvider — the contract every concrete provider must satisfy.
 *
 * Concrete providers (smtp, resend, ...) extend this class and implement
 * `send()` and `verify()`. The rest of the system only ever talks to this
 * interface, so adding a new provider never touches business logic.
 */
class EmailProvider {
  /**
   * @param {string} name   Registered provider name (e.g. 'smtp', 'resend')
   * @param {object} config Provider-specific, already-validated config
   */
  constructor(name, config) {
    this.name = name;
    this.config = config || {};
  }

  /** Provider capabilities descriptor. Override per provider. */
  get capabilities() {
    return {
      attachments: false,
      inlineImages: false,
      replyTo: false,
      batchSending: false,
    };
  }

  /** Default sender identity resolved from config. */
  get defaults() {
    return {
      from: this.config.fromEmail,
      fromName: this.config.fromName,
      replyTo: this.config.replyTo || null,
    };
  }

  /**
   * Build the RFC 5322 "From" header ("Name <email>") from config.
   * @returns {string}
   */
  buildFrom() {
    const { from, fromName } = this.defaults;
    return fromName ? `${fromName} <${from}>` : from;
  }

  /**
   * Send a single email. MUST be implemented by subclasses.
   * @param {object} message { to, subject, html, text, replyTo, attachments }
   * @returns {Promise<{ messageId?: string, requestId?: string, raw?: any }>}
   */
  async send(/* { to, subject, html, text, replyTo, attachments } */) {
    throw new Error(`${this.name}: send() not implemented`);
  }

  /**
   * Connection / configuration health check. MUST be implemented by subclasses.
   * @returns {Promise<boolean>}
   */
  async verify() {
    throw new Error(`${this.name}: verify() not implemented`);
  }
}

module.exports = EmailProvider;
