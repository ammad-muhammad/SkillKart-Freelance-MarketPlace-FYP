/**
 * Password change alert email template — pure function.
 * @param {{ time, browser, device, ip }} vars
 * @returns {{ subject: string, html: string, text: string }}
 */
module.exports = function passwordChangeAlertTemplate({ time, browser, device, ip }) {
  const subject = 'Security Alert: Password Changed';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1f2937; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }
        .header { background: #4b5563; color: white; padding: 20px; text-align: center; border-radius: 6px 6px 0 0; }
        .content { padding: 30px; background: #ffffff; }
        .details { background: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .detail-item { margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
        .detail-label { font-weight: bold; color: #4b5563; min-width: 100px; display: inline-block; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
        .warning { color: #dc2626; font-weight: bold; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Changed Successfully</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>This is a confirmation that your SkillKart account password has been changed successfully.</p>

          <div class="details">
            <div class="detail-item"><span class="detail-label">Time:</span> ${time}</div>
            <div class="detail-item"><span class="detail-label">Device:</span> ${device || 'Unknown Device'}</div>
            <div class="detail-item"><span class="detail-label">Browser:</span> ${browser || 'Unknown Browser'}</div>
            ${ip ? `<div class="detail-item"><span class="detail-label">IP Address:</span> ${ip}</div>` : ''}
          </div>

          <p class="warning">If you did NOT change your password, please contact support and secure your account immediately.</p>
        </div>
        <div class="footer">
          <p>This is an automated security notification.</p>
          <p>© ${new Date().getFullYear()} SkillKart. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Password Changed Successfully on your SkillKart account.\n\nTime: ${time}\nDevice: ${device || 'Unknown Device'}\nBrowser: ${browser || 'Unknown Browser'}${ip ? `\nIP Address: ${ip}` : ''}\n\nIf you did NOT change your password, contact support and secure your account immediately.`;

  return { subject, html, text };
};
