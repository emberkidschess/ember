import DeliveryLog, { DeliveryStatus } from '../models/DeliveryLog';
import Notification, {
  INotification,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from '../models/Notification';
import logger from './logger';

export interface NotificationPayload {
  recipient: string;
  recipientType?: 'Student' | 'Staff';
  type: NotificationType;
  channel: NotificationChannel;
  content: {
    subject?: string;
    body?: string;
    template?: string;
    data?: Record<string, unknown>;
  };
}

async function resolveRecipientEmail(recipientId: unknown, recipientType: 'Student' | 'Staff' = 'Student'): Promise<string | null> {
  if (recipientType === 'Staff') {
    const Staff = (await import('../models/Staff')).default;
    const staff = await Staff.findById(recipientId).select('email').lean();
    return (staff as { email?: string } | null)?.email || null;
  }

  const Student = (await import('../models/Student')).default;
  const student = await Student.findById(recipientId).select('email').lean();
  return (student as { email?: string } | null)?.email || null;
}

async function resolveRecipientPhone(recipientId: unknown, recipientType: 'Student' | 'Staff' = 'Student'): Promise<string | null> {
  if (recipientType === 'Staff') {
    const Staff = (await import('../models/Staff')).default;
    const staff = await Staff.findById(recipientId).select('phone').lean();
    return (staff as { phone?: string } | null)?.phone || null;
  }

  const Student = (await import('../models/Student')).default;
  const student = await Student.findById(recipientId).select('phoneNumber').lean();
  return (student as { phoneNumber?: string } | null)?.phoneNumber || null;
}

function humanizeNotificationType(type: NotificationType): string {
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeContent(type: NotificationType, content: NotificationPayload['content']) {
  const subject = content.subject || humanizeNotificationType(type);
  const body =
    content.body ||
    (content.data
      ? `${subject}: ${Object.entries(content.data)
          .map(([key, value]) => `${key}=${String(value)}`)
          .join(', ')}`
      : `You have a new ${subject} notification.`);

  return {
    subject,
    body,
    template: content.template,
    data: content.data,
  };
}

async function markDeliveryFailure(
  notification: INotification,
  deliveryLogId: unknown,
  error: unknown,
  incrementRetry: boolean
) {
  const message = error instanceof Error ? error.message : String(error);
  if (incrementRetry) notification.retryCount += 1;
  notification.status = NotificationStatus.FAILED;
  notification.errorMessage = message;
  await notification.save();

  await DeliveryLog.findByIdAndUpdate(deliveryLogId, {
    status: DeliveryStatus.FAILED,
    errorMessage: message,
    retryCount: notification.retryCount,
  });
}

async function deliverNotification(notification: INotification, incrementRetry = true): Promise<void> {
  const recipientType = notification.recipientType || 'Student';
  const recipientId = notification.recipient.toString();
  let destination = recipientId;
  const deliveryLog = await DeliveryLog.create({
    notificationId: notification._id,
    channel: notification.channel,
    recipient: destination,
    status: DeliveryStatus.PENDING,
    retryCount: notification.retryCount,
  });

  try {
    if (notification.channel === NotificationChannel.EMAIL) {
      const email = await resolveRecipientEmail(notification.recipient, recipientType);
      if (!email) throw new Error(`No email address found for ${recipientType} ${recipientId}`);
      destination = email;

      const emailService = (await import('../services/emailService')).default;
      await emailService.sendRawEmail(email, notification.content.subject || humanizeNotificationType(notification.type), notification.content.body);

      await DeliveryLog.findByIdAndUpdate(deliveryLog._id, {
        recipient: destination,
        status: DeliveryStatus.SENT,
        sentAt: new Date(),
      });
    } else if (notification.channel === NotificationChannel.WHATSAPP) {
      const phone = await resolveRecipientPhone(notification.recipient, recipientType);
      if (!phone) throw new Error(`No phone number found for ${recipientType} ${recipientId}`);
      destination = phone;

      const whatsappService = (await import('../services/whatsappService')).default;
      const messageId = await whatsappService.sendMessage(phone, notification.content.body);

      await DeliveryLog.findByIdAndUpdate(deliveryLog._id, {
        recipient: destination,
        status: DeliveryStatus.SENT,
        messageId,
        sentAt: new Date(),
      });
    } else {
      throw new Error(`Unsupported notification channel: ${notification.channel}`);
    }

    notification.status = NotificationStatus.SENT;
    notification.sentAt = new Date();
    notification.errorMessage = undefined;
    await notification.save();
  } catch (error) {
    await markDeliveryFailure(notification, deliveryLog._id, error, incrementRetry);
    throw error;
  }
}

export async function sendNotification(
  recipientOrPayload: string | NotificationPayload,
  type?: NotificationType,
  channel?: NotificationChannel,
  content?: { subject?: string; body?: string; data?: Record<string, unknown> }
): Promise<INotification | null> {
  let payload: NotificationPayload;

  if (typeof recipientOrPayload === 'string') {
    payload = {
      recipient: recipientOrPayload,
      recipientType: 'Student',
      type: type!,
      channel: channel!,
      content: content || {},
    };
  } else {
    payload = recipientOrPayload;
  }

  const normalizedContent = normalizeContent(payload.type, payload.content);

  try {
    const notification = await Notification.create({
      recipient: payload.recipient,
      recipientType: payload.recipientType || 'Student',
      type: payload.type,
      channel: payload.channel,
      status: NotificationStatus.PENDING,
      content: normalizedContent,
      retryCount: 0,
    });

    try {
      await deliverNotification(notification);
    } catch (deliveryError) {
      logger.warn('Notification delivery failed and was marked for retry:', deliveryError);
    }

    return notification;
  } catch (error) {
    logger.error('Failed to queue notification:', error);
    return null;
  }
}

export async function retryNotificationById(notificationId: string): Promise<boolean> {
  const notification = await Notification.findById(notificationId);
  if (!notification) return false;

  notification.status = NotificationStatus.PENDING;
  notification.errorMessage = undefined;
  await notification.save();

  try {
    await deliverNotification(notification);
    return true;
  } catch (error) {
    logger.warn(`Notification retry failed for ${notificationId}:`, error);
    return false;
  }
}

export async function retryFailedNotifications(): Promise<void> {
  try {
    const failedNotifications = await Notification.find({
      status: NotificationStatus.FAILED,
      retryCount: { $lt: 3 },
    })
      .sort({ updatedAt: 1 })
      .limit(50);

    for (const notification of failedNotifications) {
      try {
        await deliverNotification(notification);
      } catch (error) {
        logger.warn(`Notification retry failed for ${notification._id}:`, error);
      }
    }
  } catch (error) {
    logger.error('Failed to retry notifications:', error);
  }
}
