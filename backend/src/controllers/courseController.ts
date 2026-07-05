import { Request, Response } from 'express';
import { Course } from '../models/Course';
import { Roadmap } from '../models/Roadmap';
import type { ApiResponse, CoursesResponse, Course as CourseType } from '../types';
import { defaultCourses, defaultRoadmap } from '../data/defaults';
import { courseSchema, roadmapSchema } from '../validations/schemas';

export const getCourses = async (req: Request, res: Response<ApiResponse<CoursesResponse>>) => {
  try {
    const courses = await Course.find().sort({ order: 1 });
    const roadmap = await Roadmap.find().sort({ order: 1 });

    const response: CoursesResponse = {
      courses:
        courses.length > 0
          ? courses.map((c) => ({
              level: c.level,
              title: c.title,
              subtitle: c.subtitle,
              desc: c.desc,
              topics: c.topics,
              accent: c.accent,
              badgeColor: c.badgeColor,
              isPremium: c.isPremium,
            }))
          : defaultCourses,
      roadmap:
        roadmap.length > 0
          ? roadmap.map((r) => ({
              phase: r.phase,
              title: r.title,
              rating: r.rating,
              outcome: r.outcome,
              iconName: r.iconName,
              color: r.color,
              bg: r.bg,
            }))
          : defaultRoadmap,
    };

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch courses',
    });
  }
};

export const createCourse = async (req: Request, res: Response<ApiResponse<CourseType>>) => {
  try {
    const validatedData = courseSchema.parse(req.body);
    const course = await Course.create(validatedData);
    res.status(201).json({
      success: true,
      data: course,
      message: 'Course created successfully',
    });
  } catch (error) {
    console.error('Error creating course:', error);
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: 'Invalid input data',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create course',
      });
    }
  }
};

export const getCourseById = async (req: Request, res: Response<ApiResponse<CourseType>>) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found',
      });
    }
    res.json({
      success: true,
      data: course,
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch course',
    });
  }
};

export const updateCourse = async (req: Request, res: Response<ApiResponse<CourseType>>) => {
  try {
    const validatedData = courseSchema.parse(req.body);
    const course = await Course.findByIdAndUpdate(req.params.id, validatedData, { new: true, runValidators: true });
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found',
      });
    }
    res.json({
      success: true,
      data: course,
      message: 'Course updated successfully',
    });
  } catch (error) {
    console.error('Error updating course:', error);
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: 'Invalid input data',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update course',
      });
    }
  }
};

export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found',
      });
    }
    res.json({
      success: true,
      message: 'Course deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete course',
    });
  }
};
