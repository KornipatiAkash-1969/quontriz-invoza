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
      const cleanPass = pass.replace(/\s+/g, '');
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
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user, pass: cleanPass },
        });
      }
      console.log(`[EmailService] ✅ Configured with sender: ${user}`);
    } else {
      this.transporter = null;
    }
  }

  isConfigured() {
    const user = process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.GMAIL_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD;
    return Boolean(user && pass);
  }

  /**
   * Send notification email to recipient
   */
  async sendNotificationEmail(toEmail, subject, htmlContent, textContent = '') {
    const cleanEmail = (toEmail || '').trim();
    if (!cleanEmail) throw new Error('Recipient email is required.');

    if (!this.transporter && this.isConfigured()) {
      this.initTransporter();
    }

    if (this.transporter) {
      try {
        const sender = process.env.SMTP_FROM || `"Quontriz Invoza" <${process.env.SMTP_USER || process.env.GMAIL_USER}>`;
        const info = await this.transporter.sendMail({
          from: sender,
          to: cleanEmail,
          subject,
          html: htmlContent,
          text: textContent || subject,
        });
        console.log(`[EmailService] ✅ Email sent to ${cleanEmail}: ${info.messageId}`);
        return { delivered: true, messageId: info.messageId };
      } catch (err) {
        console.error(`[EmailService] ❌ Failed to send email:`, err.message);
        return { delivered: false, error: err.message };
      }
    }
    return { delivered: false, unconfigured: true };
  }
}

module.exports = new EmailService();
