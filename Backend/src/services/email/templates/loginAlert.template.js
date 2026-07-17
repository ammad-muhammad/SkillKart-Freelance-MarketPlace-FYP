const config = require('../../../config');
const { card, detailRows, BRAND } = require('./layout');

/**
 * @param {{ time: string, method: string, browser: string, device: string, ip: string }} data
 * @returns {{ subject: string, html: string }}
 */
const render = ({ time, method, browser, device, ip }) => ({
  subject: 'Security Alert: New Login Detected',
  html: card({
    title: 'New Login Detected',
    headerBg: BRAND.danger,
    body: `          <p>Hello,</p>
          <p>Your SkillKart account was successfully accessed. If this was you, you can safely ignore this email.</p>
${detailRows({ time, method, browser, device, ip })}

          <p class="warning">If this was NOT you, please secure your account immediately by changing your password.</p>

          <a href="${config.frontend.url}/login" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 10px;">Secure My Account</a>`,
    footer: `          <p>This is an automated security notification. For your protection, we send this email whenever a new login is detected.</p>`
  })
});

module.exports = { render };
