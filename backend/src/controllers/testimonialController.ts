import { Request, Response } from 'express';
import { Testimonial } from '../models/Testimonial';
import type { ApiResponse, TestimonialsResponse, Testimonial as TestimonialType } from '../types';
import { defaultTestimonials } from '../data/defaults';
import { testimonialSchema } from '../validations/schemas';

export const getTestimonials = async (
  req: Request,
  res: Response<ApiResponse<TestimonialsResponse>>
) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 100); // Max 100 per request
    const skip = Math.max(Number(req.query.skip) || 0, 0);

    const testimonials = await Testimonial.find({ isActive: true })
      .select('quote name role location imageUrl videoUrl videoPosterUrl instagramUrl')
      .sort({ order: 1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const response: TestimonialsResponse = {
      testimonials:
        testimonials.length > 0
          ? testimonials.map((t) => ({
              quote: t.quote,
              name: t.name,
              role: t.role,
              location: t.location,
              imageUrl: t.imageUrl,
              videoUrl: t.videoUrl,
              videoPosterUrl: t.videoPosterUrl,
              instagramUrl: t.instagramUrl,
            }))
          : defaultTestimonials,
    };

    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch testimonials',
    });
  }
};

export const createTestimonial = async (
  req: Request,
  res: Response<ApiResponse<TestimonialType>>
) => {
  try {
    const validatedData = testimonialSchema.parse(req.body);
    const testimonial = await Testimonial.create(validatedData);
    res.status(201).json({
      success: true,
      data: testimonial,
      message: 'Testimonial created successfully',
    });
  } catch (error) {
    console.error('Error creating testimonial:', error);
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: 'Invalid input data',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create testimonial',
      });
    }
  }
};

export const getTestimonialById = async (
  req: Request,
  res: Response<ApiResponse<TestimonialType>>
) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        error: 'Testimonial not found',
      });
    }
    res.json({
      success: true,
      data: testimonial,
    });
  } catch (error) {
    console.error('Error fetching testimonial:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch testimonial',
    });
  }
};

export const updateTestimonial = async (
  req: Request,
  res: Response<ApiResponse<TestimonialType>>
) => {
  try {
    const validatedData = testimonialSchema.parse(req.body);
    const testimonial = await Testimonial.findByIdAndUpdate(req.params.id, validatedData, { new: true, runValidators: true });
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        error: 'Testimonial not found',
      });
    }
    res.json({
      success: true,
      data: testimonial,
      message: 'Testimonial updated successfully',
    });
  } catch (error) {
    console.error('Error updating testimonial:', error);
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: 'Invalid input data',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update testimonial',
      });
    }
  }
};

export const deleteTestimonial = async (req: Request, res: Response) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        error: 'Testimonial not found',
      });
    }
    res.json({
      success: true,
      message: 'Testimonial deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete testimonial',
    });
  }
};
