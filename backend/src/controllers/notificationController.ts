import { Request, Response } from 'express';
import Notification, { NotificationStatus, NotificationType } from '../models/Notification';
import DeliveryLog, { DeliveryStatus } from '../models/DeliveryLog';
import { AuthRequest } from '../middleware/auth';
import { ClientAuthRequest } from '../middleware/clientAuth';
import { retryFailedNotifications, retryNotificationById, sendNotification } from '../utils/notificationProcessor';
import { sanitizeQueryParam } from '../utils/validation';

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const { recipient, status, type, channel } = req.query;
    
    const filter: any = {};
    
    const sanitizedRecipient = sanitizeQueryParam(recipient);
    const sanitizedStatus = sanitizeQueryParam(status);
    const sanitizedType = sanitizeQueryParam(type);
    const sanitizedChannel = sanitizeQueryParam(channel);
    if (sanitizedRecipient) filter.recipient = sanitizedRecipient;
    if (sanitizedStatus) filter.status = sanitizedStatus;
    if (sanitizedType) filter.type = sanitizedType;
    if (sanitizedChannel) filter.channel = sanitizedChannel;

    const notifications = await Notification.find(filter)
      .populate('recipient', 'name email')
      .select('recipient recipientType type channel status content sentAt errorMessage retryCount createdAt')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
    });
  }
};

export const getStudentNotifications = async (req: ClientAuthRequest, res: Response) => {
  try {
    const studentId = req.studentUser?.id;
    if (!studentId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const notifications = await Notification.find({
      recipient: studentId,
      recipientType: 'Student',
    })
      .select('type channel status content sentAt createdAt')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error('Error fetching student notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
    });
  }
};

export const getNotificationById = async (req: AuthRequest, res: Response) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('recipient', 'name email')
      .lean();
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification',
    });
  }
};

export const createNotification = async (req: AuthRequest, res: Response) => {
  try {
    const notification = await sendNotification({
      recipient: req.body.recipient,
      recipientType: req.body.recipientType || 'Student',
      type: req.body.type,
      channel: req.body.channel,
      content: req.body.content || {},
    });

    if (!notification) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create notification',
      });
    }

    res.status(201).json({
      success: true,
      data: notification,
      message: 'Notification created and sent successfully',
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create notification',
    });
  }
};

export const retryNotification = async (req: AuthRequest, res: Response) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    const delivered = await retryNotificationById(notification._id.toString());

    res.json({
      success: true,
      message: delivered ? 'Notification delivered successfully' : 'Notification retry failed and was logged',
    });
  } catch (error) {
    console.error('Error retrying notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retry notification',
    });
  }
};

export const retryAllFailed = async (req: AuthRequest, res: Response) => {
  try {
    await retryFailedNotifications();
    
    res.json({
      success: true,
      message: 'Failed notifications retry initiated',
    });
  } catch (error) {
    console.error('Error retrying failed notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retry notifications',
    });
  }
};

export const getDeliveryLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { notificationId, channel, status } = req.query;
    
    const filter: any = {};
    
    const sanitizedNotificationId = sanitizeQueryParam(notificationId);
    const sanitizedChannel = sanitizeQueryParam(channel);
    const sanitizedStatus = sanitizeQueryParam(status);
    if (sanitizedNotificationId) filter.notificationId = sanitizedNotificationId;
    if (sanitizedChannel) filter.channel = sanitizedChannel;
    if (sanitizedStatus) filter.status = sanitizedStatus;

    const logs = await DeliveryLog.find(filter)
      .populate('notificationId', 'type content')
      .select('notificationId channel recipient status messageId errorMessage retryCount sentAt createdAt')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Error fetching delivery logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch delivery logs',
    });
  }
};

export const getNotificationStats = async (req: AuthRequest, res: Response) => {
  try {
    const total = await Notification.countDocuments();
    const pending = await Notification.countDocuments({ status: NotificationStatus.PENDING });
    const sent = await Notification.countDocuments({ status: NotificationStatus.SENT });
    const failed = await Notification.countDocuments({ status: NotificationStatus.FAILED });

    const byType = await Notification.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    const byChannel = await Notification.aggregate([
      { $group: { _id: '$channel', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        total,
        pending,
        sent,
        failed,
        byType,
        byChannel,
      },
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification statistics',
    });
  }
};
