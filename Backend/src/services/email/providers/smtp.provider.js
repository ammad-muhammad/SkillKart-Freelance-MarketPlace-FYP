const nodemailer = require('nodemailer');
const EmailProvider = require('./email.provider.interface');
const { PROVIDERS } = require('../email.constants');

/**
 * SMTP provider — thin wrapper around Nodemailer.
 * Creates the transporter once (singleton) in the constructor and reuses it
 * for every send. Reads SMTP_* config with EMAIL_* legacy fallbacks (resolved
 * upstream in email.config.js).
 */
class SmtpProvider extends EmailProvider {
  constructor(config) {
    super(PROVIDERS.SMTP, config);

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: Number(config.port) || 587,
      secure: config.secure === true || config.secure === 'true',
      auth: {
        user: config.user,
        pass: config.password,
      },
    });
  }

  get capabilities() {
    return {
      attachments: true,
      inlineImages: true,
      replyTo: true,
      batchSending: false,
    };
  }

  async send({ to, subject, html, text, replyTo, attachments }) {
    const mailOptions = {
      from: this.buildFrom(),
      to,
      subject,
      html,
      text: text || undefined,
    };

    const effectiveReplyTo = replyTo || this.defaults.replyTo;
    if (effectiveReplyTo) mailOptions.replyTo = effectiveReplyTo;
    if (attachments && attachments.length) mailOptions.attachments = attachments;

    const info = await this.transporter.sendMail(mailOptions);

    return {
      messageId: info.messageId || null,
      requestId: null,
      raw: info,
    };
  }

  async verify() {
    await this.transporter.verify();
    return true;
  }
}

module.exports = SmtpProvider;
