import request from "supertest";
import mongoose from "mongoose";
import { makeTestApp } from "../helpers/appForTest";
import { startTestMongo, stopTestMongo } from "../helpers/mongoTest";
import { clearDatabase } from "../helpers/db";
import { authHeader, registerUser } from "../helpers/testUtils";
import { Idea } from "../../models/Idea";
import { Like } from "../../models/Like";

const app = makeTestApp();

beforeAll(async () => startTestMongo());
afterAll(async () => stopTestMongo());
afterEach(async () => clearDatabase());

test("POST /api/ideas/:id/likes handles auth and duplicates", async () => {
  await Like.init();
  const reg = await registerUser(app, { username: "u1", email: "u1@test.com" });
  const authorId = new mongoose.Types.ObjectId(reg.body.user.id);
  const idea = await Idea.create({ authorId, text: "idea" });

  const unauth = await request(app).post(`/api/ideas/${idea._id.toString()}/likes`);
  expect(unauth.status).toBe(401);

  const invalid = await request(app)
    .post("/api/ideas/not-valid/likes")
    .set(authHeader(reg.body.accessToken));
  expect(invalid.status).toBe(400);

  const missing = await request(app)
    .post(`/api/ideas/${new mongoose.Types.ObjectId().toString()}/likes`)
    .set(authHeader(reg.body.accessToken));
  expect(missing.status).toBe(404);

  const ok = await request(app)
    .post(`/api/ideas/${idea._id.toString()}/likes`)
    .set(authHeader(reg.body.accessToken));
  expect(ok.status).toBe(201);

  const dup = await request(app)
    .post(`/api/ideas/${idea._id.toString()}/likes`)
    .set(authHeader(reg.body.accessToken));
  expect(dup.status).toBe(204);

  const likeCount = await Like.countDocuments({ ideaId: idea._id });
  expect(likeCount).toBe(1);
});

test("POST /api/ideas/:id/likes returns 500 on unexpected error", async () => {
  const reg = await registerUser(app, { username: "u1b", email: "u1b@test.com" });
  const authorId = new mongoose.Types.ObjectId(reg.body.user.id);
  const idea = await Idea.create({ authorId, text: "idea" });

  const spy = jest.spyOn(Like, "create").mockImplementationOnce(() => {
    throw new Error("boom");
  });

  const res = await request(app)
    .post(`/api/ideas/${idea._id.toString()}/likes`)
    .set(authHeader(reg.body.accessToken));
  expect(res.status).toBe(500);

  spy.mockRestore();
});

test("DELETE /api/ideas/:id/likes removes like", async () => {
  const reg = await registerUser(app, { username: "u2", email: "u2@test.com" });
  const authorId = new mongoose.Types.ObjectId(reg.body.user.id);
  const idea = await Idea.create({ authorId, text: "idea" });

  const unauth = await request(app).delete(`/api/ideas/${idea._id.toString()}/likes`);
  expect(unauth.status).toBe(401);

  const invalid = await request(app)
    .delete("/api/ideas/not-valid/likes")
    .set(authHeader(reg.body.accessToken));
  expect(invalid.status).toBe(400);

  const missing = await request(app)
    .delete(`/api/ideas/${new mongoose.Types.ObjectId().toString()}/likes`)
    .set(authHeader(reg.body.accessToken));
  expect(missing.status).toBe(404);

  await Like.create({ userId: authorId, ideaId: idea._id });

  const ok = await request(app)
    .delete(`/api/ideas/${idea._id.toString()}/likes`)
    .set(authHeader(reg.body.accessToken));
  expect(ok.status).toBe(204);

  const likeCount = await Like.countDocuments({ ideaId: idea._id });
  expect(likeCount).toBe(0);
});
