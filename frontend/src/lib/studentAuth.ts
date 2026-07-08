const API_URL = process.env.NEXT_PUBLIC_API_URL;
const STUDENT_STORAGE_KEY = "ches_student_user";
const STUDENT_TOKEN_STORAGE_KEY = "ches_student_tokens";
const CLIENT_PORTAL_HEADER = { "X-Auth-Portal": "client" } as const;
let memoryStudent: StudentUser | null = null;
let memoryTokens: StudentTokenSet | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export interface StudentUser {
  id: string;
  email: string;
  name: string;
  role: "student";
  status: string;
  authType: "client";
}

interface StudentAuthResponse {
  success: boolean;
  data?: {
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    user?: StudentUser;
  };
  error?: string;
}

interface StudentTokenSet {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

function requireApiUrl(): string {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL environment variable is not set");
  }
  return API_URL;
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
    // Safari private browsing may block localStorage. Session cookies remain
    // authoritative, and memory keeps this tab active.
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

function parseStoredTokens(value: string | null): StudentTokenSet | null {
  if (!value) return null;
  try {
    const tokens = JSON.parse(value) as StudentTokenSet;
    if (typeof tokens.accessToken !== "string" && typeof tokens.refreshToken !== "string") {
      return null;
    }
    return tokens;
  } catch {
    return null;
  }
}

function getStudentTokens(): StudentTokenSet | null {
  if (typeof window === "undefined") return null;
  return memoryTokens || parseStoredTokens(storageGet(STUDENT_TOKEN_STORAGE_KEY));
}

function storeStudentTokens(data?: StudentAuthResponse["data"]): void {
  if (!data?.accessToken && !data?.refreshToken) return;
  const existing = getStudentTokens() || {};
  const nextTokens: StudentTokenSet = {
    accessToken: data.accessToken || existing.accessToken,
    refreshToken: data.refreshToken || existing.refreshToken,
    expiresIn: data.expiresIn || existing.expiresIn,
  };
  memoryTokens = nextTokens;
  storageSet(STUDENT_TOKEN_STORAGE_KEY, JSON.stringify(nextTokens));
}

function clearStudentSession(): void {
  memoryStudent = null;
  memoryTokens = null;
  storageRemove(STUDENT_STORAGE_KEY);
  storageRemove(STUDENT_TOKEN_STORAGE_KEY);
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

function buildStudentHeaders(headers?: HeadersInit, includeJson = true): Record<string, string> {
  const result: Record<string, string> = includeJson ? { "Content-Type": "application/json" } : {};
  Object.assign(result, CLIENT_PORTAL_HEADER, headersToRecord(headers));

  const hasAuthorization = Object.keys(result).some((key) => key.toLowerCase() === "authorization");
  const accessToken = getStudentTokens()?.accessToken;
  if (!hasAuthorization && accessToken) {
    result.Authorization = `Bearer ${accessToken}`;
  }

  return result;
}

export function getCurrentStudent(): StudentUser | null {
  if (typeof window === "undefined") return null;
  const stored = storageGet(STUDENT_STORAGE_KEY);
  if (!stored) return memoryStudent;
  try {
    const user = JSON.parse(stored) as Partial<StudentUser>;
    if (
      user.authType !== "client" ||
      user.role !== "student" ||
      typeof user.id !== "string" ||
      typeof user.email !== "string" ||
      typeof user.name !== "string"
    ) {
      clearStudentSession();
      return null;
    }
    memoryStudent = user as StudentUser;
    return memoryStudent;
  } catch {
    clearStudentSession();
    return null;
  }
}

export async function loginStudent(email: string, password: string): Promise<StudentAuthResponse> {
  const response = await fetch(`${requireApiUrl()}/auth/client/login`, {
    method: "POST",
    credentials: "include",
    headers: buildStudentHeaders(undefined, true),
    body: JSON.stringify({ email, password }),
  });
  const data = (await response.json()) as StudentAuthResponse;
  if (response.ok && data.success && data.data?.user) {
    memoryStudent = data.data.user;
    storageSet(STUDENT_STORAGE_KEY, JSON.stringify(data.data.user));
    storeStudentTokens(data.data);
  }
  return data;
}

export async function logoutStudent(): Promise<void> {
  try {
    const refreshToken = getStudentTokens()?.refreshToken;
    const body = refreshToken ? JSON.stringify({ refreshToken }) : undefined;
    await fetch(`${requireApiUrl()}/auth/client/logout`, {
      method: "POST",
      credentials: "include",
      headers: buildStudentHeaders(undefined, Boolean(body)),
      body,
    });
  } finally {
    clearStudentSession();
  }
}

async function refreshStudentSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const tokens = getStudentTokens();
    const body = tokens?.refreshToken ? JSON.stringify({ refreshToken: tokens.refreshToken }) : undefined;

    try {
      const response = await fetch(`${requireApiUrl()}/auth/client/refresh`, {
        method: "POST",
        credentials: "include",
        headers: buildStudentHeaders(undefined, Boolean(body)),
        body,
      });

      if (!response.ok) {
        clearStudentSession();
        return false;
      }

      const data = (await response.json()) as StudentAuthResponse;
      if (data.success && data.data) {
        if (data.data.user) {
          memoryStudent = data.data.user;
          storageSet(STUDENT_STORAGE_KEY, JSON.stringify(data.data.user));
        }
        storeStudentTokens(data.data);
        return true;
      }

      clearStudentSession();
      return false;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

export async function verifyStudentSession(): Promise<boolean> {
  let response = await fetch(`${requireApiUrl()}/auth/client/session`, {
    credentials: "include",
    headers: buildStudentHeaders(undefined, false),
  });
  if (response.status === 401 && (await refreshStudentSession())) {
    response = await fetch(`${requireApiUrl()}/auth/client/session`, {
      credentials: "include",
      headers: buildStudentHeaders(undefined, false),
    });
  }
  if (!response.ok) {
    clearStudentSession();
    return false;
  }
  const data = (await response.json()) as StudentAuthResponse;
  if (data.success && data.data?.user) {
    memoryStudent = data.data.user;
    storageSet(STUDENT_STORAGE_KEY, JSON.stringify(data.data.user));
    storeStudentTokens(data.data);
    return true;
  }
  clearStudentSession();
  return false;
}

const studentGetCache = new Map<string, { data: unknown; timestamp: number }>();
const studentInFlight = new Map<string, Promise<unknown>>();
const STUDENT_CACHE_TTL = 20_000;

export async function studentFetchJSON<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const isGet = method === "GET";
  const cacheKey = `${endpoint}-${JSON.stringify(options.headers || {})}`;

  if (isGet) {
    const cached = studentGetCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < STUDENT_CACHE_TTL) return cached.data as T;
    const pending = studentInFlight.get(cacheKey);
    if (pending) return pending as Promise<T>;
  } else {
    studentGetCache.clear();
  }

  const request = (async () => {
    const requestOptions: RequestInit = {
      ...options,
      credentials: "include",
      headers: buildStudentHeaders(options.headers, true),
    };

    let response = await fetch(`${requireApiUrl()}${endpoint}`, requestOptions);
    if (response.status === 401 && (await refreshStudentSession())) {
      response = await fetch(`${requireApiUrl()}${endpoint}`, {
        ...requestOptions,
        headers: buildStudentHeaders(options.headers, true),
      });
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || "Student portal request failed");
    }

    if (isGet) studentGetCache.set(cacheKey, { data, timestamp: Date.now() });
    return data as T;
  })().finally(() => {
    if (isGet) studentInFlight.delete(cacheKey);
  });

  if (isGet) studentInFlight.set(cacheKey, request);
  return request;
}
