"use client";

import { useSiteConfig as useSWRSiteConfig } from "./api";

export function useSiteConfig() {
  const { data, isLoading } = useSWRSiteConfig();
  return { siteConfig: data, isLoading };
}
