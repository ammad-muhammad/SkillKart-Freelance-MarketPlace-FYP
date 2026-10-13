const { card, detailRows, BRAND } = require('./layout');

/**
 * @param {{ time: string, browser: string, device: string, ip: string }} data
 * @returns {{ subject: string, html: string }}
 */
const render = ({ time, browser, device, ip }) => ({
  subject: 'Security Alert: Password Changed',
  html: card({
    title: 'Password Changed Successfully',
    headerBg: BRAND.neutral,
    body: `          <p>Hello,</p>
          <p>This is a confirmation that your SkillKart account password has been changed successfully.</p>
${detailRows({ time, browser, device, ip })}

          <p class="warning">If you did NOT change your password, please contact support and secure your account immediately.</p>`,
    footer: `          <p>This is an automated security notification.</p>`
  })
});

module.exports = { render };
