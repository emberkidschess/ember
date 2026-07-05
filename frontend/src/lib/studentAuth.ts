const API_URL = process.env.NEXT_PUBLIC_API_URL;
const STUDENT_STORAGE_KEY = "ches_student_user";
const CLIENT_PORTAL_HEADER = { "X-Auth-Portal": "client" } as const;

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

export function getCurrentStudent(): StudentUser | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STUDENT_STORAGE_KEY);
  if (!stored) return null;
  try {
    const user = JSON.parse(stored) as Partial<StudentUser>;
    if (
      user.authType !== "client" ||
      user.role !== "student" ||
      typeof user.id !== "string" ||
      typeof user.email !== "string" ||
      typeof user.name !== "string"
    ) {
      localStorage.removeItem(STUDENT_STORAGE_KEY);
      return null;
    }
    return user as StudentUser;
  } catch {
    localStorage.removeItem(STUDENT_STORAGE_KEY);
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
    localStorage.setItem(STUDENT_STORAGE_KEY, JSON.stringify(data.data.user));
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
    localStorage.removeItem(STUDENT_STORAGE_KEY);
  }
}

async function refreshStudentSession(): Promise<boolean> {
  const response = await fetch(`${requireApiUrl()}/auth/client/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...CLIENT_PORTAL_HEADER },
  });
  if (!response.ok) {
    localStorage.removeItem(STUDENT_STORAGE_KEY);
    return false;
  }
  return true;
}

export async function verifyStudentSession(): Promise<boolean> {
  if (!getCurrentStudent()) return false;
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
    localStorage.removeItem(STUDENT_STORAGE_KEY);
    return false;
  }
  return true;
}

export async function studentFetchJSON<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
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
  return data as T;
}
