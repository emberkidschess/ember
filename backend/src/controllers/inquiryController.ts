import { Request, Response } from 'express';
import { Inquiry } from '../models/Inquiry';
import type { ApiResponse, InquiryDocument } from '../types';
import { inquirySchema } from '../validations/schemas';
import { sanitizePaginationParams, sanitizeQueryParam } from '../utils/validation';

export const createInquiry = async (req: Request, res: Response<ApiResponse<InquiryDocument>>) => {
  try {
    const validatedData = inquirySchema.parse(req.body);
    const inquiry = await Inquiry.create(validatedData);
    res.status(201).json({
      success: true,
      data: inquiry,
      message: 'Inquiry submitted successfully',
    });
  } catch (error) {
    console.error('Error creating inquiry:', error);
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: 'Invalid input data',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to submit inquiry',
      });
    }
  }
};

export const getInquiries = async (req: Request, res: Response) => {
  try {
    const { status, page = '1', limit = '100' } = req.query;
    const filter: Record<string, unknown> = {};
    const sanitizedStatus = sanitizeQueryParam(status);
    if (sanitizedStatus) filter.status = sanitizedStatus;

    const { page: pageNum, limit: limitNum } = sanitizePaginationParams(page, limit);
    const skip = (pageNum - 1) * limitNum;
    const [inquiries, total] = await Promise.all([
      Inquiry.find(filter)
        .select('name email phone country message status createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Inquiry.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: inquiries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inquiries',
    });
  }
};

export const getInquiryById = async (req: Request, res: Response) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id).lean();
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        error: 'Inquiry not found',
      });
    }
    res.json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    console.error('Error fetching inquiry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inquiry',
    });
  }
};

export const updateInquiry = async (req: Request, res: Response) => {
  try {
    const inquiry = await Inquiry.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        error: 'Inquiry not found',
      });
    }
    res.json({
      success: true,
      data: inquiry,
      message: 'Inquiry updated successfully',
    });
  } catch (error) {
    console.error('Error updating inquiry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update inquiry',
    });
  }
};

export const deleteInquiry = async (req: Request, res: Response) => {
  try {
    const inquiry = await Inquiry.findByIdAndDelete(req.params.id);
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        error: 'Inquiry not found',
      });
    }
    res.json({
      success: true,
      message: 'Inquiry deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting inquiry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete inquiry',
    });
  }
};
