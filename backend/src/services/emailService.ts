import nodemailer from 'nodemailer';
import logger from '../utils/logger';

type EmailTemplate =
  | 'password_reset'
  | 'class_scheduled'
  | 'class_rescheduled'
  | 'class_cancelled'
  | 'trial_scheduled'
  | 'trial_reminder'
  | 'batch_whatsapp_link'
  | 'batch_completed'
  | 'payment_link_sent'
  | 'package_activated'
  | 'package_near_completion'
  | 'credentials_created'
  | 'help_request'
  | string;

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    const emailHost = process.env.EMAIL_HOST;
    const emailPort = process.env.EMAIL_PORT;
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const secureSetting = process.env.EMAIL_SECURE;

    if (!emailHost || !emailUser || !emailPass) {
      logger.warn('Email service not configured. EMAIL_HOST, EMAIL_USER, EMAIL_PASS are required.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: emailHost,
      port: Number(emailPort || 587),
      secure: secureSetting ? secureSetting === 'true' : Number(emailPort || 587) === 465,
      auth: { user: emailUser, pass: emailPass },
      pool: true,
      maxConnections: 5,
    });

    logger.info('Email service initialized');
  }

  async sendRawEmail(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      throw new Error('Email service is not configured');
    }

    await this.transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html,
    });
  }

  async sendTemplatedEmail(to: string, template: EmailTemplate, data: Record<string, any>): Promise<void> {
    const { subject, html } = this.renderTemplate(template, data);
    await this.sendRawEmail(to, subject, html);
  }

  async sendTestEmail(to: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.transporter) {
      return { success: false, error: 'Email service is not configured' };
    }
    try {
      const result = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to,
        subject: 'Chess Academy email configuration test',
        html: '<p>Your Chess Academy email configuration is working.</p>',
      });
      return { success: true, messageId: result.messageId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to send test email',
      };
    }
  }

  private renderTemplate(template: EmailTemplate, data: Record<string, any>): { subject: string; html: string } {
    const escapeHtml = (value: unknown): string =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    data = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        typeof value === 'object' && value !== null ? value : escapeHtml(value),
      ])
    );
    const base = (content: string) => `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333;">
        ${content}
        <hr style="margin-top:32px;border:none;border-top:1px solid #eee;" />
        <p style="font-size:12px;color:#999;">Chess Academy Management System</p>
      </div>
    `;

    const templates: Record<string, { subject: string; html: string }> = {
      password_reset: {
        subject: 'Password Reset Request',
        html: base(`
          <h2>Password Reset</h2>
          <p>Hi,</p>
          <p>You requested to reset your password. Click the link below (valid for ${data.expiresIn}):</p>
          <p><a href="${data.resetUrl}" style="background:#e44;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;">Reset Password</a></p>
          <p>If you didn't request this, please ignore this email.</p>
        `),
      },
      class_scheduled: {
        subject: `Class Scheduled – ${data.date} at ${data.startTime}`,
        html: base(`
          <p>Dear ${data.parentName},</p>
          <p>A class for <strong>${data.studentName}</strong> has been scheduled:</p>
          <ul>
            <li><strong>Date:</strong> ${data.date}</li>
            <li><strong>Time:</strong> ${data.startTime} – ${data.endTime} (${data.timezone})</li>
            ${data.meetingLink ? `<li><strong>Meeting:</strong> <a href="${data.meetingLink}">${data.meetingLink}</a></li>` : ''}
          </ul>
        `),
      },
      class_rescheduled: {
        subject: `Class Rescheduled – New time: ${data.newDate} at ${data.startTime}`,
        html: base(`
          <p>Dear ${data.parentName},</p>
          <p>The class for <strong>${data.studentName}</strong> has been rescheduled:</p>
          <ul>
            <li><strong>New Date:</strong> ${data.newDate}</li>
            <li><strong>New Time:</strong> ${data.startTime} – ${data.endTime} (${data.timezone})</li>
            ${data.reason ? `<li><strong>Reason:</strong> ${data.reason}</li>` : ''}
            ${data.meetingLink ? `<li><strong>Meeting:</strong> <a href="${data.meetingLink}">${data.meetingLink}</a></li>` : ''}
          </ul>
        `),
      },
      class_cancelled: {
        subject: `Class Cancelled – ${data.date} at ${data.startTime}`,
        html: base(`
          <p>Dear ${data.parentName},</p>
          <p>The class for <strong>${data.studentName}</strong> on <strong>${data.date}</strong> at <strong>${data.startTime}</strong> has been cancelled.</p>
          ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
          <p>We will reach out to reschedule. Apologies for any inconvenience.</p>
        `),
      },
      trial_scheduled: {
        subject: `🎉 Exciting! Your Free Chess Trial Class is Scheduled!`,
        html: base(`
          <h2 style="color: #e44;">🏆 Welcome to EmberKids Chess Academy!</h2>
          <p>Dear ${data.parentName},</p>
          <p>We're thrilled to invite <strong>${data.studentName}</strong> for an exciting <strong>FREE trial chess class</strong>! This is the perfect opportunity to discover the fascinating world of chess.</p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #333;">📅 Class Details:</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li><strong>📆 Date:</strong> ${data.date}</li>
              <li><strong>⏰ Time:</strong> ${data.startTime} – ${data.endTime} (${data.timezone})</li>
            </ul>
          </div>
          ${data.meetingLink ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.meetingLink}" style="background: #e44; color: #fff; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(228, 68, 68, 0.3);">🚀 Join Now</a>
          </div>
          ` : ''}
          <p><strong>What to expect:</strong></p>
          <ul>
            <li>✨ Interactive chess lessons with our expert coaches</li>
            <li>🎮 Fun chess puzzles and games</li>
            <li>🧠 Introduction to strategic thinking</li>
            <li>👋 Meet our friendly chess community</li>
          </ul>
          <p><strong>📝 Tips for the trial class:</strong></p>
          <ul>
            <li>🖥️ Ensure stable internet connection</li>
            <li>🎧 Use headphones for better experience</li>
            <li>📝 Keep a notebook and pen ready</li>
            <li>😊 Come with enthusiasm and curiosity!</li>
          </ul>
          <p style="color: #e44; font-weight: bold;">We can't wait to meet ${data.studentName} and start this chess journey together!</p>
          <p>See you soon! ♟️</p>
          <p style="font-size: 14px; color: #666;">If you have any questions, feel free to reach out to us.</p>
        `),
      },
      trial_reminder: {
        subject: `Reminder: ${data.studentName}'s Chess Trial Class is Coming Up`,
        html: base(`
          <p>Dear ${data.parentName},</p>
          <p>This is a friendly reminder that <strong>${data.studentName}</strong>'s free chess trial class is coming up.</p>
          <ul>
            <li><strong>Date:</strong> ${data.date}</li>
            <li><strong>Time:</strong> ${data.startTime} – ${data.endTime} (${data.timezone})</li>
            ${data.meetingLink ? `<li><strong>Meeting:</strong> <a href="${data.meetingLink}">${data.meetingLink}</a></li>` : ''}
          </ul>
          <p>Please join on time with a stable internet connection.</p>
        `),
      },
      batch_whatsapp_link: {
        subject: `Join Your Chess Batch WhatsApp Community`,
        html: base(`
          <p>Dear ${data.parentName},</p>
          <p><strong>${data.studentName}</strong> has been added to <strong>${data.batchName}</strong> (${data.courseLevel}).</p>
          <p>Please join the WhatsApp community for updates:</p>
          <p><a href="${data.whatsappCommunityLink}">Join WhatsApp Community</a></p>
        `),
      },
      batch_completed: {
        subject: `Congratulations – ${data.batchName} Completed!`,
        html: base(`
          <p>Dear ${data.parentName},</p>
          <p>Congratulations! <strong>${data.studentName}</strong> has successfully completed <strong>${data.batchName}</strong> (${data.courseLevel}).</p>
          <p>We are proud of their progress and look forward to continuing their chess journey!</p>
        `),
      },
      payment_link_sent: {
        subject: `Payment Link – ${data.packageType || 'Chess Package'}`,
        html: base(`
          <p>Dear ${data.parentName},</p>
          <p>Please complete the payment for <strong>${data.studentName}</strong>'s <strong>${data.packageType || 'chess package'}</strong>.</p>
          <ul>
            <li><strong>Amount:</strong> ${data.currency} ${data.amount}</li>
            <li><strong>Method:</strong> Wise</li>
          </ul>
          <p><a href="${data.paymentUrl}" style="background:#5b3a29;color:#fff;padding:10px 18px;text-decoration:none;border-radius:6px;">View payment details</a></p>
          <pre style="white-space:pre-wrap;background:#f7f1e8;padding:12px;border-radius:8px;color:#333;">${data.paymentInstructions}</pre>
          <p>After paying, please share the Wise transfer receipt or reference with the academy team. Your package will be activated after manual verification.</p>
        `),
      },
      portal_frozen: {
        subject: `${data.studentName}'s Classes Paused`,
        html: base(`
          <p>Dear ${data.parentName},</p>
          <p><strong>${data.studentName}</strong>'s classes have been paused${data.reason ? `: ${data.reason}` : '.'}</p>
          <p>Your package countdown is on hold and ${data.studentName} will be excluded from upcoming batch classes until access is resumed. Nothing is lost - simply let us know when you're ready to continue.</p>
        `),
      },
      portal_unfrozen: {
        subject: `Welcome Back! ${data.studentName}'s Classes Have Resumed`,
        html: base(`
          <p>Dear ${data.parentName},</p>
          <p>Great news - <strong>${data.studentName}</strong>'s portal access and classes have resumed.</p>
          <p>Your package countdown is active again and ${data.studentName} will be included in upcoming batch scheduling. Welcome back!</p>
        `),
      },
      package_activated: {
        subject: `Package Activated – ${data.packageType}`,
        html: base(`
          <p>Dear ${data.parentName},</p>
          <p>Great news! <strong>${data.studentName}</strong>'s <strong>${data.packageType}</strong> (${data.courseLevel}) has been activated.</p>
          <p>Classes will begin as per your assigned schedule. Welcome aboard!</p>
        `),
      },
      package_near_completion: {
        subject: `Package Nearly Complete – ${data.remainingClasses} classes left`,
        html: base(`
          <p>Dear ${data.parentName},</p>
          <p><strong>${data.studentName}</strong> has only <strong>${data.remainingClasses}</strong> classes remaining in their current package.</p>
          <p>Please contact us to renew and avoid any interruption.</p>
        `),
      },
      credentials_created: {
        subject: `Your Student Portal Credentials`,
        html: base(`
          <p>Dear ${data.parentName},</p>
          <p>Here are the portal login credentials for <strong>${data.studentName}</strong>:</p>
          <ul>
            <li><strong>Email:</strong> ${data.email}</li>
            <li><strong>Password:</strong> ${data.tempPassword}</li>
          </ul>
          <p>Please log in and change your password immediately.</p>
        `),
      },
      help_request: {
        subject: `Help Request from ${data.studentName} - ${data.subject}`,
        html: base(`
          <h2>New Help Request</h2>
          <p><strong>From:</strong> ${data.studentName} (${data.fromEmail})</p>
          <p><strong>Subject:</strong> ${data.subject}</p>
          <p><strong>Topic:</strong> ${data.topic}</p>
          <hr style="margin: 20px 0; border-top: 1px solid #eee;" />
          <p><strong>Message:</strong></p>
          <p style="background: #f8f9fa; padding: 16px; border-radius: 8px; white-space: pre-wrap;">${data.message}</p>
          <hr style="margin: 20px 0; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #999;">Submitted on: ${data.submittedAt}</p>
        `),
      },
    };

    return templates[template] || {
      subject: `Notification from Chess Academy`,
      html: base(`<p>${JSON.stringify(data)}</p>`),
    };
  }
}

export default new EmailService();
