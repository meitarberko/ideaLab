import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { AuthPayload } from "../types/auth";

const accessSecret: Secret = process.env.JWT_ACCESS_SECRET || "";
const refreshSecret: Secret = process.env.JWT_REFRESH_SECRET || "";

if (!accessSecret || !refreshSecret) {
  throw new Error("JWT secrets are missing");
}

const accessTtl: SignOptions["expiresIn"] =
  (process.env.ACCESS_TOKEN_TTL as SignOptions["expiresIn"]) || "15m";

const refreshDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 14);

export function signAccessToken(payload: AuthPayload) {
  return jwt.sign(payload as object, accessSecret, { expiresIn: accessTtl });
}

export function signRefreshToken(payload: AuthPayload) {
  return jwt.sign(payload as object, refreshSecret, { expiresIn: `${refreshDays}d` });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, accessSecret) as AuthPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, refreshSecret) as AuthPayload;
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
