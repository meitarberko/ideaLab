import request from "supertest";
import mongoose from "mongoose";
import { startTestMongo, stopTestMongo } from "../helpers/mongoTest";
import { clearDatabase } from "../helpers/db";
import { authHeader, registerUser } from "../helpers/testUtils";
import { Idea } from "../../models/Idea";
import { analyzeIdeaWithGroq } from "../../services/groqService";

jest.mock("../../services/groqService", () => ({
  analyzeIdeaWithGroq: jest.fn()
}));

let app: any;
const mockedAnalyze = jest.mocked(analyzeIdeaWithGroq);

beforeAll(async () => {
  const { makeTestApp } = require("../helpers/appForTest");
  app = makeTestApp();
  await startTestMongo();
});
afterAll(async () => stopTestMongo());
afterEach(async () => {
  mockedAnalyze.mockReset();
  await clearDatabase();
});

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
    text: "idea",
    analysisCache: {
      createdAt: new Date(),
      analysis: {
        development: { question: "q1", explanation: "e1", examples: ["x1", "x2"] },
        risks: { question: "q2", explanation: "e2", examples: ["x3", "x4"] },
        opportunities: { question: "q3", explanation: "e3", examples: ["x5", "x6"] },
        improvements: { question: "q4", explanation: "e4", examples: ["x7", "x8"] }
      }
    }
  });

  const res = await request(app)
    .post(`/api/ideas/${idea._id.toString()}/analyze`)
    .set(authHeader(reg.body.accessToken))
    .send({});
  expect(res.status).toBe(200);
  expect(res.body.cached).toBe(true);
  expect(res.body.ideaId).toBe(String(idea._id));
  expect(res.body.analysis.development.question).toBe("q1");
  expect(mockedAnalyze).not.toHaveBeenCalled();
});

test("POST /api/ideas/:id/analyze saves new analysis and then reuses cache", async () => {
  const reg = await registerUser(app, { username: "u3", email: "u3@test.com" });
  const idea = await Idea.create({
    authorId: new mongoose.Types.ObjectId(reg.body.user.id),
    text: "idea"
  });

  mockedAnalyze.mockResolvedValue({
    development: { question: "q1", explanation: "e1", examples: ["a", "b"] },
    risks: { question: "q2", explanation: "e2", examples: ["a", "b"] },
    opportunities: { question: "q3", explanation: "e3", examples: ["a", "b"] },
    improvements: { question: "q4", explanation: "e4", examples: ["a", "b"] }
  });

  const first = await request(app)
    .post(`/api/ideas/${idea._id.toString()}/analyze`)
    .set(authHeader(reg.body.accessToken))
    .send({});
  expect(first.status).toBe(200);
  expect(first.body.cached).toBe(false);
  expect(first.body.analysis.development.question).toBe("q1");
  expect(mockedAnalyze).toHaveBeenCalledTimes(1);

  const stored = await Idea.findById(idea._id).lean();
  expect(stored?.analysisCache?.analysis.development.question).toBe("q1");

  const second = await request(app)
    .post(`/api/ideas/${idea._id.toString()}/analyze`)
    .set(authHeader(reg.body.accessToken))
    .send({});
  expect(second.status).toBe(200);
  expect(second.body.cached).toBe(true);
  expect(mockedAnalyze).toHaveBeenCalledTimes(1);
});

test("POST /api/ideas/:id/analyze returns fallback analysis when service provides fallback", async () => {
  const reg = await registerUser(app, { username: "u4", email: "u4@test.com" });
  const idea = await Idea.create({
    authorId: new mongoose.Types.ObjectId(reg.body.user.id),
    text: "idea"
  });

  mockedAnalyze.mockResolvedValue({
    development: {
      question: "Have you explored possible development directions for this idea?",
      explanation: "Consider thinking about how this idea could evolve into a practical solution.",
      examples: []
    },
    risks: {
      question: "Have you considered possible risks or challenges?",
      explanation: "Every idea may face technical, financial, or market risks.",
      examples: []
    },
    opportunities: {
      question: "Have you identified potential opportunities this idea might create?",
      explanation: "Opportunities may include market demand, innovation, or social impact.",
      examples: []
    },
    improvements: {
      question: "Have you considered ways to improve this idea?",
      explanation: "Ideas can often be strengthened through iteration and feedback.",
      examples: []
    }
  });

  const res = await request(app)
    .post(`/api/ideas/${idea._id.toString()}/analyze`)
    .set(authHeader(reg.body.accessToken))
    .send({});
  expect(res.status).toBe(200);
  expect(res.body.cached).toBe(false);
  expect(res.body.analysis.development.examples).toEqual([]);
});
