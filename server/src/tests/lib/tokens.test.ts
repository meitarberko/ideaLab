import jwt from "jsonwebtoken";

function loadTokensWithEnv(overrides: Record<string, string | undefined>) {
  const saved = { ...process.env };
  process.env = { ...saved, ...overrides };
  let mod: any;
  jest.resetModules();
  jest.isolateModules(() => {
    mod = require("../../lib/tokens");
  });
  process.env = saved;
  jest.resetModules();
  return mod;
}

test("tokens throw when secrets missing", () => {
  const saved = { ...process.env };
  delete process.env.JWT_ACCESS_SECRET;
  delete process.env.JWT_REFRESH_SECRET;

  jest.resetModules();
  expect(() => {
    jest.isolateModules(() => {
      require("../../lib/tokens");
    });
  }).toThrow("JWT secrets are missing");

  process.env = saved;
  jest.resetModules();
});

test("tokens use env overrides when provided", () => {
  const mod = loadTokensWithEnv({
    JWT_ACCESS_SECRET: "access",
    JWT_REFRESH_SECRET: "refresh",
    ACCESS_TOKEN_TTL: "1h",
    REFRESH_TOKEN_TTL_DAYS: "7"
  });
  const payload = { userId: "u1", username: "user" };
  const access = mod.signAccessToken(payload);
  const refresh = mod.signRefreshToken(payload);
  expect(access).toBeTruthy();
  expect(refresh).toBeTruthy();
});

test("tokens fall back to defaults when ttl env missing", () => {
  const mod = loadTokensWithEnv({
    JWT_ACCESS_SECRET: "access",
    JWT_REFRESH_SECRET: "refresh",
    ACCESS_TOKEN_TTL: "",
    REFRESH_TOKEN_TTL_DAYS: ""
  });
  const payload = { userId: "u1", username: "user" };
  const access = mod.signAccessToken(payload);
  const refresh = mod.signRefreshToken(payload);
  const accessDecoded = mod.verifyAccessToken(access) as jwt.JwtPayload;
  const refreshDecoded = mod.verifyRefreshToken(refresh) as jwt.JwtPayload;
  expect(accessDecoded).toEqual(expect.objectContaining(payload));
  expect(refreshDecoded).toEqual(expect.objectContaining(payload));
});

test("sign and verify access/refresh tokens", () => {
  const { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } =
    require("../../lib/tokens");
  const payload = { userId: "u1", username: "user" };

  const access = signAccessToken(payload);
  const accessDecoded = verifyAccessToken(access) as jwt.JwtPayload;
  expect(accessDecoded).toEqual(expect.objectContaining(payload));

  const refresh = signRefreshToken(payload);
  const refreshDecoded = verifyRefreshToken(refresh) as jwt.JwtPayload;
  expect(refreshDecoded).toEqual(expect.objectContaining(payload));
});

test("hashToken is deterministic", () => {
  const { hashToken } = require("../../lib/tokens");
  expect(hashToken("abc")).toBe(hashToken("abc"));
  expect(hashToken("abc")).not.toBe(hashToken("def"));
});
