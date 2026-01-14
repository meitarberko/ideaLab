import axios from "axios";

export const API_BASE =
  (import.meta as any).env?.VITE_API_BASE || (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:3001/api";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original.__isRetry) {
      original.__isRetry = true;
      try {
        const r = await api.post("/auth/refresh");
        const token = r.data.accessToken;
        localStorage.setItem("accessToken", token);
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        localStorage.removeItem("accessToken");
      }
    }
    throw err;
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
  // אם זה FormData לא שמים Content-Type ידנית!
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
    // לפעמים 204 / ריק
  }

  return {
    ok: res.ok,
    status: res.status,
    data: res.ok ? json : null,
    error: res.ok ? null : json
  };
}

