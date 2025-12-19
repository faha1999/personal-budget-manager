// TODO: API fetch helper for SWR/React Query with auth handling.
import type { ApiResponse } from "@/shared/types/api";

export type FetcherOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
};

/**
 * Monolith-friendly API fetch helper.
 * - Always expects { ok: true, data } OR { ok: false, error } JSON response.
 * - Throws a typed Error for easy UI handling.
 */
export async function apiFetch<T>(url: string, opts: FetcherOptions = {}): Promise<T> {
  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers ?? {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
    cache: opts.cache,
    next: opts.next,
    credentials: "include", // important for cookie-based sessions
  });

  const text = await res.text();
  const json = safeJsonParse<ApiResponse<T>>(text);

  if (!json) {
    // Non-JSON response
    if (!res.ok) throw new Error(`Request failed (${res.status}): ${text || "Unknown error"}`);
    throw new Error("Unexpected response format from server.");
  }

  if (json.ok) return json.data;

  const msg = json.error?.message ?? "Request failed.";
  const code = json.error?.code ?? "INTERNAL_ERROR";
  const err = new Error(msg) as Error & { code?: string; details?: unknown; status?: number };
  err.code = code;
  err.details = json.error?.details;
  err.status = res.status;
  throw err;
}

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

