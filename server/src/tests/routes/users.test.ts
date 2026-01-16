import path from "path";
import request from "supertest";
import mongoose from "mongoose";
import { makeTestApp } from "../helpers/appForTest";
import { startTestMongo, stopTestMongo } from "../helpers/mongoTest";
import { clearDatabase } from "../helpers/db";
import { authHeader, registerUser } from "../helpers/testUtils";
import { signAccessToken } from "../../lib/tokens";
import { User } from "../../models/User";

const app = makeTestApp();
const fixturePath = path.join(__dirname, "../fixtures/sample.txt");

beforeAll(async () => startTestMongo());
afterAll(async () => stopTestMongo());
afterEach(async () => clearDatabase());

test("GET /api/users/me requires auth", async () => {
  const res = await request(app).get("/api/users/me");
  expect(res.status).toBe(401);
});

test("GET /api/users/me returns profile", async () => {
  const reg = await registerUser(app, { username: "me", email: "me@test.com" });
  const res = await request(app).get("/api/users/me").set(authHeader(reg.body.accessToken));
  expect(res.status).toBe(200);
  expect(res.body.username).toBe("me");
});

test("GET /api/users/me returns 404 for missing user", async () => {
  const fakeId = new mongoose.Types.ObjectId();
  const token = signAccessToken({ userId: String(fakeId), username: "ghost" });
  const res = await request(app).get("/api/users/me").set(authHeader(token));
  expect(res.status).toBe(404);
});

test("PATCH /api/users/me updates profile and avatar", async () => {
  const reg = await registerUser(app, { username: "u1", email: "u1@test.com" });
  const res = await request(app)
    .patch("/api/users/me")
    .set(authHeader(reg.body.accessToken))
    .field("username", "newname")
    .attach("avatar", fixturePath);

  expect(res.status).toBe(200);
  expect(res.body.username).toBe("newname");
  expect(res.body.avatarUrl).toMatch(/\/uploads\/avatars\//);
});

test("PATCH /api/users/me updates avatar without username", async () => {
  const reg = await registerUser(app, { username: "u1a", email: "u1a@test.com" });
  const res = await request(app)
    .patch("/api/users/me")
    .set(authHeader(reg.body.accessToken))
    .attach("avatar", fixturePath);

  expect(res.status).toBe(200);
  expect(res.body.avatarUrl).toMatch(/\/uploads\/avatars\//);
});

test("PATCH /api/users/me rejects invalid data", async () => {
  const reg = await registerUser(app, { username: "u2", email: "u2@test.com" });
  const res = await request(app)
    .patch("/api/users/me")
    .set(authHeader(reg.body.accessToken))
    .field("username", "");
  expect(res.status).toBe(400);
});

test("PATCH /api/users/me rejects duplicate username", async () => {
  await registerUser(app, { username: "taken", email: "t1@test.com" });
  const reg = await registerUser(app, { username: "free", email: "t2@test.com" });

  const res = await request(app)
    .patch("/api/users/me")
    .set(authHeader(reg.body.accessToken))
    .field("username", "taken");
  expect(res.status).toBe(409);
});

test("PATCH /api/users/me returns 404 when user missing", async () => {
  const fakeId = new mongoose.Types.ObjectId();
  const token = signAccessToken({ userId: String(fakeId), username: "ghost" });
  const res = await request(app)
    .patch("/api/users/me")
    .set(authHeader(token))
    .field("username", "newname");
  expect(res.status).toBe(404);
});

test("GET /api/users/:id validates id and fetches user", async () => {
  await registerUser(app, { username: "u3", email: "u3@test.com" });
  const user = await User.findOne({ username: "u3" }).lean();

  const invalid = await request(app).get("/api/users/not-valid");
  expect(invalid.status).toBe(400);

  const missing = await request(app).get(`/api/users/${new mongoose.Types.ObjectId().toString()}`);
  expect(missing.status).toBe(404);

  const ok = await request(app).get(`/api/users/${user!._id.toString()}`);
  expect(ok.status).toBe(200);
  expect(ok.body.username).toBe("u3");
});
