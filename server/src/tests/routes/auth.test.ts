import request from "supertest";
import mongoose from "mongoose";
import { makeTestApp } from "../helpers/appForTest";
import { startTestMongo, stopTestMongo } from "../helpers/mongoTest";
import { clearDatabase } from "../helpers/db";
import { registerUser } from "../helpers/testUtils";
import { User } from "../../models/User";
import { signRefreshToken } from "../../lib/tokens";

const app = makeTestApp();

beforeAll(async () => startTestMongo());
afterAll(async () => stopTestMongo());
afterEach(async () => clearDatabase());

test("registers a new user", async () => {
  const res = await request(app).post("/api/auth/register").send({
    username: "u1",
    email: "u1@test.com",
    password: "12345"
  });
  expect(res.status).toBe(201);
  expect(res.body.accessToken).toBeTruthy();
  expect(res.body.user.email).toBe("u1@test.com");
  expect(res.headers["set-cookie"][0]).toMatch(/refreshToken=/);
});

test("register supports multipart form data", async () => {
  const res = await request(app)
    .post("/api/auth/register")
    .field("username", "multi1")
    .field("email", "multi1@test.com")
    .field("password", "12345");
  expect(res.status).toBe(201);
  expect(res.body.accessToken).toBeTruthy();
});

test("register validation error", async () => {
  const res = await request(app).post("/api/auth/register").send({
    username: "u1",
    password: "12345"
  });
  expect(res.status).toBe(400);
  expect(res.body.message).toBe("Validation error");
  expect(res.body.errors.map((e: any) => e.field)).toContain("email");
});

test("register conflict on username and email", async () => {
  await registerUser(app, { username: "taken", email: "t1@test.com" });

  const resUser = await request(app).post("/api/auth/register").send({
    username: "taken",
    email: "t2@test.com",
    password: "12345"
  });
  expect(resUser.status).toBe(409);

  const resEmail = await request(app).post("/api/auth/register").send({
    username: "newuser",
    email: "t1@test.com",
    password: "12345"
  });
  expect(resEmail.status).toBe(409);
});

test("login success and invalid credentials", async () => {
  await registerUser(app, { username: "u1", email: "u1@test.com" });

  const ok = await request(app).post("/api/auth/login").send({
    username: "u1",
    password: "12345"
  });
  expect(ok.status).toBe(200);
  expect(ok.body.accessToken).toBeTruthy();
  expect(ok.headers["set-cookie"][0]).toMatch(/refreshToken=/);

  const bad = await request(app).post("/api/auth/login").send({
    username: "u1",
    password: "wrong"
  });
  expect(bad.status).toBe(401);
});

test("login supports multipart form data", async () => {
  await registerUser(app, { username: "u10", email: "u10@test.com" });

  const res = await request(app)
    .post("/api/auth/login")
    .field("username", "u10")
    .field("password", "12345");
  expect(res.status).toBe(200);
});

test("refresh token flow", async () => {
  const reg = await registerUser(app, { username: "u2", email: "u2@test.com" });

  const refresh = await request(app)
    .post("/api/auth/refresh")
    .set("Cookie", reg.refreshCookie);
  expect(refresh.status).toBe(200);
  expect(refresh.body.accessToken).toBeTruthy();

  const missing = await request(app).post("/api/auth/refresh");
  expect(missing.status).toBe(401);

  const invalid = await request(app)
    .post("/api/auth/refresh")
    .set("Cookie", "refreshToken=bad");
  expect(invalid.status).toBe(401);
});

test("refresh rejects unknown user and unmatched token", async () => {
  const unknownToken = signRefreshToken({
    userId: new mongoose.Types.ObjectId().toString(),
    username: "ghost"
  });
  const unknown = await request(app)
    .post("/api/auth/refresh")
    .set("Cookie", `refreshToken=${unknownToken}`);
  expect(unknown.status).toBe(401);

  const reg = await registerUser(app, { username: "u4", email: "u4@test.com" });
  const otherToken = signRefreshToken({ userId: reg.body.user.id, username: "u4x" });
  const mismatch = await request(app)
    .post("/api/auth/refresh")
    .set("Cookie", `refreshToken=${otherToken}`);
  expect(mismatch.status).toBe(401);
});

test("logout clears refresh token", async () => {
  const reg = await registerUser(app, { username: "u3", email: "u3@test.com" });
  const user = await User.findOne({ username: "u3" }).lean();
  expect(user?.refreshTokenHashes.length).toBeGreaterThan(0);

  const res = await request(app).post("/api/auth/logout").set("Cookie", reg.refreshCookie);
  expect(res.status).toBe(204);

  const updated = await User.findOne({ username: "u3" }).lean();
  expect(updated?.refreshTokenHashes.length).toBe(0);
});

test("logout succeeds without cookie", async () => {
  const res = await request(app).post("/api/auth/logout");
  expect(res.status).toBe(204);
});

test("logout ignores invalid token", async () => {
  const res = await request(app)
    .post("/api/auth/logout")
    .set("Cookie", "refreshToken=bad");
  expect(res.status).toBe(204);
});
