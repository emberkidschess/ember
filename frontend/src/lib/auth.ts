/**
 * Authentication for the internal (admin/staff) panel.
 *
 * Admins and staff/coaches are separate accounts on the backend
 * (/auth/admin/* vs /auth/staff/*), but share the same panel UI and the
 * same token shape, so this module picks the right endpoint based on which
 * portal the person is logging into and otherwise treats them the same.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type StaffPanelRole = "super_admin" | "admin" | "coach" | "staff";

export interface AuthUser {
  id: string;
  authId?: string;
  email: string;
  name: string;
  role: StaffPanelRole;
  status: string;
  permissions?: string[];
  authType: "admin" | "staff";
}

export interface AuthResponse {
  success: boolean;
  data?: {
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    user: AuthUser;
  };
  error?: string;
  message?: string;
}

const STORAGE_KEYS = {
  admin: "ches_admin_user",
  staff: "ches_staff_user",
  legacyUser: "ches_user",
} as const;

const TOKEN_STORAGE_KEYS = {
  admin: "ches_admin_tokens",
  staff: "ches_staff_tokens",
} as const;

interface AuthTokenSet {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

const memoryUsers: Partial<Record<"admin" | "staff", AuthUser>> = {};
const memoryTokens: Partial<Record<"admin" | "staff", AuthTokenSet>> = {};
const refreshInFlight: Partial<Record<"admin" | "staff", Promise<boolean>>> = {};

function requireApiUrl(): string {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL environment variable is not set");
  }
  return API_URL;
}

function portalFromPath(): "admin" | "staff" {
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/staff")) {
    return "staff";
  }
  return "admin";
}

function storageKey(portal: "admin" | "staff") {
  return STORAGE_KEYS[portal];
}

function tokenStorageKey(portal: "admin" | "staff") {
  return TOKEN_STORAGE_KEYS[portal];
}

function storageGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Safari private browsing can reject localStorage writes. Cookies still
    // carry the real session; memory keeps this tab usable.
  }
}

function storageRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage access failures.
  }
}

function storeUser(portal: "admin" | "staff", user: AuthUser): void {
  const scopedUser = { ...user, authType: portal };
  memoryUsers[portal] = scopedUser;
  storageSet(storageKey(portal), JSON.stringify(scopedUser));
  storageRemove(STORAGE_KEYS.legacyUser);
}

function clearUser(portal: "admin" | "staff"): void {
  delete memoryUsers[portal];
  delete memoryTokens[portal];
  storageRemove(storageKey(portal));
  storageRemove(tokenStorageKey(portal));
  storageRemove(STORAGE_KEYS.legacyUser);
}

function parseStoredUser(value: string | null, portal: "admin" | "staff"): AuthUser | null {
  if (!value) return null;
  try {
    const user = JSON.parse(value) as AuthUser;
    return user.authType === portal ? user : null;
  } catch {
    storageRemove(storageKey(portal));
    return null;
  }
}

function storeTokens(portal: "admin" | "staff", data?: AuthResponse["data"]): void {
  if (!data?.accessToken && !data?.refreshToken) return;
  const existing = getAuthTokens(portal) || {};
  const nextTokens: AuthTokenSet = {
    accessToken: data.accessToken || existing.accessToken,
    refreshToken: data.refreshToken || existing.refreshToken,
    expiresIn: data.expiresIn || existing.expiresIn,
  };
  memoryTokens[portal] = nextTokens;
  storageSet(tokenStorageKey(portal), JSON.stringify(nextTokens));
}

function parseStoredTokens(value: string | null): AuthTokenSet | null {
  if (!value) return null;
  try {
    const tokens = JSON.parse(value) as AuthTokenSet;
    if (typeof tokens.accessToken !== "string" && typeof tokens.refreshToken !== "string") {
      return null;
    }
    return tokens;
  } catch {
    return null;
  }
}

function getAuthTokens(portal: "admin" | "staff" = getPortal()): AuthTokenSet | null {
  if (typeof window === "undefined") return null;
  return memoryTokens[portal] || parseStoredTokens(storageGet(tokenStorageKey(portal)));
}

function headersToRecord(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers.map(([key, value]) => [key, String(value)]));
  }
  return { ...(headers as Record<string, string>) };
}

function buildAuthHeaders(
  portal: "admin" | "staff",
  headers?: HeadersInit,
  includeJson = true
): Record<string, string> {
  const result: Record<string, string> = includeJson ? { "Content-Type": "application/json" } : {};
  Object.assign(result, headersToRecord(headers));

  const hasAuthorization = Object.keys(result).some((key) => key.toLowerCase() === "authorization");
  const accessToken = getAuthTokens(portal)?.accessToken;
  if (!hasAuthorization && accessToken) {
    result.Authorization = `Bearer ${accessToken}`;
  }

  return result;
}

/** Which portal is currently being used by the current route. Defaults to admin. */
export function getPortal(): "admin" | "staff" {
  return portalFromPath();
}

export async function login(
  portal: "admin" | "staff",
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(`${requireApiUrl()}/auth/${portal}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Auth-Portal": portal },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  const data: AuthResponse = await response.json();

  if (data.success && data.data) {
    // Cookies remain primary. Tokens are a Safari-safe fallback for hosted
    // frontend/backend pairs where cross-site cookies can be blocked.
    if (data.data.user) storeUser(portal, data.data.user);
    storeTokens(portal, data.data);
  }

  return data;
}

export async function logout(portal: "admin" | "staff" = getPortal()): Promise<void> {
  try {
    const refreshToken = getAuthTokens(portal)?.refreshToken;
    const body = refreshToken ? JSON.stringify({ refreshToken }) : undefined;
    await fetch(`${requireApiUrl()}/auth/${portal}/logout`, {
      method: "POST",
      headers: buildAuthHeaders(portal, { "X-Auth-Portal": portal }, Boolean(body)),
      credentials: "include",
      body,
    });
  } catch (error) {
    console.error("Logout request failed (clearing local session anyway):", error);
  } finally {
    clearUser(portal);
  }
}

export async function refreshAccessToken(portal: "admin" | "staff" = getPortal()): Promise<boolean> {
  if (refreshInFlight[portal]) return refreshInFlight[portal] as Promise<boolean>;

  const refreshPromise = (async () => {
    try {
      const tokens = getAuthTokens(portal);
      const body = tokens?.refreshToken ? JSON.stringify({ refreshToken: tokens.refreshToken }) : undefined;
      const response = await fetch(`${requireApiUrl()}/auth/${portal}/refresh`, {
        method: "POST",
        headers: buildAuthHeaders(portal, { "X-Auth-Portal": portal }, Boolean(body)),
        credentials: "include",
        body,
      });

      // Handle 401/403 responses from refresh endpoint - token is expired or invalid
      if (response.status === 401 || response.status === 403) {
        clearUser(portal);
        return false;
      }

      const data: AuthResponse = await response.json();

      if (data.success && data.data) {
        if (data.data.user) storeUser(portal, data.data.user);
        storeTokens(portal, data.data);
        return true;
      }

      clearUser(portal);
      return false;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return false;
    }
  })();

  refreshInFlight[portal] = refreshPromise;
  try {
    return await refreshPromise;
  } finally {
    delete refreshInFlight[portal];
  }
}

export function getCurrentUser(portal: "admin" | "staff" = getPortal()): AuthUser | null {
  if (typeof window === "undefined") return null;
  return parseStoredUser(storageGet(storageKey(portal)), portal) || memoryUsers[portal] || null;
}

export function getAnyCurrentUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  return getCurrentUser("admin") || getCurrentUser("staff");
}

export function isAuthenticated(portal: "admin" | "staff" = getPortal()): boolean {
  if (typeof window === "undefined") return false;
  return getCurrentUser(portal) !== null;
}

export function isAdminRole(user: AuthUser | null = getCurrentUser()): boolean {
  const role = user?.role;
  return role === "admin" || role === "super_admin";
}

/** Mirrors backend middleware/auth.ts's requirePermission: admins (permissions=['*']) always pass. */
export function hasPermission(permission: string, user: AuthUser | null = getCurrentUser()): boolean {
  const permissions = user?.permissions || [];
  return permissions.includes("*") || permissions.includes(permission);
}

export function hasAnyPermission(...permissions: string[]): boolean {
  const user = getCurrentUser();
  return permissions.some((p) => hasPermission(p, user));
}

export async function verifySession(portal: "admin" | "staff" = getPortal()): Promise<AuthUser | null> {
  let response = await fetch(`${requireApiUrl()}/auth/${portal}/session`, {
    headers: buildAuthHeaders(portal, { "X-Auth-Portal": portal }, false),
    credentials: "include",
  });
  if (response.status === 401) {
    const refreshed = await refreshAccessToken(portal);
    if (refreshed) {
      response = await fetch(`${requireApiUrl()}/auth/${portal}/session`, {
        headers: buildAuthHeaders(portal, { "X-Auth-Portal": portal }, false),
        credentials: "include",
      });
    }
  }
  if (!response.ok) {
    clearUser(portal);
    return null;
  }

  const data = (await response.json()) as AuthResponse;
  const user = data.data?.user;
  if (!data.success || !user || user.authType !== portal) {
    clearUser(portal);
    return null;
  }

  storeUser(portal, user);
  storeTokens(portal, data.data);
  return user;
}

/**
 * Fetch wrapper for the admin/staff panel. Attaches the bearer token and
 * transparently retries once with a refreshed token on a 401, so a session
 * doesn't just die the moment the 15-minute access token expires.
 */
export async function adminFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${requireApiUrl()}${endpoint}`;
  const portal = getPortal();
  const buildRequestOptions = (): RequestInit => ({
    ...options,
    credentials: "include",
    headers: buildAuthHeaders(portal, { "X-Auth-Portal": portal, ...headersToRecord(options.headers) }),
  });

  let response = await fetch(url, buildRequestOptions());

  if (response.status === 401) {
    const refreshed = await refreshAccessToken(portal);
    if (refreshed) {
      response = await fetch(url, buildRequestOptions());
    }
  }

  return response;
}

// Simple in-memory cache for GET requests
const cache = new Map<string, { data: unknown; timestamp: number }>();
const inFlightGetRequests = new Map<string, Promise<unknown>>();
const CACHE_TTL = 30000; // 30 seconds

export async function adminFetchWithCache<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
  forceRefresh = false
): Promise<T> {
  const cacheKey = `${endpoint}-${JSON.stringify(options)}`;
  
  // Return cached data for GET requests if available and not forced to refresh
  if (!forceRefresh && (!options.method || options.method === 'GET')) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data as T;
    }
  }

  const response = await adminFetch(endpoint, options);
  const data = await response.json();

  // Cache successful GET responses
  if (response.ok && (!options.method || options.method === 'GET')) {
    cache.set(cacheKey, { data, timestamp: Date.now() });
  }

  return data;
}

export function clearAdminCache() {
  cache.clear();
}

export interface ApiError {
  type: 'network' | 'parse' | 'api';
  message: string;
  status?: number;
  originalError?: unknown;
}

/** Convenience wrapper that also parses the JSON body with proper error handling. */
export async function adminFetchJSON<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const isGet = method === "GET";
  const cacheKey = `${endpoint}-${JSON.stringify(options.headers || {})}`;

  if (isGet) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data as T;
    }

    const pending = inFlightGetRequests.get(cacheKey);
    if (pending) return pending as Promise<T>;
  } else {
    clearAdminCache();
  }

  const request = (async () => {
  try {
    const response = await adminFetch(endpoint, options);

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    if (!text) {
      throw new Error(`Empty response from ${endpoint}`);
    }

    // API endpoints use a consistent { success, data?, error? } envelope.
    // Return error envelopes to callers too so forms can display the server's
    // precise validation/business message instead of a generic network error.
    const data = JSON.parse(text) as T;
    if (isGet && response.ok) {
      cache.set(cacheKey, { data, timestamp: Date.now() });
    }
    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const networkError: ApiError = {
        type: 'network',
        message: 'Network error: Failed to connect to server',
        originalError: error,
      };
      throw networkError;
    }
    throw error;
  } finally {
    if (isGet) inFlightGetRequests.delete(cacheKey);
  }
  })();

  if (isGet) inFlightGetRequests.set(cacheKey, request);
  return request;
}
