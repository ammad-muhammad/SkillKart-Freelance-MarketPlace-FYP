const nodemailer = require('nodemailer');
const EmailProvider = require('./provider.interface');
const config = require('../../../config');

/**
 * SMTP transport (Nodemailer). This is the original implementation, isolated
 * behind the provider interface — the wire behaviour is unchanged.
 */
class SmtpProvider extends EmailProvider {
  constructor() {
    super('smtp');
    this.transporter = null;
  }

  get settings() {
    return config.email.smtp;
  }

  get capabilities() {
    return { attachments: true, html: true, replyTo: true };
  }

  get defaults() {
    return { from: this.settings.fromEmail, fromName: this.settings.fromName };
  }

  /** Throws with the specific missing keys named, so misconfig is obvious at boot. */
  validate() {
    const { host, user, password } = this.settings;
    const missing = [];
    if (!host) missing.push('SMTP_HOST (or EMAIL_HOST)');
    if (!user) missing.push('SMTP_USER (or EMAIL_USER)');
    if (!password) missing.push('SMTP_PASSWORD (or EMAIL_PASSWORD)');
    if (missing.length) {
      throw new Error(`SMTP provider missing required config: ${missing.join(', ')}`);
    }
  }

  getTransporter() {
    if (!this.transporter) {
      this.validate();
      const { host, port, secure, user, password } = this.settings;
      this.transporter = nodemailer.createTransport({
        host,
        port: port || 587,
        secure: secure === true || secure === 'true',
        auth: { user, pass: password }
      });
    }
    return this.transporter;
  }

  async send({ to, subject, html, text, attachments, from }) {
    const info = await this.getTransporter().sendMail({
      from: this.formatFrom(from),
      to,
      subject,
      html,
      text,
      attachments
    });

    return {
      id: info.messageId,
      provider: this.name,
      accepted: info.accepted || [to]
    };
  }

  async verify() {
    try {
      await this.getTransporter().verify();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }
}

module.exports = SmtpProvider;
