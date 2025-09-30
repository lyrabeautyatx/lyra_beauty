const nodemailer = require('nodemailer');

// Email service for partner notifications
class EmailService {
  constructor() {
    this.transporter = null;
    this.initialize();
  }

  async initialize() {
    try {
      // For development, use console logging
      // In production, configure with actual SMTP settings
      if (process.env.NODE_ENV === 'production' && process.env.SMTP_HOST) {
        this.transporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
      } else {
        // Development mode - create test account
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransporter({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
      }
    } catch (error) {
      console.error('Email service initialization failed:', error);
      this.transporter = null;
    }
  }

  async sendPartnerApprovalEmail(user) {
    const subject = 'Partner Application Approved - Welcome to Lyra Beauty!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #bfa14a;">Congratulations! Your Partner Application Has Been Approved</h2>
        
        <p>Dear ${user.first_name} ${user.last_name},</p>
        
        <p>We're excited to inform you that your partner application has been <strong>approved</strong>!</p>
        
        <p>As a Lyra Beauty partner, you can now:</p>
        <ul>
          <li>Share your unique referral coupons with customers</li>
          <li>Earn commissions on successful referrals</li>
          <li>Access your partner dashboard to track earnings</li>
        </ul>
        
        <p>Your account has been updated with partner privileges. You can log in to your dashboard to get started.</p>
        
        <p>Thank you for joining the Lyra Beauty partner program!</p>
        
        <p>Best regards,<br>
        The Lyra Beauty Team</p>
      </div>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  async sendPartnerRejectionEmail(user) {
    const subject = 'Partner Application Update - Lyra Beauty';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #bfa14a;">Partner Application Update</h2>
        
        <p>Dear ${user.first_name} ${user.last_name},</p>
        
        <p>Thank you for your interest in becoming a Lyra Beauty partner.</p>
        
        <p>After careful review, we regret to inform you that we cannot approve your partner application at this time.</p>
        
        <p>This decision may be due to various factors such as current partner capacity or specific program requirements.</p>
        
        <p>You're still welcome to enjoy our services as a valued customer, and you may reapply for the partner program in the future.</p>
        
        <p>Thank you for your understanding.</p>
        
        <p>Best regards,<br>
        The Lyra Beauty Team</p>
      </div>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  async sendEmail(to, subject, html) {
    if (!this.transporter) {
      console.log(`[EMAIL SERVICE - No transporter] Would send email to: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Content: ${html}`);
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@lyrabeautyatx.com',
        to: to,
        subject: subject,
        html: html
      });

      if (process.env.NODE_ENV !== 'production') {
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      }

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Failed to send email:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
const emailService = new EmailService();
module.exports = emailService;