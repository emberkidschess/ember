import { Request, Response } from 'express';
import Payment, { PaymentStatus } from '../models/Payment';
import { AuthRequest } from '../middleware/auth';
import AuditLog, { AuditAction, AuditEntityType } from '../models/AuditLog';
import { buildAuditLogData } from '../middleware/auditLogger';
import { sanitizePaginationParams, sanitizeQueryParam } from '../utils/validation';

export const getPayments = async (req: AuthRequest, res: Response) => {
  try {
    const { student, status, page = '1', limit = '100' } = req.query;
    
    const filter: any = {};
    
    const sanitizedStudent = sanitizeQueryParam(student);
    const sanitizedStatus = sanitizeQueryParam(status);
    if (sanitizedStudent) filter.student = sanitizedStudent;
    if (sanitizedStatus) filter.status = sanitizedStatus;

    const { page: pageNum, limit: limitNum } = sanitizePaginationParams(page, limit);
    const skip = (pageNum - 1) * limitNum;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate('student', 'studentName parentName email phoneNumber')
        .populate('createdBy', 'name email')
        .select('student lead paymentLink package packageType courseLevel amount currency status paymentMethod manualPaymentReference paymentDate verifiedBy createdBy createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Payment.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: payments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payments',
    });
  }
};

export const getPaymentById = async (req: AuthRequest, res: Response) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('student', 'studentName parentName email phone')
      .populate('createdBy', 'name email');
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment',
    });
  }
};

export const createPayment = async (req: AuthRequest, res: Response) => {
  try {
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    const payment = await Payment.create({
      ...req.body,
      createdBy: req.user?.userId,
    });

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.CREATE,
      entityType: AuditEntityType.PAYMENT,
      entityId: payment._id,
      entityName: `Payment ${payment._id}`,
      success: true,
    }));

    res.status(201).json({
      success: true,
      data: payment,
      message: 'Payment created successfully',
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment',
    });
  }
};

export const updatePayment = async (req: AuthRequest, res: Response) => {
  try {
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    const existingPayment = await Payment.findById(req.params.id);
    if (!existingPayment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }
    if (existingPayment.status === PaymentStatus.PAID) {
      return res.status(409).json({
        success: false,
        error: 'Paid ledger entries are immutable',
      });
    }

    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { $set: { notes: req.body.notes } },
      { new: true, runValidators: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.PAYMENT,
      entityId: payment._id,
      entityName: `Payment ${payment._id}`,
      details: req.body,
      success: true,
    }));

    res.json({
      success: true,
      data: payment,
      message: 'Payment updated successfully',
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update payment',
    });
  }
};

export const deletePayment = async (req: AuthRequest, res: Response) => {
  try {
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    if (
      payment.status === PaymentStatus.PAID ||
      payment.paymentLink ||
      payment.package
    ) {
      return res.status(409).json({
        success: false,
        error: 'Paid or linked ledger entries are financial records and cannot be deleted',
      });
    }

    await payment.deleteOne();

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.DELETE,
      entityType: AuditEntityType.PAYMENT,
      entityId: payment._id,
      entityName: `Payment ${payment._id}`,
      success: true,
    }));

    res.json({
      success: true,
      message: 'Payment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete payment',
    });
  }
};

export const getPaymentStats = async (req: AuthRequest, res: Response) => {
  try {
    const total = await Payment.countDocuments();
    const paid = await Payment.countDocuments({ status: PaymentStatus.PAID });
    const pending = await Payment.countDocuments({ status: PaymentStatus.PENDING });
    const overdue = await Payment.countDocuments({ status: PaymentStatus.OVERDUE });
    
    const revenueResult = await Payment.aggregate([
      { $match: { status: PaymentStatus.PAID } },
      { $group: { _id: '$currency', total: { $sum: '$amount' } } },
    ]);
    const totalRevenueByCurrency = Object.fromEntries(revenueResult.map((item) => [item._id, item.total]));

    const pendingRevenueResult = await Payment.aggregate([
      { $match: { status: { $in: [PaymentStatus.PENDING, PaymentStatus.OVERDUE] } } },
      { $group: { _id: '$currency', total: { $sum: '$amount' } } },
    ]);
    const pendingRevenueByCurrency = Object.fromEntries(
      pendingRevenueResult.map((item) => [item._id, item.total])
    );

    res.json({
      success: true,
      data: {
        total,
        paid,
        pending,
        overdue,
        totalRevenueByCurrency,
        pendingRevenueByCurrency,
      },
    });
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment statistics',
    });
  }
};
