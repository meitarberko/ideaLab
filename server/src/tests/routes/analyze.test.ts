import request from "supertest";
import mongoose from "mongoose";
import { startTestMongo, stopTestMongo } from "../helpers/mongoTest";
import { clearDatabase } from "../helpers/db";
import { authHeader, registerUser } from "../helpers/testUtils";
import { Idea } from "../../models/Idea";
import { IdeaAnalysis } from "../../models/IdeaAnalysis";
import { geminiClient } from "../../lib/gemini";

jest.mock("../../lib/gemini", () => ({
  geminiClient: jest.fn()
}));

let app: any;
const mockedGemini = jest.mocked(geminiClient);

beforeAll(async () => {
  const { makeTestApp } = require("../helpers/appForTest");
  app = makeTestApp();
  await startTestMongo();
});
afterAll(async () => stopTestMongo());
afterEach(async () => {
  mockedGemini.mockReset();
  await clearDatabase();
});

function mockGeminiResponse(payload: any) {
  mockedGemini.mockReturnValue({
    getGenerativeModel: () => ({
      generateContent: async () => ({
        response: { text: () => JSON.stringify(payload) }
      })
    })
  } as any);
}

test("POST /api/ideas/:id/analyze requires auth", async () => {
  const res = await request(app).post(`/api/ideas/${new mongoose.Types.ObjectId().toString()}/analyze`);
  expect(res.status).toBe(401);
});

test("POST /api/ideas/:id/analyze validates idea id and existence", async () => {
  const reg = await registerUser(app, { username: "u1", email: "u1@test.com" });

  const invalidId = await request(app)
    .post("/api/ideas/not-valid/analyze")
    .set(authHeader(reg.body.accessToken))
    .send({});
  expect(invalidId.status).toBe(400);

  const missingIdea = await request(app)
    .post(`/api/ideas/${new mongoose.Types.ObjectId().toString()}/analyze`)
    .set(authHeader(reg.body.accessToken))
    .send({});
  expect(missingIdea.status).toBe(404);
});

test("POST /api/ideas/:id/analyze returns cached result", async () => {
  const reg = await registerUser(app, { username: "u2", email: "u2@test.com" });
  const idea = await Idea.create({
    authorId: new mongoose.Types.ObjectId(reg.body.user.id),
    text: "idea"
  });

  const cached = await IdeaAnalysis.create({
    ideaId: idea._id,
    ideaUpdatedAt: idea.updatedAt,
    question: "",
    result: {
      ideaDevelopment: "dev",
      competitors: [],
      risks: [],
      opportunities: [],
      improvements: [],
      searchDirections: []
    }
  });

  const res = await request(app)
    .post(`/api/ideas/${idea._id.toString()}/analyze`)
    .set(authHeader(reg.body.accessToken))
    .send({});
  expect(res.status).toBe(200);
  expect(res.body.fromCache).toBe(true);
  expect(res.body.createdAt).toBeTruthy();
  expect(res.body.ideaDevelopment).toBe(cached.result.ideaDevelopment);
  expect(mockedGemini).not.toHaveBeenCalled();
});

test("POST /api/ideas/:id/analyze saves new analysis", async () => {
  const reg = await registerUser(app, { username: "u3", email: "u3@test.com" });
  const idea = await Idea.create({
    authorId: new mongoose.Types.ObjectId(reg.body.user.id),
    text: "idea"
  });

  mockGeminiResponse({
    ideaDevelopment: "dev",
    competitors: ["c1"],
    risks: ["r1"],
    opportunities: ["o1"],
    improvements: ["i1"],
    searchDirections: ["s1"]
  });

  const res = await request(app)
    .post(`/api/ideas/${idea._id.toString()}/analyze`)
    .set(authHeader(reg.body.accessToken))
    .send({});
  expect(res.status).toBe(200);
  expect(res.body.ideaDevelopment).toBe("dev");

  const stored = await IdeaAnalysis.findOne({ ideaId: idea._id, question: "" }).lean();
  expect(stored).toBeTruthy();
});

test("POST /api/ideas/:id/analyze handles invalid AI response", async () => {
  const reg = await registerUser(app, { username: "u4", email: "u4@test.com" });
  const idea = await Idea.create({
    authorId: new mongoose.Types.ObjectId(reg.body.user.id),
    text: "idea"
  });

  mockedGemini.mockReturnValue({
    getGenerativeModel: () => ({
      generateContent: async () => ({
        response: { text: () => "not-json" }
      })
    })
  } as any);

  const res = await request(app)
    .post(`/api/ideas/${idea._id.toString()}/analyze`)
    .set(authHeader(reg.body.accessToken))
    .send({});
  expect(res.status).toBe(502);
});

test("POST /api/ideas/:id/analyze handles provider error", async () => {
  const reg = await registerUser(app, { username: "u5", email: "u5@test.com" });
  const idea = await Idea.create({
    authorId: new mongoose.Types.ObjectId(reg.body.user.id),
    text: "idea"
  });

  mockedGemini.mockReturnValue({
    getGenerativeModel: () => ({
      generateContent: async () => {
        throw new Error("boom");
      }
    })
  } as any);

  const res = await request(app)
    .post(`/api/ideas/${idea._id.toString()}/analyze`)
    .set(authHeader(reg.body.accessToken))
    .send({});
  expect(res.status).toBe(502);
});
