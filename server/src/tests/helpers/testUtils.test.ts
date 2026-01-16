import express from "express";
import { authHeader, loginUser, registerUser } from "./testUtils";

function makeApp(withCookie: boolean) {
  const app = express();
  app.use(express.json());

  app.post("/api/auth/register", (req, res) => {
    if (withCookie) res.setHeader("Set-Cookie", "refreshToken=abc");
    res.json({ ok: true, user: { id: "u1" } });
  });

  app.post("/api/auth/login", (req, res) => {
    if (withCookie) res.setHeader("Set-Cookie", "refreshToken=def");
    res.json({ ok: true });
  });

  return app;
}

test("registerUser returns refresh cookie when present", async () => {
  const app = makeApp(true);
  const res = await registerUser(app, { username: "u1", email: "u1@test.com" });
  expect(res.status).toBe(200);
  expect(res.refreshCookie).toContain("refreshToken=");
});

test("registerUser returns empty refresh cookie when missing", async () => {
  const app = makeApp(false);
  const res = await registerUser(app, { username: "u2", email: "u2@test.com" });
  expect(res.status).toBe(200);
  expect(res.refreshCookie).toBe("");
});

test("loginUser returns empty refresh cookie when missing", async () => {
  const app = makeApp(false);
  const res = await loginUser(app, "u1", "12345");
  expect(res.status).toBe(200);
  expect(res.refreshCookie).toBe("");
});

test("authHeader formats bearer token", () => {
  expect(authHeader("abc")).toEqual({ Authorization: "Bearer abc" });
});
