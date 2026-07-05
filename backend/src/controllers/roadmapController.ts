import { Request, Response } from 'express';
import { Roadmap } from '../models/Roadmap';
import type { ApiResponse, RoadmapDocument } from '../types';
import { defaultRoadmap } from '../data/defaults';
import { roadmapSchema } from '../validations/schemas';

export const getRoadmaps = async (req: Request, res: Response) => {
  try {
    const roadmaps = await Roadmap.find().sort({ order: 1 });

    const response = roadmaps.length > 0 ? roadmaps : defaultRoadmap;

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error fetching roadmaps:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch roadmaps',
    });
  }
};

export const getRoadmapById = async (req: Request, res: Response<ApiResponse<RoadmapDocument>>) => {
  try {
    const roadmap = await Roadmap.findById(req.params.id);
    if (!roadmap) {
      return res.status(404).json({
        success: false,
        error: 'Roadmap not found',
      });
    }
    res.json({
      success: true,
      data: roadmap,
    });
  } catch (error) {
    console.error('Error fetching roadmap:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch roadmap',
    });
  }
};

export const createRoadmap = async (req: Request, res: Response<ApiResponse<RoadmapDocument>>) => {
  try {
    const roadmap = await Roadmap.create(roadmapSchema.parse(req.body));
    res.status(201).json({
      success: true,
      data: roadmap,
      message: 'Roadmap created successfully',
    });
  } catch (error) {
    console.error('Error creating roadmap:', error);
    const invalid = error && typeof error === 'object' && 'name' in error && error.name === 'ZodError';
    res.status(invalid ? 400 : 500).json({
      success: false,
      error: invalid ? 'Invalid roadmap data' : 'Failed to create roadmap',
    });
  }
};

export const updateRoadmap = async (req: Request, res: Response<ApiResponse<RoadmapDocument>>) => {
  try {
    const roadmap = await Roadmap.findByIdAndUpdate(
      req.params.id,
      roadmapSchema.parse(req.body),
      { new: true, runValidators: true }
    );
    if (!roadmap) {
      return res.status(404).json({
        success: false,
        error: 'Roadmap not found',
      });
    }
    res.json({
      success: true,
      data: roadmap,
      message: 'Roadmap updated successfully',
    });
  } catch (error) {
    console.error('Error updating roadmap:', error);
    const invalid = error && typeof error === 'object' && 'name' in error && error.name === 'ZodError';
    res.status(invalid ? 400 : 500).json({
      success: false,
      error: invalid ? 'Invalid roadmap data' : 'Failed to update roadmap',
    });
  }
};

export const deleteRoadmap = async (req: Request, res: Response) => {
  try {
    const roadmap = await Roadmap.findByIdAndDelete(req.params.id);
    if (!roadmap) {
      return res.status(404).json({
        success: false,
        error: 'Roadmap not found',
      });
    }
    res.json({
      success: true,
      message: 'Roadmap deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting roadmap:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete roadmap',
    });
  }
};
