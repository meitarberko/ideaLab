import request from "supertest";
import { makeTestApp } from "./appForTest";
import { startTestMongo, stopTestMongo } from "./mongoTest";

const app = makeTestApp();

beforeAll(async () => startTestMongo());
afterAll(async () => stopTestMongo());

test("register and login", async () => {
  const r = await request(app).post("/api/auth/register").send({
    username: "u1",
    email: "u1@test.com",
    password: "12345"
  });
  expect(r.status).toBe(201);
  expect(r.body.accessToken).toBeTruthy();

  const l = await request(app).post("/api/auth/login").send({
    username: "u1",
    password: "12345"
  });
  expect(l.status).toBe(200);
  expect(l.body.accessToken).toBeTruthy();
});
