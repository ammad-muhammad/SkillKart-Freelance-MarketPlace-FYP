/**
 * Base class every email provider extends.
 *
 * A provider is a transport and nothing else: it takes a normalized message and
 * puts it on the wire. It must never touch user sessions, authentication state or
 * business logic — those belong to the caller. Providers authenticate as the
 * platform, not as a user.
 */
class EmailProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * @param {object} message
   * @param {string} message.to
   * @param {string} message.subject
   * @param {string} [message.html]
   * @param {string} [message.text]
   * @param {Array}  [message.attachments] - [{ filename, content, contentType }]
   * @param {string} [message.from]
   * @returns {Promise<{ id: string, provider: string, accepted: string[] }>}
   */
   
  async send(message) {
    throw new Error(`${this.name}: send() not implemented`);
  }

  /**
   * Health check. Must resolve — never throw — so startup can warn and continue.
   * @returns {Promise<{ ok: boolean, error?: string }>}
   */
  async verify() {
    throw new Error(`${this.name}: verify() not implemented`);
  }

  /** @returns {{ attachments: boolean, html: boolean, replyTo: boolean }} */
  get capabilities() {
    return { attachments: false, html: false, replyTo: false };
  }

  /** @returns {{ from: string, fromName: string }} */
  get defaults() {
    return { from: undefined, fromName: undefined };
  }

  /** Formats a From header, tolerating an address that already has a display name. */
  formatFrom(from) {
    const { from: defaultFrom, fromName } = this.defaults;
    const address = from || defaultFrom;
    if (!address) return undefined;
    if (address.includes('<') || !fromName) return address;
    return `${fromName} <${address}>`;
  }
}

module.exports = EmailProvider;
