/**
 * @deprecated Use the email provider system instead
 *   (src/services/email/email.factory.js + src/services/email.service.js).
 *
 * This file is kept ONLY for backward compatibility. Any legacy code that did
 * `require('../config/email')()` and called `.sendMail(options)` continues to
 * work — the call is transparently routed through the new provider singleton.
 */
const { ensureProvider } = require('../services/email/email.factory');

const getTransporter = () => {
  console.warn(
    '[DEPRECATED] config/email.js is deprecated. Use the email provider system (services/email.service.js).'
  );

  // Transporter-like shim: same `sendMail(options)` shape Nodemailer exposes.
  return {
    sendMail: async (options = {}) => {
      const provider = await ensureProvider();
      return provider.send({
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        attachments: options.attachments,
      });
    },
    verify: async () => {
      const provider = await ensureProvider();
      return provider.verify();
    },
  };
};

module.exports = getTransporter;
