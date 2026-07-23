import nodemailer from 'nodemailer';
import logger from '../utils/logger';

type EmailTemplate =
  | 'password_reset'
  | 'class_scheduled'
  | 'class_reminder'
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
  | 'student_credentials_updated'
  | 'staff_credentials_created'
  | 'staff_password_reset'
  | 'help_request'
  | string;

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.init();
  }

  isConfigured(): boolean {
    return Boolean(this.transporter);
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
      <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:0;background:#ffffff;">
        <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:32px 24px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:600;letter-spacing:0.5px;">EmberKids Chess Academy</h1>
          <p style="margin:8px 0 0;color:#b8c5d6;font-size:14px;">Where Grandmasters Begin</p>
        </div>
        <div style="padding:32px 24px;color:#333333;">
          ${content}
        </div>
        <div style="background:#f8f9fa;padding:24px;border-top:1px solid #e5e7eb;">
          <p style="margin:0 0 8px;color:#6b7280;font-size:13px;font-weight:500;">EmberKids Chess Academy</p>
          <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">Email: hello@emberkidschess.com</p>
          <p style="margin:0;color:#9ca3af;font-size:12px;">Phone: +91 88240 44647</p>
        </div>
        <div style="background:#1a1a2e;padding:16px 24px;text-align:center;">
          <p style="margin:0;color:#6b7280;font-size:11px;">© ${new Date().getFullYear()} EmberKids Chess Academy. All rights reserved.</p>
        </div>
      </div>
    `;

    const templates: Record<string, { subject: string; html: string }> = {
      password_reset: {
        subject: 'Password Reset Request - EmberKids Chess Academy',
        html: base(`
          <h2 style="color:#1a1a2e;margin-bottom:16px;">Password Reset Request</h2>
          <p style="margin:0 0 16px;line-height:1.6;">Hello,</p>
          <p style="margin:0 0 16px;line-height:1.6;">We received a request to reset your password for your EmberKids Chess Academy account. Click the button below to proceed:</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${data.resetUrl}" style="display:inline-block;background:#e04a15;color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Reset Password</a>
          </div>
          <p style="margin:0 0 8px;line-height:1.6;color:#6b7280;font-size:13px;">This link will expire in ${data.expiresIn}.</p>
          <p style="margin:0 0 16px;line-height:1.6;">If you didn't request this password reset, please ignore this email. Your account remains secure.</p>
        `),
      },
      class_scheduled: {
        subject: `Class Scheduled - ${data.date} at ${data.startTime}`,
        html: base(`
          <h2 style="color:#1a1a2e;margin-bottom:16px;">Class Scheduled</h2>
          <p style="margin:0 0 16px;line-height:1.6;">Dear ${data.parentName},</p>
          <p style="margin:0 0 16px;line-height:1.6;">A class has been scheduled for <strong>${data.studentName}</strong>:</p>
          <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:16px 0;">
            <p style="margin:0 0 8px;"><strong>Date:</strong> ${data.date}</p>
            <p style="margin:0 0 8px;"><strong>Time:</strong> ${data.startTime} – ${data.endTime} (${data.timezone})</p>
            ${data.meetingLink ? `<p style="margin:0;"><strong>Meeting Link:</strong> <a href="${data.meetingLink}" style="color:#e04a15;text-decoration:none;">Join Class</a></p>` : ''}
          </div>
          <p style="margin:0 0 16px;line-height:1.6;">Please ensure ${data.studentName} is prepared and joins on time.</p>
        `),
      },
      class_reminder: {
        subject: `Reminder: Class in 1 hour - ${data.date} at ${data.startTime}`,
        html: base(`
          <h2 style="color:#1a1a2e;margin-bottom:16px;">Your Class Starts in 1 Hour</h2>
          <p style="margin:0 0 16px;line-height:1.6;">Dear ${data.parentName},</p>
          <p style="margin:0 0 16px;line-height:1.6;">This is a friendly reminder that <strong>${data.studentName}</strong> has a chess class coming up soon.</p>
          <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:16px 0;">
            <p style="margin:0 0 8px;"><strong>Course:</strong> ${data.course}</p>
            ${data.batchName ? `<p style="margin:0 0 8px;"><strong>Batch:</strong> ${data.batchName}</p>` : ''}
            <p style="margin:0 0 8px;"><strong>Date:</strong> ${data.date}</p>
            <p style="margin:0 0 8px;"><strong>Time:</strong> ${data.startTime} – ${data.endTime} (${data.timezone})</p>
            ${data.coachName ? `<p style="margin:0 0 8px;"><strong>Coach:</strong> ${data.coachName}</p>` : ''}
            ${data.meetingLink ? `<p style="margin:0;"><strong>Meeting Link:</strong> <a href="${data.meetingLink}" style="color:#e04a15;text-decoration:none;">Join Class</a></p>` : ''}
          </div>
          <p style="margin:0 0 16px;line-height:1.6;">Please be ready a few minutes early so ${data.studentName} can join on time.</p>
        `),
      },
      class_rescheduled: {
        subject: `Class Rescheduled - ${data.newDate} at ${data.startTime}`,
        html: base(`
          <h2 style="color:#1a1a2e;margin-bottom:16px;">Class Rescheduled</h2>
          <p style="margin:0 0 16px;line-height:1.6;">Dear ${data.parentName},</p>
          <p style="margin:0 0 16px;line-height:1.6;">The class for <strong>${data.studentName}</strong> has been rescheduled:</p>
          <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:16px 0;">
            <p style="margin:0 0 8px;"><strong>New Date:</strong> ${data.newDate}</p>
            <p style="margin:0 0 8px;"><strong>New Time:</strong> ${data.startTime} – ${data.endTime} (${data.timezone})</p>
            ${data.reason ? `<p style="margin:0 0 8px;"><strong>Reason:</strong> ${data.reason}</p>` : ''}
            ${data.meetingLink ? `<p style="margin:0;"><strong>Meeting Link:</strong> <a href="${data.meetingLink}" style="color:#e04a15;text-decoration:none;">Join Class</a></p>` : ''}
          </div>
          <p style="margin:0 0 16px;line-height:1.6;">We apologize for any inconvenience and appreciate your understanding.</p>
        `),
      },
      class_cancelled: {
        subject: `Class Cancelled - ${data.date} at ${data.startTime}`,
        html: base(`
          <h2 style="color:#1a1a2e;margin-bottom:16px;">Class Cancelled</h2>
          <p style="margin:0 0 16px;line-height:1.6;">Dear ${data.parentName},</p>
          <p style="margin:0 0 16px;line-height:1.6;">The class for <strong>${data.studentName}</strong> scheduled for <strong>${data.date}</strong> at <strong>${data.startTime}</strong> has been cancelled.</p>
          ${data.reason ? `<p style="margin:0 0 16px;line-height:1.6;"><strong>Reason:</strong> ${data.reason}</p>` : ''}
          <p style="margin:0 0 16px;line-height:1.6;">We will reach out to reschedule at your earliest convenience. We apologize for any inconvenience.</p>
        `),
      },
      trial_scheduled: {
        subject: `Free Trial Class Scheduled - ${data.date}`,
        html: base(`
          <h2 style="color:#1a1a2e;margin-bottom:16px;">Welcome to EmberKids Chess Academy!</h2>
          <p style="margin:0 0 16px;line-height:1.6;">Dear ${data.parentName},</p>
          <p style="margin:0 0 16px;line-height:1.6;">We're thrilled to invite <strong>${data.studentName}</strong> for a <strong>FREE trial chess class</strong>! This is an excellent opportunity to experience our coaching methodology.</p>
          <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:16px 0;">
            <p style="margin:0 0 8px;"><strong>Date:</strong> ${data.date}</p>
            <p style="margin:0 0 8px;"><strong>Time:</strong> ${data.startTime} – ${data.endTime} (${data.timezone})</p>
          </div>
          ${data.meetingLink ? `
          <div style="text-align:center;margin:24px 0;">
            <a href="${data.meetingLink}" style="display:inline-block;background:#e04a15;color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Join Trial Class</a>
          </div>
          ` : ''}
          <p style="margin:0 0 16px;line-height:1.6;"><strong>What to expect:</strong></p>
          <ul style="margin:0 0 16px;padding-left:20px;line-height:1.6;">
            <li>Interactive chess lessons with expert coaches</li>
            <li>Fun chess puzzles and strategic games</li>
            <li>Introduction to competitive thinking</li>
            <li>Meet our chess community</li>
          </ul>
          <p style="margin:0 0 16px;line-height:1.6;"><strong>Preparation tips:</strong></p>
          <ul style="margin:0 0 16px;padding-left:20px;line-height:1.6;">
            <li>Ensure stable internet connection</li>
            <li>Use headphones for better experience</li>
            <li>Keep a notebook and pen ready</li>
          </ul>
          <p style="margin:0 0 16px;line-height:1.6;">We look forward to meeting ${data.studentName} and beginning this chess journey together!</p>
        `),
      },
      trial_reminder: {
        subject: `Reminder: Trial Class Tomorrow - ${data.date}`,
        html: base(`
          <h2 style="color:#1a1a2e;margin-bottom:16px;">Trial Class Reminder</h2>
          <p style="margin:0 0 16px;line-height:1.6;">Dear ${data.parentName},</p>
          <p style="margin:0 0 16px;line-height:1.6;">This is a friendly reminder that <strong>${data.studentName}</strong>'s free chess trial class is coming up:</p>
          <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:16px 0;">
            <p style="margin:0 0 8px;"><strong>Date:</strong> ${data.date}</p>
            <p style="margin:0 0 8px;"><strong>Time:</strong> ${data.startTime} – ${data.endTime} (${data.timezone})</p>
            ${data.meetingLink ? `<p style="margin:0;"><strong>Meeting Link:</strong> <a href="${data.meetingLink}" style="color:#e04a15;text-decoration:none;">Join Class</a></p>` : ''}
          </div>
          <p style="margin:0 0 16px;line-height:1.6;">Please ensure ${data.studentName} joins on time with a stable internet connection.</p>
        `),
      },
      batch_whatsapp_link: {
        subject: `WhatsApp Community - ${data.batchName}`,
        html: base(`
          <h2 style="color:#1a1a2e;margin-bottom:16px;">Join Your Batch Community</h2>
          <p style="margin:0 0 16px;line-height:1.6;">Dear ${data.parentName},</p>
          <p style="margin:0 0 16px;line-height:1.6;"><strong>${data.studentName}</strong> has been added to <strong>${data.batchName}</strong> (${data.courseLevel}).</p>
          <p style="margin:0 0 16px;line-height:1.6;">Please join the WhatsApp community to stay updated with batch announcements and important information:</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${data.whatsappCommunityLink}" style="display:inline-block;background:#25D366;color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Join WhatsApp Community</a>
          </div>
        `),
      },
      batch_completed: {
        subject: `Congratulations - ${data.batchName} Completed!`,
        html: base(`
          <h2 style="color:#1a1a2e;margin-bottom:16px;">Congratulations!</h2>
          <p style="margin:0 0 16px;line-height:1.6;">Dear ${data.parentName},</p>
          <p style="margin:0 0 16px;line-height:1.6;">Congratulations! <strong>${data.studentName}</strong> has successfully completed <strong>${data.batchName}</strong> (${data.courseLevel}).</p>
          <p style="margin:0 0 16px;line-height:1.6;">We are proud of their progress and look forward to continuing their chess journey together!</p>
        `),
      },
      payment_link_sent: {
        subject: `Payment Required - ${data.packageType || 'Chess Package'}`,
        html: base(`
          <h2 style="color:#1a1a2e;margin-bottom:16px;">Payment Required</h2>
          <p style="margin:0 0 16px;line-height:1.6;">Dear ${data.parentName},</p>
          <p style="margin:0 0 16px;line-height:1.6;">Please complete the payment for <strong>${data.studentName}</strong>'s <strong>${data.packageType || 'chess package'}</strong>:</p>
          <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:16px 0;">
            <p style="margin:0 0 8px;"><strong>Amount:</strong> ${data.currency} ${data.amount}</p>
            <p style="margin:0 0 8px;"><strong>Payment Method:</strong> Wise</p>
          </div>
          <div style="text-align:center;margin:24px 0;">
            <a href="${data.paymentUrl}" style="display:inline-block;background:#e04a15;color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">View Payment Details</a>
          </div>
          <div style="background:#f7f1e8;padding:16px;border-radius:8px;margin:16px 0;">
            <p style="margin:0 0 8px;font-weight:600;">Payment Instructions:</p>
            <pre style="margin:0;white-space:pre-wrap;color:#333;font-size:13px;">${data.paymentInstructions}</pre>
          </div>
          <p style="margin:0 0 16px;line-height:1.6;">After payment, please share the Wise transfer receipt or reference with the academy team. Your package will be activated after manual verification.</p>
        `),
      },
      portal_frozen: {
        subject: `Classes Paused - ${data.studentName}`,
        html: base(`
          <h2 style="color:#1a1a2e;margin-bottom:16px;">Classes Paused</h2>
          <p style="margin:0 0 16px;line-height:1.6;">Dear ${data.parentName},</p>
          <p style="margin:0 0 16px;line-height:1.6;"><strong>${data.studentName}</strong>'s classes have been paused${data.reason ? `: ${data.reason}` : '.'}</p>
          <p style="margin:0 0 16px;line-height:1.6;">Your package countdown is on hold and ${data.studentName} will be excluded from upcoming batch classes until access is resumed. No classes are lost - simply let us know when you're ready to continue.</p>
        `),
      },
      portal_unfrozen: {
        subject: `Welcome Back - ${data.studentName}'s Classes Resumed`,
        html: base(`
          <h2 style="color:#1a1a2e;margin-bottom:16px;">Welcome Back!</h2>
          <p style="margin:0 0 16px;line-height:1.6;">Dear ${data.parentName},</p>
          <p style="margin:0 0 16px;line-height:1.6;">Great news - <strong>${data.studentName}</strong>'s portal access and classes have resumed.</p>
          <p style="margin:0 0 16px;line-height:1.6;">Your package countdown is active again and ${data.studentName} will be included in upcoming batch scheduling. Welcome back to EmberKids Chess Academy!</p>
        `),
      },
      package_activated: {
        subject: `Package Activated - ${data.packageType}`,
        html: base(`
          <h2 style="color:#1a1a2e;margin-bottom:16px;">Package Activated</h2>
          <p style="margin:0 0 16px;line-height:1.6;">Dear ${data.parentName},</p>
          <p style="margin:0 0 16px;line-height:1.6;">Great news! <strong>${data.studentName}</strong>'s <strong>${data.packageType}</strong> (${data.courseLevel}) has been activated.</p>
          <p style="margin:0 0 16px;line-height:1.6;">Classes will begin as per the assigned schedule. Welcome to EmberKids Chess Academy!</p>
        `),
      },
      package_near_completion: {
        subject: `Package Expiring Soon - ${data.remainingClasses} Classes Left`,
        html: base(`
          <h2 style="color:#1a1a2e;margin-bottom:16px;">Package Expiring Soon</h2>
          <p style="margin:0 0 16px;line-height:1.6;">Dear ${data.parentName},</p>
          <p style="margin:0 0 16px;line-height:1.6;"><strong>${data.studentName}</strong> has only <strong>${data.remainingClasses}</strong> classes remaining in their current package.</p>
          <p style="margin:0 0 16px;line-height:1.6;">Please contact us to renew and avoid any interruption in their chess learning journey.</p>
        `),
      },
      credentials_created: {
        subject: `Student Portal Credentials - ${data.studentName}`,
        html: base(`
          <h2 style="color:#1a1a2e;margin-bottom:16px;">Your Student Portal Credentials</h2>
          <p style="margin:0 0 16px;line-height:1.6;">Dear ${data.parentName},</p>
          <p style="margin:0 0 16px;line-height:1.6;">Here are the portal login credentials for <strong>${data.studentName}</strong>:</p>
          <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:16px 0;">
            <p style="margin:0 0 8px;"><strong>Email:</strong> ${data.email}</p>
            <p style="margin:0 0 8px;"><strong>Password:</strong> ${data.tempPassword}</p>
          </div>
          <p style="margin:0 0 16px;line-height:1.6;">Please log in and change the password immediately for security.</p>
        `),
      },
      student_credentials_updated: {
        subject: `Login Updated - ${data.studentName}`,
        html: base(`
          <h2 style="color:#1a1a2e;margin-bottom:16px;">Student Portal Login Updated</h2>
          <p style="margin:0 0 16px;line-height:1.6;">Dear ${data.parentName},</p>
          <p style="margin:0 0 16px;line-height:1.6;">The student portal login for <strong>${data.studentName}</strong> has been updated by the academy team.</p>
          <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:16px 0;">
            <p style="margin:0 0 8px;"><strong>Email:</strong> ${data.email}</p>
            <p style="margin:0 0 8px;"><strong>New Password:</strong> ${data.tempPassword}</p>
          </div>
          <p style="margin:0 0 16px;line-height:1.6;">Please log in with the new password and change it immediately. If you did not request this change, please contact the academy team right away.</p>
        `),
      },
      staff_credentials_created: {
        subject: `Staff Portal Access - EmberKids Chess Academy`,
        html: base(`
          <h2 style="color:#1a1a2e;margin-bottom:16px;">Your Staff Portal Access</h2>
          <p style="margin:0 0 16px;line-height:1.6;">Dear ${data.name},</p>
          <p style="margin:0 0 16px;line-height:1.6;">Your <strong>EmberKids ${data.roleLabel}</strong> portal access has been created.</p>
          <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:16px 0;">
            <p style="margin:0 0 8px;"><strong>Login Email:</strong> ${data.email}</p>
            <p style="margin:0 0 8px;"><strong>Temporary Password:</strong> ${data.tempPassword}</p>
          </div>
          <p style="margin:0 0 16px;line-height:1.6;">Please sign in from the staff portal and change your password immediately. Keep these credentials private and secure.</p>
        `),
      },
      staff_password_reset: {
        subject: `Staff Password Reset - EmberKids Chess Academy`,
        html: base(`
          <h2 style="color:#1a1a2e;margin-bottom:16px;">Staff Password Reset</h2>
          <p style="margin:0 0 16px;line-height:1.6;">Dear ${data.name},</p>
          <p style="margin:0 0 16px;line-height:1.6;">Your staff portal password was reset by an administrator.</p>
          <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:16px 0;">
            <p style="margin:0 0 8px;"><strong>Login Email:</strong> ${data.email}</p>
            <p style="margin:0 0 8px;"><strong>New Password:</strong> ${data.tempPassword}</p>
          </div>
          <p style="margin:0 0 16px;line-height:1.6;">Please sign in and change this password immediately. If this was unexpected, please contact an administrator before using the account.</p>
        `),
      },
      help_request: {
        subject: `Help Request - ${data.studentName}`,
        html: base(`
          <h2 style="color:#1a1a2e;margin-bottom:16px;">New Help Request</h2>
          <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:16px 0;">
            <p style="margin:0 0 8px;"><strong>From:</strong> ${data.studentName} (${data.fromEmail})</p>
            <p style="margin:0 0 8px;"><strong>Subject:</strong> ${data.subject}</p>
            <p style="margin:0;"><strong>Topic:</strong> ${data.topic}</p>
          </div>
          <p style="margin:16px 0 8px;font-weight:600;">Message:</p>
          <div style="background:#f8f9fa;padding:16px;border-radius:8px;margin:16px 0;">
            <p style="margin:0;white-space:pre-wrap;color:#333;">${data.message}</p>
          </div>
          <p style="margin:16px 0 0;color:#6b7280;font-size:12px;">Submitted on: ${data.submittedAt}</p>
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
