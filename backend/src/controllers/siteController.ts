import { Request, Response } from 'express';
import { SiteConfig } from '../models/SiteConfig';
import type { ApiResponse, SiteConfigResponse } from '../types';
import { defaultSiteConfig } from '../data/defaults';
import { siteConfigSchema } from '../validations/schemas';

export const getSiteConfig = async (
  req: Request,
  res: Response<ApiResponse<SiteConfigResponse>>
) => {
  try {
    let config = await SiteConfig.findOne();

    if (!config) {
      config = await SiteConfig.create(defaultSiteConfig);
    }

    const response: SiteConfigResponse = {
      profile: config.profile,
      navigation: config.navigation,
      primaryCta: config.primaryCta,
      secondaryCta: config.secondaryCta,
      socialLinks: config.socialLinks,
    };

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error fetching site config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch site configuration',
    });
  }
};

export const updateSiteConfig = async (
  req: Request,
  res: Response<ApiResponse<SiteConfigResponse>>
) => {
  try {
    const validatedData = siteConfigSchema.parse(req.body);
    const config = await SiteConfig.findOneAndUpdate({}, validatedData, {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    });

    const response: SiteConfigResponse = {
      profile: config.profile,
      navigation: config.navigation,
      primaryCta: config.primaryCta,
      secondaryCta: config.secondaryCta,
      socialLinks: config.socialLinks,
    };

    res.json({
      success: true,
      data: response,
      message: 'Site configuration updated successfully',
    });
  } catch (error) {
    console.error('Error updating site config:', error);
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: 'Invalid input data',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update site configuration',
      });
    }
  }
};
