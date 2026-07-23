import mongoose, { Schema, Document, Model } from 'mongoose';

export enum NotificationChannel {
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}

export enum NotificationType {
  ENROLLMENT = 'enrollment',
  CLASS_SCHEDULED = 'class_scheduled',
  CLASS_SCHEDULED_CONFIRMATION = 'class_scheduled_confirmation',
  CLASS_REMINDER = 'class_reminder',
  STAFF_DAILY_SCHEDULE = 'staff_daily_schedule',
  CLASS_NOT_STARTED = 'class_not_started',
  CLASS_MISSED = 'class_missed',
  CLASS_RESCHEDULED = 'class_rescheduled',
  CLASS_CANCELLED = 'class_cancelled',
  ATTENDANCE_UPDATE = 'attendance_update',
  PAYMENT_REMINDER = 'payment_reminder',
  PAYMENT_LINK_SENT = 'payment_link_sent',
  PAYMENT_RECEIVED = 'payment_received',
  PACKAGE_ACTIVATED = 'package_activated',
  PACKAGE_NEAR_COMPLETION = 'package_near_completion',
  PACKAGE_COMPLETION = 'package_completion',
  RENEWAL_REMINDER = 'renewal_reminder',
  UPGRADE_RECOMMENDATION = 'upgrade_recommendation',
  COURSE_UPGRADE_COMPLETED = 'course_upgrade_completed',
  REPORT_CARD_PUBLISHED = 'report_card_published',
  ACCOUNT_ACTIVATED = 'account_activated',
  TRIAL_SCHEDULED = 'trial_scheduled',
  TRIAL_RESULT = 'trial_result',
  CREDENTIALS_CREATED = 'credentials_created',
  PACKAGE_ASSIGNED = 'package_assigned',
  BATCH_COMPLETED = 'batch_completed',
  TRIAL_RESULT_READY = 'trial_result_ready',
  // Portal freeze/pause lifecycle
  PORTAL_FROZEN = 'portal_frozen',
  PORTAL_UNFROZEN = 'portal_unfrozen',
  // Attendance dispute lifecycle
  ATTENDANCE_DISPUTE_RAISED = 'attendance_dispute_raised',
  ATTENDANCE_DISPUTE_RESOLVED = 'attendance_dispute_resolved',
  // Batch completion + renewal window
  RENEWAL_CONFIRMED = 'renewal_confirmed',
  CLASS_NOTES_POSTED = 'class_notes_posted',
}

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  // Which collection `recipient` refers to - notificationProcessor's retry
  // logic needs this to resolve the correct email address; without it,
  // every retry assumed Student, silently failing for Staff-targeted
  // notifications (e.g. the coach alert in scheduleTrialClass).
  recipientType: 'Student' | 'Staff';
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  content: {
    subject?: string;
    body: string;
    template?: string;
    data?: Record<string, any>;
  };
  sentAt?: Date;
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      refPath: 'recipientType',
      required: true,
      index: true,
    },
    recipientType: {
      type: String,
      enum: ['Student', 'Staff'],
      required: true,
      default: 'Student',
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },
    channel: {
      type: String,
      enum: Object.values(NotificationChannel),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(NotificationStatus),
      default: NotificationStatus.PENDING,
      required: true,
      index: true,
    },
    content: {
      subject: {
        type: String,
      },
      body: {
        type: String,
        required: true,
      },
      template: {
        type: String,
      },
      data: {
        type: Schema.Types.Mixed,
      },
    },
    sentAt: {
      type: Date,
    },
    errorMessage: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ recipient: 1, status: 1, createdAt: -1 });
NotificationSchema.index({ status: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, createdAt: -1 });

const Notification: Model<INotification> = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
