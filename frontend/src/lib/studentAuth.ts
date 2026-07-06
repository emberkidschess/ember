const API_URL = process.env.NEXT_PUBLIC_API_URL;
const STUDENT_STORAGE_KEY = "ches_student_user";
const CLIENT_PORTAL_HEADER = { "X-Auth-Portal": "client" } as const;
let memoryStudent: StudentUser | null = null;

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
  data?: { user?: StudentUser };
  error?: string;
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
      memoryStudent = null;
      storageRemove(STUDENT_STORAGE_KEY);
      return null;
    }
    memoryStudent = user as StudentUser;
    return memoryStudent;
  } catch {
    memoryStudent = null;
    storageRemove(STUDENT_STORAGE_KEY);
    return null;
  }
}

export async function loginStudent(email: string, password: string): Promise<StudentAuthResponse> {
  const response = await fetch(`${requireApiUrl()}/auth/client/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...CLIENT_PORTAL_HEADER },
    body: JSON.stringify({ email, password }),
  });
  const data = (await response.json()) as StudentAuthResponse;
  if (response.ok && data.success && data.data?.user) {
    memoryStudent = data.data.user;
    storageSet(STUDENT_STORAGE_KEY, JSON.stringify(data.data.user));
  }
  return data;
}

export async function logoutStudent(): Promise<void> {
  try {
    await fetch(`${requireApiUrl()}/auth/client/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...CLIENT_PORTAL_HEADER },
    });
  } finally {
    memoryStudent = null;
    storageRemove(STUDENT_STORAGE_KEY);
  }
}

async function refreshStudentSession(): Promise<boolean> {
  const response = await fetch(`${requireApiUrl()}/auth/client/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...CLIENT_PORTAL_HEADER },
  });
  if (!response.ok) {
    memoryStudent = null;
    storageRemove(STUDENT_STORAGE_KEY);
    return false;
  }
  return true;
}

export async function verifyStudentSession(): Promise<boolean> {
  let response = await fetch(`${requireApiUrl()}/auth/client/session`, {
    credentials: "include",
    headers: CLIENT_PORTAL_HEADER,
  });
  if (response.status === 401 && (await refreshStudentSession())) {
    response = await fetch(`${requireApiUrl()}/auth/client/session`, {
      credentials: "include",
      headers: CLIENT_PORTAL_HEADER,
    });
  }
  if (!response.ok) {
    memoryStudent = null;
    storageRemove(STUDENT_STORAGE_KEY);
    return false;
  }
  const data = (await response.json()) as StudentAuthResponse;
  if (data.success && data.data?.user) {
    memoryStudent = data.data.user;
    storageSet(STUDENT_STORAGE_KEY, JSON.stringify(data.data.user));
  }
  return true;
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
    headers: {
      "Content-Type": "application/json",
      ...CLIENT_PORTAL_HEADER,
      ...options.headers,
    },
  };
  let response = await fetch(`${requireApiUrl()}${endpoint}`, requestOptions);
  if (response.status === 401 && (await refreshStudentSession())) {
    response = await fetch(`${requireApiUrl()}${endpoint}`, requestOptions);
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
