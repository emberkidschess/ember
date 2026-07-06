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

function storeUser(portal: "admin" | "staff", user: AuthUser): void {
  localStorage.setItem(storageKey(portal), JSON.stringify({ ...user, authType: portal }));
  localStorage.removeItem(STORAGE_KEYS.legacyUser);
}

function clearUser(portal: "admin" | "staff"): void {
  localStorage.removeItem(storageKey(portal));
  localStorage.removeItem(STORAGE_KEYS.legacyUser);
}

function parseStoredUser(value: string | null, portal: "admin" | "staff"): AuthUser | null {
  if (!value) return null;
  try {
    const user = JSON.parse(value) as AuthUser;
    return user.authType === portal ? user : null;
  } catch {
    localStorage.removeItem(storageKey(portal));
    return null;
  }
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
  console.log('Login response:', data);

  if (data.success && data.data) {
    // Tokens are now set as httpOnly cookies by the backend
    storeUser(portal, data.data.user);
  }

  return data;
}

export async function logout(portal: "admin" | "staff" = getPortal()): Promise<void> {

  try {
    await fetch(`${requireApiUrl()}/auth/${portal}/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Portal": portal,
      },
      credentials: 'include',
    });
  } catch (error) {
    console.error("Logout request failed (clearing local session anyway):", error);
  } finally {
    clearUser(portal);
  }
}

export async function refreshAccessToken(portal: "admin" | "staff" = getPortal()): Promise<boolean> {
  // Don't attempt refresh if there's no user in localStorage
  if (!getCurrentUser(portal)) {
    return false;
  }

  try {
    const response = await fetch(`${requireApiUrl()}/auth/${portal}/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Auth-Portal": portal },
      credentials: 'include',
    });

    // Handle 401/403 responses from refresh endpoint - token is expired or invalid
    if (response.status === 401 || response.status === 403) {
      clearUser(portal);
      return false;
    }

    const data: AuthResponse = await response.json();

    if (data.success && data.data) {
      // New tokens are set as httpOnly cookies by the backend
      return true;
    }

    return false;
  } catch (error) {
    console.error("Token refresh failed:", error);
    // Clear session on network errors to prevent infinite loops
    clearUser(portal);
    return false;
  }
}

export function getCurrentUser(portal: "admin" | "staff" = getPortal()): AuthUser | null {
  if (typeof window === "undefined") return null;
  return parseStoredUser(localStorage.getItem(storageKey(portal)), portal);
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
  if (!getCurrentUser(portal)) return null;

  let response = await fetch(`${requireApiUrl()}/auth/${portal}/session`, {
    headers: { "X-Auth-Portal": portal },
    credentials: "include",
  });
  if (response.status === 401) {
    const refreshed = await refreshAccessToken(portal);
    if (refreshed) {
      response = await fetch(`${requireApiUrl()}/auth/${portal}/session`, {
        headers: { "X-Auth-Portal": portal },
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
  const requestOptions: RequestInit = {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Portal": portal,
      ...options.headers,
    },
  };

  let response = await fetch(url, requestOptions);

  if (response.status === 401) {
    const refreshed = await refreshAccessToken(portal);
    if (refreshed) {
      response = await fetch(url, requestOptions);
    }
  }

  return response;
}

// Simple in-memory cache for GET requests
const cache = new Map<string, { data: unknown; timestamp: number }>();
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
    return JSON.parse(text) as T;
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
  }
}
