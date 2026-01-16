import request from "supertest";
import mongoose from "mongoose";
import { makeTestApp } from "../helpers/appForTest";
import { startTestMongo, stopTestMongo } from "../helpers/mongoTest";
import { clearDatabase } from "../helpers/db";
import { authHeader, registerUser } from "../helpers/testUtils";
import { Idea } from "../../models/Idea";
import { Comment } from "../../models/Comment";

const app = makeTestApp();

beforeAll(async () => startTestMongo());
afterAll(async () => stopTestMongo());
afterEach(async () => clearDatabase());

test("POST /api/ideas/:id/comments validates input and auth", async () => {
  const reg = await registerUser(app, { username: "u1", email: "u1@test.com" });
  const idea = await Idea.create({
    authorId: new mongoose.Types.ObjectId(reg.body.user.id),
    text: "idea"
  });

  const unauth = await request(app).post(`/api/ideas/${idea._id.toString()}/comments`).send({ text: "hi" });
  expect(unauth.status).toBe(401);

  const invalidId = await request(app)
    .post("/api/ideas/not-valid/comments")
    .set(authHeader(reg.body.accessToken))
    .send({ text: "hi" });
  expect(invalidId.status).toBe(400);

  const invalidBody = await request(app)
    .post(`/api/ideas/${idea._id.toString()}/comments`)
    .set(authHeader(reg.body.accessToken))
    .send({ text: "   " });
  expect(invalidBody.status).toBe(400);
  expect(invalidBody.body.message).toBe("Validation error");

  const missingIdea = await request(app)
    .post(`/api/ideas/${new mongoose.Types.ObjectId().toString()}/comments`)
    .set(authHeader(reg.body.accessToken))
    .send({ text: "hi" });
  expect(missingIdea.status).toBe(404);

  const ok = await request(app)
    .post(`/api/ideas/${idea._id.toString()}/comments`)
    .set(authHeader(reg.body.accessToken))
    .send({ text: "nice" });
  expect(ok.status).toBe(201);
});

test("GET /api/ideas/:id/comments lists comments", async () => {
  const reg = await registerUser(app, { username: "u2", email: "u2@test.com" });
  const idea = await Idea.create({
    authorId: new mongoose.Types.ObjectId(reg.body.user.id),
    text: "idea"
  });

  await Comment.create({ authorId: new mongoose.Types.ObjectId(reg.body.user.id), ideaId: idea._id, text: "c1" });
  await new Promise((r) => setTimeout(r, 5));
  await Comment.create({ authorId: new mongoose.Types.ObjectId(reg.body.user.id), ideaId: idea._id, text: "c2" });

  const invalid = await request(app).get("/api/ideas/not-valid/comments");
  expect(invalid.status).toBe(400);

  const res = await request(app).get(`/api/ideas/${idea._id.toString()}/comments?limit=1`);
  expect(res.status).toBe(200);
  expect(res.body.items.length).toBe(1);
  expect(res.body.nextCursor).toBeTruthy();
});

test("GET /api/ideas/:id/comments supports cursor and no next cursor", async () => {
  const reg = await registerUser(app, { username: "u5", email: "u5@test.com" });
  const idea = await Idea.create({
    authorId: new mongoose.Types.ObjectId(reg.body.user.id),
    text: "idea"
  });

  const comment = await Comment.create({
    authorId: new mongoose.Types.ObjectId(reg.body.user.id),
    ideaId: idea._id,
    text: "c1"
  });

  const cursor = new Date(comment.createdAt.getTime() + 1000).toISOString();
  const res = await request(app).get(`/api/ideas/${idea._id.toString()}/comments?limit=10&cursor=${cursor}`);
  expect(res.status).toBe(200);
  expect(res.body.items.length).toBe(1);
  expect(res.body.nextCursor).toBeNull();
});

test("DELETE /api/comments/:id deletes comment", async () => {
  const reg1 = await registerUser(app, { username: "u3", email: "u3@test.com" });
  const reg2 = await registerUser(app, { username: "u4", email: "u4@test.com" });
  const idea = await Idea.create({
    authorId: new mongoose.Types.ObjectId(reg1.body.user.id),
    text: "idea"
  });
  const comment = await Comment.create({
    authorId: new mongoose.Types.ObjectId(reg1.body.user.id),
    ideaId: idea._id,
    text: "hi"
  });

  const unauth = await request(app).delete(`/api/comments/${comment._id.toString()}`);
  expect(unauth.status).toBe(401);

  const missing = await request(app)
    .delete(`/api/comments/${new mongoose.Types.ObjectId().toString()}`)
    .set(authHeader(reg1.body.accessToken));
  expect(missing.status).toBe(404);

  const forbidden = await request(app)
    .delete(`/api/comments/${comment._id.toString()}`)
    .set(authHeader(reg2.body.accessToken));
  expect(forbidden.status).toBe(403);

  const ok = await request(app)
    .delete(`/api/comments/${comment._id.toString()}`)
    .set(authHeader(reg1.body.accessToken));
  expect(ok.status).toBe(204);
});
