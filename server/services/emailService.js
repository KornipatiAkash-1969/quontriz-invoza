const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    const user = process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.GMAIL_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD;

    if (user && pass) {
      const cleanPass = pass.replace(/\s+/g, ''); // Google App Passwords often have spaces
      if (process.env.SMTP_HOST && process.env.SMTP_HOST !== 'smtp.gmail.com') {
        const port = parseInt(process.env.SMTP_PORT || '587', 10);
        const secure = process.env.SMTP_SECURE === 'true' || port === 465;
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port,
          secure,
          auth: { user, pass: cleanPass },
        });
      } else {
        // Direct Gmail preset handles port/host/SSL automatically
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user, pass: cleanPass },
        });
      }
      console.log(`[EmailService] ✅ Configured with sender: ${user}`);
    } else {
      this.transporter = null;
      console.log('[EmailService] ⚠️ SMTP_USER and SMTP_PASS are not configured in server/.env.');
    }
  }

  isConfigured() {
    const user = process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.GMAIL_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD;
    return Boolean(user && pass);
  }

  /**
   * Send 6-digit OTP verification email to recipient
   * @param {string} toEmail - Recipient email (e.g. user@gmail.com)
   * @param {string} otpCode - 6-digit OTP
   * @param {string} purpose - 'login' | 'create_staff' | 'create_owner'
   * @param {number} expiresInMinutes - Expiry duration
   */
  async sendOtpEmail(toEmail, otpCode, purpose = 'Verification', expiresInMinutes = 10) {
    const cleanEmail = (toEmail || '').trim();
    if (!cleanEmail) throw new Error('Recipient email is required.');

    let cleanPurpose = purpose.replace(/_/g, ' ').toUpperCase();
    let formattedSubject = `🔐 Your Quontriz Invoza Security Code: ${otpCode}`;
    let purposeBadge = cleanPurpose;
    let descriptionText = 'Your 6-digit verification code is:';

    if (purpose === 'current_owner_delete_auth') {
      formattedSubject = `⚠️ Security Authorization: Delete Store Owner Code: ${otpCode}`;
      purposeBadge = 'OWNER DELETION AUTHORIZATION';
      descriptionText = 'You have initiated a request to delete a Store Owner account. Enter this authorization code to verify:';
    } else if (purpose === 'target_owner_delete_auth') {
      formattedSubject = `⚠️ Security Alert: Store Owner Account Removal Confirmation Code: ${otpCode}`;
      purposeBadge = 'OWNER REMOVAL CONSENT';
      descriptionText = 'A request has been submitted to remove your Store Owner account. Your confirmation code is:';
    }

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
        <div style="margin-bottom: 24px; text-align: center;">
          <h2 style="margin: 0; color: #0f172a; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Quontriz Invoza</h2>
          <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">Enterprise Invoice OCR & Financial Management</p>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="display: inline-block; padding: 4px 10px; background-color: ${purpose.includes('delete') ? '#fef2f2' : '#e0e7ff'}; color: ${purpose.includes('delete') ? '#b91c1c' : '#4338ca'}; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
            ${purposeBadge}
          </span>
          <p style="margin: 0 0 16px; color: #334155; font-size: 14px;">${descriptionText}</p>
          <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #1e1b4b; background-color: #ffffff; border: 2px dashed ${purpose.includes('delete') ? '#ef4444' : '#6366f1'}; border-radius: 12px; padding: 14px 20px; display: inline-block; margin-bottom: 16px;">
            ${otpCode}
          </div>
          <p style="margin: 0; color: #64748b; font-size: 12px;">
            ⏳ This code expires in <strong>${expiresInMinutes} minutes</strong>.
          </p>
        </div>

        <div style="margin-bottom: 24px; padding: 14px 16px; background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
          <p style="margin: 0; color: #991b1b; font-size: 12px; line-height: 1.5;">
            <strong>Security Notice:</strong> Never share this code with anyone. Quontriz Invoza staff will never ask for your verification code. If you did not request this code, please disregard this email.
          </p>
        </div>

        <div style="border-top: 1px solid #f1f5f9; padding-top: 18px; text-align: center; color: #94a3b8; font-size: 11px;">
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} Quontriz Invoza Inc. All rights reserved.</p>
        </div>
      </div>
    `;

    // Console output for instant server visibility
    console.log(`\n==============================================================`);
    console.log(`📧 [EMAIL OTP DISPATCH] -> Target: ${cleanEmail}`);
    console.log(`Purpose   : ${cleanPurpose}`);
    console.log(`OTP Code  : >>> ${otpCode} <<<`);
    console.log(`Valid for : ${expiresInMinutes} minutes`);

    if (!this.transporter && this.isConfigured()) {
      this.initTransporter();
    }

    if (this.transporter) {
      try {
        const sender = process.env.SMTP_FROM || `"Quontriz Invoza" <${process.env.SMTP_USER || process.env.GMAIL_USER}>`;
        const info = await this.transporter.sendMail({
          from: sender,
          to: cleanEmail,
          subject: formattedSubject,
          html: htmlContent,
          text: `Your Quontriz Invoza verification code is: ${otpCode}. It expires in ${expiresInMinutes} minutes. Never share this code with anyone.`,
        });
        console.log(`Delivery  : ✅ SENT to real inbox via Gmail! MessageId: ${info.messageId}`);
        console.log(`==============================================================\n`);
        return {
          delivered: true,
          messageId: info.messageId,
          email: cleanEmail,
          statusText: 'Dispatched to your email inbox',
        };
      } catch (err) {
        console.error(`Delivery  : ❌ SMTP error:`, err.message);
        console.log(`==============================================================\n`);
        return {
          delivered: false,
          error: err.message,
          email: cleanEmail,
          statusText: `SMTP send failed: ${err.message}`,
        };
      }
    } else {
      console.log(`Delivery  : ⚠️ SMTP Not Configured in server/.env (Add SMTP_USER & SMTP_PASS)`);
      console.log(`==============================================================\n`);
      return {
        delivered: false,
        unconfigured: true,
        email: cleanEmail,
        notice: 'Real email delivery requires SMTP_USER and SMTP_PASS in server/.env.',
      };
    }
  }
}

module.exports = new EmailService();
