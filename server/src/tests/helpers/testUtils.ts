import request from "supertest";
import { Express } from "express";

type RegisterInput = {
  username: string;
  email: string;
  password: string;
};

export async function registerUser(app: Express, overrides: Partial<RegisterInput> = {}) {
  const base = `${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`;
  const payload: RegisterInput = {
    username: `user_${base}`,
    email: `user_${base}@test.com`,
    password: "12345",
    ...overrides
  };

  const res = await request(app).post("/api/auth/register").send(payload);
  return {
    status: res.status,
    body: res.body,
    refreshCookie: res.headers["set-cookie"]?.[0] || "",
    payload
  };
}

export async function loginUser(app: Express, username: string, password: string) {
  const res = await request(app).post("/api/auth/login").send({ username, password });
  return {
    status: res.status,
    body: res.body,
    refreshCookie: res.headers["set-cookie"]?.[0] || ""
  };
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
