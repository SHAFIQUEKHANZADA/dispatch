"use client";

// Thin client for the FastAPI backend.
//
// Authentication: the backend identifies the user (and therefore the dealer)
// from the Supabase access token we send as `Authorization: Bearer`. When
// Supabase isn't configured (pure local dev) we fall back to the X-Dealer-Id
// header so the demo still runs against a backend in AUTH_MODE=dev.

import { getSupabase, supabaseConfigured } from "./supabase";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api";

const DEALER_KEY = "3dd.dealer_id";

export function getDealerId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(DEALER_KEY);
}

export function setDealerId(id: string) {
  window.localStorage.setItem(DEALER_KEY, id);
}

export async function authHeader(): Promise<Record<string, string>> {
  if (supabaseConfigured) {
    const { data } = await getSupabase().auth.getSession();
    const token = data.session?.access_token;
    if (token) return { Authorization: `Bearer ${token}` };
    return {};
  }
  // dev fallback — no Supabase configured
  const dealer = getDealerId();
  return dealer ? { "X-Dealer-Id": dealer } : {};
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  opts: RequestInit = {},
): Promise<T> {
  const headers = new Headers(opts.headers);
  for (const [k, v] of Object.entries(await authHeader())) headers.set(k, v);
  if (opts.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers, cache: "no-store" });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? JSON.stringify(body);
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  del: <T,>(path: string) => request<T>(path, { method: "DELETE" }),
  // multipart (CSV upload) — do not set Content-Type; the browser sets the boundary
  postForm: <T,>(path: string, form: FormData) =>
    request<T>(path, { method: "POST", body: form }),
};
