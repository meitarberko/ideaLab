import request from "supertest";
import { makeTestApp } from "../helpers/appForTest";
import { startTestMongo, stopTestMongo } from "../helpers/mongoTest";
import { clearDatabase } from "../helpers/db";
import { verifyGoogleIdToken } from "../../lib/google";
import { User } from "../../models/User";

jest.mock("../../lib/google", () => ({
  verifyGoogleIdToken: jest.fn()
}));

const mockedVerifyGoogleIdToken = verifyGoogleIdToken as jest.MockedFunction<typeof verifyGoogleIdToken>;
const app = makeTestApp();

beforeAll(async () => startTestMongo());
afterAll(async () => stopTestMongo());
afterEach(async () => {
  mockedVerifyGoogleIdToken.mockReset();
  await clearDatabase();
});

test("POST /api/auth/google logs in and creates a user", async () => {
  mockedVerifyGoogleIdToken.mockResolvedValue({
    googleId: "google-123",
    email: "jane@example.com",
    name: "Jane Doe",
    picture: "https://example.test/avatar.png"
  });

  const res = await request(app).post("/api/auth/google").send({ idToken: "valid-token" });

  expect(res.status).toBe(200);
  expect(res.body.accessToken).toBeTruthy();
  expect(res.body.user.email).toBe("jane@example.com");
  expect(res.headers["set-cookie"][0]).toMatch(/refreshToken=/);

  const user = await User.findOne({ googleId: "google-123" }).lean();
  expect(user?.email).toBe("jane@example.com");
});

test("POST /api/auth/google returns 400 when idToken is missing", async () => {
  const res = await request(app).post("/api/auth/google").send({});
  expect(res.status).toBe(400);
  expect(res.body.message).toBe("Validation error");
});

test("POST /api/auth/google returns 401 for invalid token", async () => {
  mockedVerifyGoogleIdToken.mockRejectedValue(new Error("Invalid Google ID token"));

  const res = await request(app).post("/api/auth/google").send({ idToken: "bad-token" });

  expect(res.status).toBe(401);
  expect(res.body.message).toBe("Invalid Google token");
});

test("POST /api/auth/google returns 500 when Google OAuth is not configured", async () => {
  mockedVerifyGoogleIdToken.mockRejectedValue(new Error("GOOGLE_CLIENT_ID is missing"));

  const res = await request(app).post("/api/auth/google").send({ idToken: "valid-token" });

  expect(res.status).toBe(500);
  expect(res.body.message).toBe("Google OAuth not configured");
});

test("POST /api/auth/google returns 400 when Google payload has no email", async () => {
  mockedVerifyGoogleIdToken.mockResolvedValue({
    googleId: "google-456",
    email: null,
    name: "No Email User",
    picture: null
  });

  const res = await request(app).post("/api/auth/google").send({ idToken: "valid-token" });

  expect(res.status).toBe(400);
  expect(res.body.message).toBe("Email is required");
});
