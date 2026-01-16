import request from "supertest";
import { makeTestApp } from "../helpers/appForTest";
import { startTestMongo, stopTestMongo } from "../helpers/mongoTest";
import { clearDatabase } from "../helpers/db";

const app = makeTestApp();

beforeAll(async () => startTestMongo());
afterAll(async () => stopTestMongo());
afterEach(async () => clearDatabase());

test("GET /api/health returns ok", async () => {
  const res = await request(app).get("/api/health");
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ ok: true });
});

test("GET /api/swagger returns html", async () => {
  const res = await request(app).get("/api/swagger");
  expect([200, 301, 302]).toContain(res.status);
  if (res.status === 200) {
    expect(res.headers["content-type"]).toMatch(/text\/html/);
  }
});

test("unknown route returns 404", async () => {
  const res = await request(app).get("/api/does-not-exist");
  expect(res.status).toBe(404);
  expect(res.body.message).toBe("Not found");
});
