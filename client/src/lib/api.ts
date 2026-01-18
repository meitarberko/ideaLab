import axios from "axios";

export const API_BASE =
  (import.meta as any).env?.VITE_API_BASE || (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:3001/api";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true
});

const isDev = Boolean((import.meta as any).env?.DEV);
const spamWindowMs = 5000;
const spamLimit = 10;
const requestStats = new Map<string, { count: number; start: number }>();

let refreshPromise: Promise<string> | null = null;

api.interceptors.request.use((config) => {
  if (isDev) {
    const method = (config.method || "get").toUpperCase();
    const url = config.url || "";
    const key = `${method} ${url}`;
    const now = Date.now();
    const entry = requestStats.get(key);
    if (!entry || now - entry.start > spamWindowMs) {
      requestStats.set(key, { count: 1, start: now });
    } else {
      entry.count += 1;
      if (entry.count > spamLimit) {
        console.warn(`[api] Potential request loop: ${key} (${entry.count} in ${spamWindowMs}ms)`);
      }
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config || {};
    const url = original.url || "";
    if (original.__isRefresh) {
      localStorage.removeItem("accessToken");
      setAccessToken(null);
      return Promise.reject(err);
    }

    if (err.response?.status === 401 && !original.__isRetry) {
      original.__isRetry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = (async () => {
            const r = await api.post("/auth/refresh", null, { __isRefresh: true });
            const token = r.data.accessToken;
            localStorage.setItem("accessToken", token);
            setAccessToken(token);
            return token;
          })().finally(() => {
            refreshPromise = null;
          });
        }

        const token = await refreshPromise;
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        localStorage.removeItem("accessToken");
        setAccessToken(null);
      }
    }

    if (url.includes("/auth/refresh")) {
      localStorage.removeItem("accessToken");
      setAccessToken(null);
    }

    return Promise.reject(err);
  }
);

export function setAccessToken(token: string | null) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

export function getAccessToken() {
  return localStorage.getItem("accessToken") || "";
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: T | null; error: any | null }> {
  const token = getAccessToken();

  const headers = new Headers(options.headers || {});
  // Avoid setting Content-Type for FormData.
  const isFormData = options.body instanceof FormData;
  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // No JSON body.
  }

  return {
    ok: res.ok,
    status: res.status,
    data: res.ok ? json : null,
    error: res.ok ? null : json
  };
}
