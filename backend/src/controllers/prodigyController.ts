import { Request, Response } from 'express';
import { Prodigy } from '../models/Prodigy';
import type { ApiResponse, ProdigiesResponse, Prodigy as ProdigyType } from '../types';
import { defaultProdigies, defaultSpotlight } from '../data/defaults';
import { prodigySchema } from '../validations/schemas';

export const getProdigies = async (req: Request, res: Response<ApiResponse<ProdigiesResponse>>) => {
  try {
    const prodigies = await Prodigy.find().sort({ order: 1 });
    const spotlight = prodigies.find((p) => p.isSpotlight);
    const others = prodigies.filter((p) => !p.isSpotlight);

    const response: ProdigiesResponse =
      prodigies.length > 0
        ? {
            spotlight: spotlight
              ? {
                  name: spotlight.name,
                  age: spotlight.age,
                  title: spotlight.milestone,
                  image: spotlight.image,
                  story: spotlight.story || '',
                  achievements: spotlight.achievements || [],
                }
              : defaultSpotlight,
            prodigies: others.map((p) => ({
              name: p.name,
              age: p.age,
              milestone: p.milestone,
              image: p.image,
              snippet: p.snippet,
            })),
          }
        : {
            spotlight: defaultSpotlight,
            prodigies: defaultProdigies,
          };

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error fetching prodigies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prodigies',
    });
  }
};

export const createProdigy = async (req: Request, res: Response<ApiResponse<ProdigyType>>) => {
  try {
    const validatedData = prodigySchema.parse(req.body);
    const prodigy = await Prodigy.create(validatedData);
    res.status(201).json({
      success: true,
      data: prodigy,
      message: 'Prodigy created successfully',
    });
  } catch (error) {
    console.error('Error creating prodigy:', error);
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: 'Invalid input data',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create prodigy',
      });
    }
  }
};

export const getProdigyById = async (req: Request, res: Response<ApiResponse<ProdigyType>>) => {
  try {
    const prodigy = await Prodigy.findById(req.params.id);
    if (!prodigy) {
      return res.status(404).json({
        success: false,
        error: 'Prodigy not found',
      });
    }
    res.json({
      success: true,
      data: prodigy,
    });
  } catch (error) {
    console.error('Error fetching prodigy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prodigy',
    });
  }
};

export const updateProdigy = async (req: Request, res: Response<ApiResponse<ProdigyType>>) => {
  try {
    const validatedData = prodigySchema.parse(req.body);
    const prodigy = await Prodigy.findByIdAndUpdate(req.params.id, validatedData, { new: true, runValidators: true });
    if (!prodigy) {
      return res.status(404).json({
        success: false,
        error: 'Prodigy not found',
      });
    }
    res.json({
      success: true,
      data: prodigy,
      message: 'Prodigy updated successfully',
    });
  } catch (error) {
    console.error('Error updating prodigy:', error);
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: 'Invalid input data',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update prodigy',
      });
    }
  }
};

export const deleteProdigy = async (req: Request, res: Response) => {
  try {
    const prodigy = await Prodigy.findByIdAndDelete(req.params.id);
    if (!prodigy) {
      return res.status(404).json({
        success: false,
        error: 'Prodigy not found',
      });
    }
    res.json({
      success: true,
      message: 'Prodigy deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting prodigy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete prodigy',
    });
  }
};
