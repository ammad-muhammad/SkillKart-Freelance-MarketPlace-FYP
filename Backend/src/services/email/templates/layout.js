/**
 * Shared chrome for transactional email.
 *
 * Styles are inline because email clients strip <style> unpredictably; the few
 * templates that still ship a <style> block below are kept as-is to preserve their
 * existing rendering.
 */
const BRAND = {
  primary: '#4F46E5',
  danger: '#ef4444',
  neutral: '#4b5563',
  text: '#1f2937',
  muted: '#6b7280'
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Card layout used by the alert templates.
 * @param {object} opts
 * @param {string} opts.title      - header text
 * @param {string} opts.body       - inner HTML (already trusted/escaped by caller)
 * @param {string} [opts.headerBg] - header background colour
 * @param {string} [opts.footer]   - footer HTML
 */
const card = ({ title, body, headerBg = BRAND.primary, footer }) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: ${BRAND.text}; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }
        .header { background: ${headerBg}; color: white; padding: 20px; text-align: center; border-radius: 6px 6px 0 0; }
        .content { padding: 30px; background: #ffffff; }
        .details { background: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .detail-item { margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
        .detail-label { font-weight: bold; color: ${BRAND.neutral}; min-width: 100px; display: inline-block; }
        .footer { text-align: center; margin-top: 20px; color: ${BRAND.muted}; font-size: 12px; }
        .warning { color: #dc2626; font-weight: bold; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${title}</h1>
        </div>
        <div class="content">
${body}
        </div>
        <div class="footer">
${footer || `          <p>This is an automated notification.</p>`}
          <p>© ${new Date().getFullYear()} SkillKart. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

/** Renders the Time/Method/Device/Browser/IP block shared by the security alerts. */
const detailRows = ({ time, method, browser, device, ip }) => `
          <div class="details">
            <div class="detail-item"><span class="detail-label">Time:</span> ${escapeHtml(time)}</div>
            ${method ? `<div class="detail-item"><span class="detail-label">Method:</span> ${escapeHtml(method)}</div>` : ''}
            <div class="detail-item"><span class="detail-label">Device:</span> ${escapeHtml(device || 'Unknown Device')}</div>
            <div class="detail-item"><span class="detail-label">Browser:</span> ${escapeHtml(browser || 'Unknown Browser')}</div>
            ${ip ? `<div class="detail-item"><span class="detail-label">IP Address:</span> ${escapeHtml(ip)}</div>` : ''}
          </div>`;

module.exports = { BRAND, card, detailRows, escapeHtml };
