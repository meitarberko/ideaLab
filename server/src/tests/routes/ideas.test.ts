import path from "path";
import request from "supertest";
import mongoose from "mongoose";
import express from "express";
import cookieParser from "cookie-parser";
import { makeTestApp } from "../helpers/appForTest";
import { startTestMongo, stopTestMongo } from "../helpers/mongoTest";
import { clearDatabase } from "../helpers/db";
import { authHeader, registerUser } from "../helpers/testUtils";
import { Idea } from "../../models/Idea";
import { Like } from "../../models/Like";
import { Comment } from "../../models/Comment";
import apiRouter from "../../routes";
import notFound from "../../middleware/notFound";
import errorHandler from "../../middleware/errorHandler";

const app = makeTestApp();
const fixturePath = path.join(__dirname, "../fixtures/sample.txt");

function makeAppWithUser(userId: string) {
  const custom = express();
  custom.use((req, _res, next) => {
    (req as any).user = { id: userId };
    next();
  });
  custom.use(cookieParser());
  custom.use(express.json());
  custom.use(express.urlencoded({ extended: true }));
  custom.use("/api", apiRouter);
  custom.use(notFound);
  custom.use(errorHandler);
  return custom;
}

beforeAll(async () => startTestMongo());
afterAll(async () => stopTestMongo());
afterEach(async () => clearDatabase());

test("POST /api/ideas requires auth and text", async () => {
  const unauth = await request(app).post("/api/ideas").field("text", "idea");
  expect(unauth.status).toBe(401);

  const reg = await registerUser(app, { username: "u1", email: "u1@test.com" });
  const missing = await request(app)
    .post("/api/ideas")
    .set(authHeader(reg.body.accessToken));
  expect(missing.status).toBe(400);

  const ok = await request(app)
    .post("/api/ideas")
    .set(authHeader(reg.body.accessToken))
    .field("text", "my idea")
    .attach("image", fixturePath);
  expect(ok.status).toBe(201);
  expect(ok.body.id).toBeTruthy();
});

test("GET /api/ideas returns feed with counts and cursor", async () => {
  const reg = await registerUser(app, { username: "u2", email: "u2@test.com" });
  const authorId = new mongoose.Types.ObjectId(reg.body.user.id);

  const idea1 = await Idea.create({ authorId, text: "idea 1" });
  await new Promise((r) => setTimeout(r, 5));
  const idea2 = await Idea.create({ authorId, text: "idea 2" });

  await Like.create({ userId: authorId, ideaId: idea2._id });
  await Comment.create({ authorId, ideaId: idea2._id, text: "c1" });

  const res = await request(app).get("/api/ideas?limit=1");
  expect(res.status).toBe(200);
  expect(res.body.items.length).toBe(1);
  expect(res.body.items[0].id).toBe(String(idea2._id));
  expect(res.body.items[0].likesCount).toBe(1);
  expect(res.body.items[0].commentsCount).toBe(1);
  expect(res.body.nextCursor).toBeTruthy();
});

test("GET /api/ideas supports cursor and likedByMe", async () => {
  const reg = await registerUser(app, { username: "u2b", email: "u2b@test.com" });
  const authorId = new mongoose.Types.ObjectId(reg.body.user.id);

  const older = await Idea.create({ authorId, text: "old" });
  await new Promise((r) => setTimeout(r, 5));
  const newer = await Idea.create({ authorId, text: "new" });
  await Like.create({ userId: authorId, ideaId: newer._id });

  const cursor = new Date().toISOString();
  const customApp = makeAppWithUser(String(authorId));
  const res = await request(customApp).get(`/api/ideas?limit=10&cursor=${cursor}`);
  expect(res.status).toBe(200);
  expect(res.body.items.length).toBe(2);
  const newest = res.body.items.find((i: any) => i.id === String(newer._id));
  expect(newest.likedByMe).toBe(true);
  const oldItem = res.body.items.find((i: any) => i.id === String(older._id));
  expect(oldItem.likedByMe).toBe(false);
});

test("GET /api/ideas/mine returns only my ideas", async () => {
  const reg1 = await registerUser(app, { username: "u3", email: "u3@test.com" });
  const reg2 = await registerUser(app, { username: "u4", email: "u4@test.com" });

  await Idea.create({ authorId: new mongoose.Types.ObjectId(reg1.body.user.id), text: "mine" });
  await Idea.create({ authorId: new mongoose.Types.ObjectId(reg2.body.user.id), text: "other" });

  const res = await request(app)
    .get("/api/ideas/mine")
    .set(authHeader(reg1.body.accessToken));
  expect(res.status).toBe(200);
  expect(res.body.items.length).toBe(1);
  expect(res.body.items[0].text).toBe("mine");
});

test("GET /api/ideas/:id validates id and returns idea", async () => {
  const reg = await registerUser(app, { username: "u5", email: "u5@test.com" });
  const authorId = new mongoose.Types.ObjectId(reg.body.user.id);
  const idea = await Idea.create({ authorId, text: "idea" });
  await Like.create({ userId: authorId, ideaId: idea._id });
  await Comment.create({ authorId, ideaId: idea._id, text: "c1" });

  const invalid = await request(app).get("/api/ideas/not-valid");
  expect(invalid.status).toBe(400);

  const missing = await request(app).get(`/api/ideas/${new mongoose.Types.ObjectId().toString()}`);
  expect(missing.status).toBe(404);

  const ok = await request(app).get(`/api/ideas/${idea._id.toString()}`);
  expect(ok.status).toBe(200);
  expect(ok.body.likesCount).toBe(1);
  expect(ok.body.commentsCount).toBe(1);
});

test("GET /api/ideas/:id returns likedByMe when user set", async () => {
  const reg = await registerUser(app, { username: "u5b", email: "u5b@test.com" });
  const authorId = new mongoose.Types.ObjectId(reg.body.user.id);
  const idea = await Idea.create({ authorId, text: "idea" });
  await Like.create({ userId: authorId, ideaId: idea._id });

  const customApp = makeAppWithUser(String(authorId));
  const ok = await request(customApp).get(`/api/ideas/${idea._id.toString()}`);
  expect(ok.status).toBe(200);
  expect(ok.body.likedByMe).toBe(true);
});

test("PATCH /api/ideas/:id updates idea and handles permissions", async () => {
  const reg1 = await registerUser(app, { username: "u6", email: "u6@test.com" });
  const reg2 = await registerUser(app, { username: "u7", email: "u7@test.com" });

  const idea = await Idea.create({
    authorId: new mongoose.Types.ObjectId(reg1.body.user.id),
    text: "old",
    imageUrl: "http://example.com/old.png"
  });

  const invalid = await request(app)
    .patch("/api/ideas/not-valid")
    .set(authHeader(reg1.body.accessToken));
  expect(invalid.status).toBe(400);

  const unauth = await request(app).patch(`/api/ideas/${idea._id.toString()}`);
  expect(unauth.status).toBe(401);

  const missing = await request(app)
    .patch(`/api/ideas/${new mongoose.Types.ObjectId().toString()}`)
    .set(authHeader(reg1.body.accessToken))
    .field("text", "nope");
  expect(missing.status).toBe(404);

  const invalidBody = await request(app)
    .patch(`/api/ideas/${idea._id.toString()}`)
    .set(authHeader(reg1.body.accessToken))
    .field("text", "");
  expect(invalidBody.status).toBe(400);

  const forbidden = await request(app)
    .patch(`/api/ideas/${idea._id.toString()}`)
    .set(authHeader(reg2.body.accessToken))
    .field("text", "nope");
  expect(forbidden.status).toBe(403);

  const res = await request(app)
    .patch(`/api/ideas/${idea._id.toString()}`)
    .set(authHeader(reg1.body.accessToken))
    .field("text", "updated")
    .field("removeImage", "true");
  expect(res.status).toBe(200);

  const updated = await Idea.findById(idea._id).lean();
  expect(updated?.text).toBe("updated");
  expect(updated?.imageUrl).toBeUndefined();

  const withImage = await request(app)
    .patch(`/api/ideas/${idea._id.toString()}`)
    .set(authHeader(reg1.body.accessToken))
    .attach("image", fixturePath);
  expect(withImage.status).toBe(200);

  const updatedImage = await Idea.findById(idea._id).lean();
  expect(updatedImage?.imageUrl).toMatch(/\/uploads\/ideas\//);
});

test("DELETE /api/ideas/:id removes idea and related data", async () => {
  const reg1 = await registerUser(app, { username: "u8", email: "u8@test.com" });
  const reg2 = await registerUser(app, { username: "u9", email: "u9@test.com" });

  const idea = await Idea.create({
    authorId: new mongoose.Types.ObjectId(reg1.body.user.id),
    text: "to delete"
  });

  await Like.create({ userId: new mongoose.Types.ObjectId(reg1.body.user.id), ideaId: idea._id });
  await Comment.create({ authorId: new mongoose.Types.ObjectId(reg1.body.user.id), ideaId: idea._id, text: "c1" });

  const unauth = await request(app).delete(`/api/ideas/${idea._id.toString()}`);
  expect(unauth.status).toBe(401);

  const invalid = await request(app)
    .delete("/api/ideas/not-valid")
    .set(authHeader(reg1.body.accessToken));
  expect(invalid.status).toBe(400);

  const missing = await request(app)
    .delete(`/api/ideas/${new mongoose.Types.ObjectId().toString()}`)
    .set(authHeader(reg1.body.accessToken));
  expect(missing.status).toBe(404);

  const forbidden = await request(app)
    .delete(`/api/ideas/${idea._id.toString()}`)
    .set(authHeader(reg2.body.accessToken));
  expect(forbidden.status).toBe(403);

  const ok = await request(app)
    .delete(`/api/ideas/${idea._id.toString()}`)
    .set(authHeader(reg1.body.accessToken));
  expect(ok.status).toBe(204);

  const likeCount = await Like.countDocuments({ ideaId: idea._id });
  const commentCount = await Comment.countDocuments({ ideaId: idea._id });
  expect(likeCount).toBe(0);
  expect(commentCount).toBe(0);
});
