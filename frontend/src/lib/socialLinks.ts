import type { SocialLink } from "@/types";

export const CANONICAL_INSTAGRAM_URL = "https://www.instagram.com/emberkidsofficial";

export function normalizeInstagramHref(href?: string | null): string {
  if (!href) return CANONICAL_INSTAGRAM_URL;

  try {
    const url = new URL(href);
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();
    const pathname = url.pathname.replace(/\/+$/, "").toLowerCase();

    if (hostname === "instagram.com" && ["/emberkids", "/emberkidsofficial"].includes(pathname)) {
      return CANONICAL_INSTAGRAM_URL;
    }
  } catch {
    return href;
  }

  return href;
}

export function getSocialHref(
  socialLinks: SocialLink[] | undefined,
  type: SocialLink["type"],
  fallback: string
): string {
  const configuredHref = socialLinks?.find((link) => link.type === type)?.href || fallback;
  return type === "instagram" ? normalizeInstagramHref(configuredHref) : configuredHref;
}
