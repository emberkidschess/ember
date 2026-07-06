import { Request, Response } from 'express';
import { SiteConfig } from '../models/SiteConfig';
import type { ApiResponse, SiteConfigResponse, SiteProfile, SocialLink } from '../types';
import { buildDefaultSocialLinks, defaultSiteConfig, normalizeInstagramHref } from '../data/defaults';
import { siteConfigSchema } from '../validations/schemas';

function toPlainSocialLink(link: unknown): SocialLink | null {
  const value =
    link && typeof link === 'object' && 'toObject' in link && typeof link.toObject === 'function'
      ? link.toObject()
      : link;

  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<SocialLink>;
  if (!candidate.name || !candidate.href || !candidate.type) return null;

  return {
    name: candidate.name,
    href: candidate.type === 'instagram' ? normalizeInstagramHref(candidate.href) : candidate.href,
    type: candidate.type,
    external: candidate.external ?? true,
  };
}

function normalizeSocialLinks(profile: SiteProfile, socialLinks: unknown[]): SocialLink[] {
  const linksByType = new Map<SocialLink['type'], SocialLink>(
    buildDefaultSocialLinks(profile).map((link) => [link.type, link])
  );

  for (const link of socialLinks) {
    const plain = toPlainSocialLink(link);
    if (plain) linksByType.set(plain.type, plain);
  }

  return Array.from(linksByType.values());
}

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
      socialLinks: normalizeSocialLinks(config.profile, config.socialLinks || []),
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
      socialLinks: normalizeSocialLinks(config.profile, config.socialLinks || []),
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
