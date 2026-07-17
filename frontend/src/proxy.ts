import { NextRequest, NextResponse } from "next/server";

const PORTAL_COOKIE_NAME = "ek_internal_portal";
const PORTAL_TTL_SECONDS = 12 * 60 * 60;
const PORTAL_TTL_MS = PORTAL_TTL_SECONDS * 1000;
const PUBLIC_RECOVERY_PATHS = new Set([
  "/admin/forgot-password",
  "/admin/reset-password",
  "/staff/forgot-password",
  "/staff/reset-password",
]);

function getConfiguredEntryPath(): string | null {
  const rawPath = process.env.INTERNAL_PORTAL_ENTRY_PATH?.trim();
  if (!rawPath) return null;

  const withSlash = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const normalized = withSlash.replace(/\/+$/, "");
  return normalized || null;
}

function isInternalRoute(pathname: string): boolean {
  // Reset links are intentionally public: they are protected by a
  // single-use, time-limited token that the API validates. Requiring the
  // private portal-entry cookie here makes a reset link from email unusable.
  if (PUBLIC_RECOVERY_PATHS.has(pathname)) {
    return false;
  }

  return (
    pathname === "/login" ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/staff" ||
    pathname.startsWith("/staff/")
  );
}

function base64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signPortalTimestamp(timestamp: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(timestamp));
  return base64Url(signature);
}

async function createPortalCookieValue(secret: string): Promise<string> {
  const timestamp = String(Date.now());
  const signature = await signPortalTimestamp(timestamp, secret);
  return `${timestamp}.${signature}`;
}

async function hasValidPortalCookie(request: NextRequest, secret: string): Promise<boolean> {
  const cookie = request.cookies.get(PORTAL_COOKIE_NAME)?.value;
  if (!cookie) return false;

  const [timestamp, signature] = cookie.split(".");
  if (!timestamp || !signature) return false;

  const issuedAt = Number(timestamp);
  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > PORTAL_TTL_MS) {
    return false;
  }

  const expectedSignature = await signPortalTimestamp(timestamp, secret);
  return signature === expectedSignature;
}

function setNoIndex(response: NextResponse): NextResponse {
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

export async function proxy(request: NextRequest) {
  const entryPath = getConfiguredEntryPath();
  const { pathname } = request.nextUrl;

  // Local development stays convenient, while production fails closed: a
  // missing entry path must never accidentally publish the internal login or
  // panel routes. Configure INTERNAL_PORTAL_ENTRY_PATH to unlock them.
  if (!entryPath) {
    if (process.env.NODE_ENV === "production" && isInternalRoute(pathname)) {
      return setNoIndex(new NextResponse(null, { status: 404 }));
    }
    return NextResponse.next();
  }

  if (pathname === entryPath) {
    const destination = new URL("/login", request.url);
    const response = entryPath === "/login" ? NextResponse.next() : NextResponse.redirect(destination);
    const cookieValue = await createPortalCookieValue(entryPath);

    response.cookies.set(PORTAL_COOKIE_NAME, cookieValue, {
      httpOnly: true,
      maxAge: PORTAL_TTL_SECONDS,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return setNoIndex(response);
  }

  if (isInternalRoute(pathname)) {
    const allowed = await hasValidPortalCookie(request, entryPath);
    if (!allowed) {
      return setNoIndex(new NextResponse(null, { status: 404 }));
    }

    return setNoIndex(NextResponse.next());
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon-32x32.png|apple-icon.png|icon-192.png|icon.png|images|robots.txt|site.webmanifest|sitemap.xml).*)",
  ],
};
