import request from "supertest";
import mongoose from "mongoose";
import { makeTestApp } from "../helpers/appForTest";
import { startTestMongo, stopTestMongo } from "../helpers/mongoTest";
import { clearDatabase } from "../helpers/db";
import { authHeader, registerUser } from "../helpers/testUtils";
import { Idea } from "../../models/Idea";
import { Like } from "../../models/Like";
import { Comment } from "../../models/Comment";
import { User } from "../../models/User";

const app = makeTestApp();

beforeAll(async () => startTestMongo());
afterAll(async () => stopTestMongo());
afterEach(async () => clearDatabase());

test("GET /api/notifications returns latest likes and comments for my posts", async () => {
  const owner = await registerUser(app, { username: "owner1", email: "owner1@test.com" });
  const liker = await registerUser(app, { username: "liker1", email: "liker1@test.com" });
  const commenter = await registerUser(app, { username: "commenter1", email: "commenter1@test.com" });

  const idea = await Idea.create({
    authorId: new mongoose.Types.ObjectId(owner.body.user.id),
    text: "owner idea"
  });

  await Like.create({
    userId: new mongoose.Types.ObjectId(liker.body.user.id),
    ideaId: idea._id
  });
  await new Promise((r) => setTimeout(r, 5));
  await Comment.create({
    authorId: new mongoose.Types.ObjectId(commenter.body.user.id),
    ideaId: idea._id,
    text: "great idea"
  });

  const res = await request(app)
    .get("/api/notifications?limit=5")
    .set(authHeader(owner.body.accessToken));

  expect(res.status).toBe(200);
  expect(res.body.items.length).toBe(2);
  expect(res.body.items[0].type).toBe("comment");
  expect(res.body.items[0].actorUsername).toBe("commenter1");
  expect(res.body.items[1].type).toBe("like");
  expect(res.body.items[1].actorUsername).toBe("liker1");
  expect(res.body.unreadCount).toBe(2);
});

test("GET /api/notifications ignores activity on other users' posts and self activity", async () => {
  const owner = await registerUser(app, { username: "owner2", email: "owner2@test.com" });
  const other = await registerUser(app, { username: "other2", email: "other2@test.com" });

  const myIdea = await Idea.create({
    authorId: new mongoose.Types.ObjectId(owner.body.user.id),
    text: "my idea"
  });
  const otherIdea = await Idea.create({
    authorId: new mongoose.Types.ObjectId(other.body.user.id),
    text: "other idea"
  });

  await Like.create({
    userId: new mongoose.Types.ObjectId(owner.body.user.id),
    ideaId: myIdea._id
  });
  await Comment.create({
    authorId: new mongoose.Types.ObjectId(owner.body.user.id),
    ideaId: myIdea._id,
    text: "self comment"
  });
  await Like.create({
    userId: new mongoose.Types.ObjectId(owner.body.user.id),
    ideaId: otherIdea._id
  });
  await Comment.create({
    authorId: new mongoose.Types.ObjectId(other.body.user.id),
    ideaId: otherIdea._id,
    text: "other post comment"
  });

  const res = await request(app)
    .get("/api/notifications?limit=5")
    .set(authHeader(owner.body.accessToken));

  expect(res.status).toBe(200);
  expect(res.body.items).toEqual([]);
  expect(res.body.unreadCount).toBe(0);
});

test("POST /api/notifications/read marks notifications as read", async () => {
  const owner = await registerUser(app, { username: "owner3", email: "owner3@test.com" });
  const liker = await registerUser(app, { username: "liker3", email: "liker3@test.com" });

  const idea = await Idea.create({
    authorId: new mongoose.Types.ObjectId(owner.body.user.id),
    text: "owner idea"
  });
  await Like.create({
    userId: new mongoose.Types.ObjectId(liker.body.user.id),
    ideaId: idea._id
  });

  const readRes = await request(app)
    .post("/api/notifications/read")
    .set(authHeader(owner.body.accessToken));

  expect(readRes.status).toBe(204);

  const user = await User.findById(owner.body.user.id).lean();
  expect(user?.notificationsSeenAt).toBeTruthy();

  const listRes = await request(app)
    .get("/api/notifications?limit=5")
    .set(authHeader(owner.body.accessToken));

  expect(listRes.status).toBe(200);
  expect(listRes.body.unreadCount).toBe(0);
});

test("GET /api/notifications requires auth and supports pagination cursor", async () => {
  const owner = await registerUser(app, { username: "owner4", email: "owner4@test.com" });
  const actor = await registerUser(app, { username: "actor4", email: "actor4@test.com" });

  const idea = await Idea.create({
    authorId: new mongoose.Types.ObjectId(owner.body.user.id),
    text: "owner idea"
  });

  await Like.create({
    userId: new mongoose.Types.ObjectId(actor.body.user.id),
    ideaId: idea._id
  });
  await new Promise((r) => setTimeout(r, 5));
  await Comment.create({
    authorId: new mongoose.Types.ObjectId(actor.body.user.id),
    ideaId: idea._id,
    text: "c1"
  });

  const unauth = await request(app).get("/api/notifications");
  expect(unauth.status).toBe(401);

  const first = await request(app)
    .get("/api/notifications?limit=1")
    .set(authHeader(owner.body.accessToken));
  expect(first.status).toBe(200);
  expect(first.body.items.length).toBe(1);
  expect(first.body.nextCursor).toBeTruthy();

  const second = await request(app)
    .get(`/api/notifications?limit=5&cursor=${encodeURIComponent(first.body.nextCursor)}`)
    .set(authHeader(owner.body.accessToken));
  expect(second.status).toBe(200);
  expect(second.body.items.length).toBe(1);
});
