import useSWR from 'swr';
import type {
  ApiResponse,
  CoursesResponse,
  ProdigiesResponse,
  SiteConfigResponse,
  TestimonialsResponse,
  TrialFormData,
} from "@/types";
import type { SupportedCountry } from "@/lib/phone";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

class ApiRequestError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
  }
}

async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retries = 3,
  delay = 1000
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      const data = await response.json().catch(() => null);
      if (response.ok) {
        return data as T;
      }

      const message =
        data && typeof data === "object" && "error" in data
          ? String(data.error)
          : `API error: ${response.status} ${response.statusText}`;
      if (response.status < 500 || i === retries - 1) {
        throw new ApiRequestError(message, false);
      }
      lastError = new ApiRequestError(message, true);
    } catch (error) {
      lastError = error;
      if (error instanceof ApiRequestError && !error.retryable) throw error;
      if (i === retries - 1) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
  }
  throw lastError instanceof Error ? lastError : new Error("Request failed");
}

export async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit & { signal?: AbortSignal }
): Promise<T> {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL environment variable is not set");
  }
  const url = `${API_URL}${endpoint}`;

  const requestOptions: RequestInit = {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
      ...options?.headers,
    },
  };

  return fetchWithRetry<T>(url, requestOptions);
}

// Site Config
export const getSiteConfig = () => fetchAPI<ApiResponse<SiteConfigResponse>>("/site/config");

// Testimonials
export const getTestimonials = () => fetchAPI<ApiResponse<TestimonialsResponse>>("/testimonials");

// Prodigies
export const getProdigies = () => fetchAPI<ApiResponse<ProdigiesResponse>>("/prodigies");

// Courses
export const getCourses = () => fetchAPI<ApiResponse<CoursesResponse>>("/courses");

// Inquiries
export const submitInquiry = (data: {
  name: string;
  email: string;
  phone: string;
  country: SupportedCountry;
  message: string;
}) =>
  fetchAPI<ApiResponse<unknown>>("/inquiries", {
    method: "POST",
    body: JSON.stringify(data),
  });

// Trial Bookings -> now funnels into the Lead pipeline (staff schedules the
// actual trial class from the admin panel once they've called to qualify
// the lead). The old dedicated /trial-bookings collection/endpoint no
// longer exists on the backend.
export const submitTrialBooking = (data: TrialFormData) =>
  fetchAPI<ApiResponse<unknown>>("/leads/book-trial", {
    method: "POST",
    body: JSON.stringify({
      studentName: data.name,
      parentName: data.name,
      email: data.email,
      phoneNumber: data.phone,
      country: data.country,
      courseInterest: "Free Trial Assessment",
      leadSource: "website_trial_form",
      message: `Child age: ${data.childAge}. Preferred trial time: ${data.preferredDate} at ${data.preferredTime}.`,
    }),
  });

// SWR hooks for data fetching with caching
export function useSiteConfig() {
  const { data, error, isLoading } = useSWR<ApiResponse<SiteConfigResponse>>('/site/config', getSiteConfig, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });
  return {
    data: data?.data,
    isLoading,
    error,
  };
}

export function useTestimonials() {
  const { data, error, isLoading } = useSWR<ApiResponse<TestimonialsResponse>>('/testimonials', getTestimonials, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });
  return {
    data: data?.data,
    isLoading,
    error,
  };
}

export function useProdigies() {
  const { data, error, isLoading } = useSWR<ApiResponse<ProdigiesResponse>>('/prodigies', getProdigies, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });
  return {
    data: data?.data,
    isLoading,
    error,
  };
}

export function useCourses() {
  const { data, error, isLoading } = useSWR<ApiResponse<CoursesResponse>>('/courses', getCourses, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });
  return {
    data: data?.data,
    isLoading,
    error,
  };
}
