import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
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
