import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Lead, { LeadStatus, LeadSource, LeadCategory } from '../models/Lead';
import { AuthRequest } from '../middleware/auth';
import AuditLog, { AuditAction, AuditEntityType } from '../models/AuditLog';
import { sanitizeQueryParam, sanitizePaginationParams } from '../utils/validation';
import { CacheService, generateCacheKey, CacheNamespaces } from '../utils/cache';

export const createPublicLead = async (req: Request, res: Response) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const lead = await Lead.create({
      ...req.body,
      notes: req.body.message,
      leadSource: LeadSource.WEBSITE,
      status: LeadStatus.NEW,
      leadCategory: req.body.leadCategory || LeadCategory.BEGINNER,
    });

    await AuditLog.create({
      userId: null,
      userEmail: req.body.email || 'unknown',
      userName: req.body.studentName || 'Unknown',
      userRole: 'public',
      action: AuditAction.CREATE,
      entityType: AuditEntityType.LEAD,
      entityId: lead._id,
      entityName: lead.studentName,
      ipAddress,
      userAgent,
      success: true,
    });

    res.status(201).json({
      success: true,
      data: lead,
      message: 'Trial request submitted successfully. Our team will contact you within 24 hours.',
    });
  } catch (error: any) {
    console.error('Error creating public lead:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: `Validation error: ${error.message}`,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to submit trial request due to server error',
    });
  }
};

export const getLeads = async (req: AuthRequest, res: Response) => {
  try {
    const { status, source, category, dateFrom, dateTo, includeConverted, page = '1', limit = '20' } = req.query;
    
    const filter: any = {};
    
    // A lead that has already become a student is no longer a "lead" from an
    // operational standpoint - it belongs in the Students module, not here.
    // includeConverted=true is available for reporting/audit views that
    // explicitly want the full historical list.
    if (includeConverted !== 'true') {
      filter.convertedToStudent = { $ne: true };
    }

    const sanitizedStatus = sanitizeQueryParam(status);
    const sanitizedSource = sanitizeQueryParam(source);
    const sanitizedCategory = sanitizeQueryParam(category);
    
    if (sanitizedStatus) filter.status = sanitizedStatus;
    if (sanitizedSource) filter.leadSource = sanitizedSource;
    if (sanitizedCategory) filter.leadCategory = sanitizedCategory;
    
    const sanitizedDateFrom = sanitizeQueryParam(dateFrom);
    const sanitizedDateTo = sanitizeQueryParam(dateTo);
    
    if (sanitizedDateFrom || sanitizedDateTo) {
      filter.createdAt = {};
      if (sanitizedDateFrom) filter.createdAt.$gte = new Date(sanitizedDateFrom);
      if (sanitizedDateTo) filter.createdAt.$lte = new Date(sanitizedDateTo);
    }

    const { page: pageNum, limit: limitNum } = sanitizePaginationParams(page, limit);
    const skip = (pageNum - 1) * limitNum;

    // Generate cache key based on filters and pagination
    const cacheKey = generateCacheKey(
      CacheNamespaces.LEAD_LIST,
      `${sanitizedStatus}-${sanitizedSource}-${sanitizedCategory}-${sanitizedDateFrom}-${sanitizedDateTo}-${includeConverted}-${pageNum}-${limitNum}`
    );

    // Try to get from cache first
    const cached = await CacheService.get<{ data: any[]; pagination: any }>(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached.data,
        pagination: cached.pagination,
        cached: true,
      });
    }

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Lead.countDocuments(filter)
    ]);

    const result = {
      data: leads,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };

    // Cache the result for 2 minutes (120 seconds)
    await CacheService.set(cacheKey, result, 120);

    res.json({
      success: true,
      ...result,
      cached: false,
    });
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid filter parameter format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leads due to server error',
    });
  }
};

export const getLeadById = async (req: AuthRequest, res: Response) => {
  try {
    const lead = await Lead.findById(req.params.id).populate('assignedTo', 'name email');
    
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
      });
    }

    res.json({
      success: true,
      data: lead,
    });
  } catch (error: any) {
    console.error('Error fetching lead:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid lead ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lead due to server error',
    });
  }
};

export const createLead = async (req: AuthRequest, res: Response) => {
  try {
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    const lead = await Lead.create({
      ...req.body,
      createdBy: req.user?.userId,
    });

    await AuditLog.create({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      userName: req.user?.email || 'Unknown',
      userRole: req.user?.role || 'unknown',
      action: AuditAction.CREATE,
      entityType: AuditEntityType.LEAD,
      entityId: lead._id,
      entityName: lead.studentName,
      ipAddress,
      userAgent,
      success: true,
    });

    // Invalidate lead list cache
    await CacheService.deletePattern(`${CacheNamespaces.LEAD_LIST}:*`);

    res.status(201).json({
      success: true,
      data: lead,
      message: 'Lead created successfully',
    });
  } catch (error: any) {
    console.error('Error creating lead:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: `Validation error: ${error.message}`,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create lead due to server error',
    });
  }
};

export const updateLead = async (req: AuthRequest, res: Response) => {
  try {
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
      });
    }

    // Lead conversion should only happen through the proper payment activation workflow
    // Do not auto-convert here - students are created in paymentLinkController.activatePackage

    await AuditLog.create({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      userName: req.user?.email || 'Unknown',
      userRole: req.user?.role || 'unknown',
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.LEAD,
      entityId: lead._id,
      entityName: lead.studentName,
      details: req.body,
      ipAddress,
      userAgent,
      success: true,
    });

    // Invalidate lead list cache
    await CacheService.deletePattern(`${CacheNamespaces.LEAD_LIST}:*`);

    res.json({
      success: true,
      data: lead,
      message: 'Lead updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating lead:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: `Validation error: ${error.message}`,
      });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid lead ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to update lead due to server error',
    });
  }
};

export const deleteLead = async (req: AuthRequest, res: Response) => {
  try {
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
      });
    }

    const [paymentLinkCount, paymentCount, trialCount, studentCount] = await Promise.all([
      (await import('../models/PaymentLink')).default.countDocuments({ lead: lead._id }),
      (await import('../models/Payment')).default.countDocuments({ lead: lead._id }),
      (await import('../models/Class')).default.countDocuments({ leadId: lead._id }),
      (await import('../models/Student')).default.countDocuments({ leadId: lead._id }),
    ]);
    if (paymentLinkCount + paymentCount + trialCount + studentCount > 0) {
      return res.status(409).json({
        success: false,
        error: 'Leads with trial, enrollment, or payment history cannot be deleted. Mark the lead as lost instead.',
      });
    }

    await Lead.findByIdAndDelete(lead._id);

    await AuditLog.create({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      userName: req.user?.email || 'Unknown',
      userRole: req.user?.role || 'unknown',
      action: AuditAction.DELETE,
      entityType: AuditEntityType.LEAD,
      entityId: lead._id,
      entityName: lead.studentName,
      ipAddress,
      userAgent,
      success: true,
    });

    // Invalidate lead list cache
    await CacheService.deletePattern(`${CacheNamespaces.LEAD_LIST}:*`);

    res.json({
      success: true,
      message: 'Lead deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting lead:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid lead ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to delete lead due to server error',
    });
  }
};

export const getLeadStats = async (req: AuthRequest, res: Response) => {
  try {
    const total = await Lead.countDocuments();
    const newToday = await Lead.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    });
    const byStatus = await Lead.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const bySource = await Lead.aggregate([
      { $group: { _id: '$leadSource', count: { $sum: 1 } } },
    ]);
    const converted = await Lead.countDocuments({ status: LeadStatus.CONVERTED });

    res.json({
      success: true,
      data: {
        total,
        newToday,
        byStatus,
        bySource,
        converted,
        conversionRate: total > 0 ? ((converted / total) * 100).toFixed(2) : 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching lead stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lead statistics due to server error',
    });
  }
};
