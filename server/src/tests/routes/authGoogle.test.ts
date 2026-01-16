import request from "supertest";
import { makeTestApp } from "../helpers/appForTest";
import { startTestMongo, stopTestMongo } from "../helpers/mongoTest";
import { clearDatabase } from "../helpers/db";

const app = makeTestApp();

beforeAll(async () => startTestMongo());
afterAll(async () => stopTestMongo());
afterEach(async () => clearDatabase());

test("GET /api/auth/google redirects", async () => {
  const res = await request(app).get("/api/auth/google");
  expect(res.status).toBe(302);
});

test("GET /api/auth/google/callback redirects with token", async () => {
  const res = await request(app).get("/api/auth/google/callback");
  expect(res.status).toBe(302);
  expect(res.headers.location).toContain("/login?token=test-access");
  expect(res.headers["set-cookie"][0]).toMatch(/refreshToken=/);
});

test("GET /api/auth/google/callback handles failure redirect", async () => {
  const res = await request(app).get("/api/auth/google/callback?fail=1");
  expect(res.status).toBe(302);
  expect(res.headers.location).toContain("login");
});

test("GET /api/auth/google/callback builds url without FRONTEND_URL", async () => {
  const saved = process.env.FRONTEND_URL;
  delete process.env.FRONTEND_URL;
  const res = await request(app).get("/api/auth/google/callback");
  expect(res.status).toBe(302);
  expect(res.headers.location).toBe("/login?token=test-access");
  if (saved !== undefined) process.env.FRONTEND_URL = saved;
});
