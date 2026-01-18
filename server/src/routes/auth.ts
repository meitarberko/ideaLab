import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import multer from "multer";
import { User } from "../models/User";
import { clearRefreshCookie, setRefreshCookie } from "../lib/cookies";
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/tokens";
import { verifyGoogleIdToken } from "../lib/google";

const router = Router();
const upload = multer();


function parseMultipartIfNeeded(req: Request, res: Response, next: NextFunction) {
  const ct = req.headers["content-type"] || "";
  if (typeof ct === "string" && ct.includes("multipart/form-data")) {
    return upload.none()(req, res, next);
  }
  return next();
}

function sendZodError(res: Response, error: z.ZodError) {
  return res.status(400).json({
    message: "Validation error",
    errors: error.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message
    }))
  });
}

function buildUsernameBase(name: string | null, email: string | null, googleId: string) {
  const raw = (name || (email ? email.split("@")[0] : "") || `user${googleId.slice(0, 6)}`).trim();
  const compact = raw.replace(/\s+/g, "");
  const cleaned = compact.replace(/[^a-zA-Z0-9._-]/g, "");
  const fallback = `user${googleId.slice(0, 6)}`;
  return (cleaned || fallback).slice(0, 24);
}

async function generateUniqueUsername(base: string) {
  let candidate = base;
  let suffix = 0;
  while (await User.findOne({ username: candidate }).lean()) {
    suffix += 1;
    const suffixStr = String(suffix);
    const trimmed = base.slice(0, Math.max(1, 24 - suffixStr.length));
    candidate = `${trimmed}${suffixStr}`;
  }
  return candidate;
}

const registerSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z.string().min(5, "Password must be at least 5 characters")
});

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register user
 *     tags:
 *       - Auth
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username: { type: string, example: johndoe }
 *               email: { type: string, example: john@example.com }
 *               password: { type: string, example: "12345678" }
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username: { type: string, example: johndoe }
 *               email: { type: string, example: john@example.com }
 *               password: { type: string, example: "12345678" }
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Validation error
 *       409:
 *         description: Conflict
 */
router.post("/register", parseMultipartIfNeeded, async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return sendZodError(res, parsed.error);

  const { username, email, password } = parsed.data;

  const usernameExists = await User.findOne({ username }).lean();
  if (usernameExists) return res.status(409).json({ message: "Username already exists" });

  const emailExists = await User.findOne({ email }).lean();
  if (emailExists) return res.status(409).json({ message: "Email already exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, email, passwordHash, provider: "local" });

  const payload = { userId: String(user._id), username: user.username };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  user.refreshTokenHashes = [hashToken(refreshToken)];
  await user.save();

  setRefreshCookie(res, refreshToken);
  res.status(201).json({
    accessToken,
    user: { id: String(user._id), username: user.username, email: user.email, avatarUrl: user.avatarUrl }
  });
});

const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(5, "Password must be at least 5 characters")
});

const googleSchema = z.object({
  idToken: z.string().min(1, "idToken is required")
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags:
 *       - Auth
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string, example: johndoe }
 *               password: { type: string, example: "12345678" }
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string, example: johndoe }
 *               password: { type: string, example: "12345678" }
 *     responses:
 *       200:
 *         description: Login success
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post("/login", parseMultipartIfNeeded, async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return sendZodError(res, parsed.error);

  const { username, password } = parsed.data;

  const user = await User.findOne({ username });
  if (!user || !user.passwordHash) return res.status(401).json({ message: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const payload = { userId: String(user._id), username: user.username };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const rtHash = hashToken(refreshToken);
  user.refreshTokenHashes = [rtHash, ...user.refreshTokenHashes].slice(0, 10);
  await user.save();

  setRefreshCookie(res, refreshToken);
  res.json({
    accessToken,
    user: { id: String(user._id), username: user.username, email: user.email, avatarUrl: user.avatarUrl }
  });
});

/**
 * @openapi
 * /api/auth/google:
 *   post:
 *     summary: Login with Google ID token
 *     tags:
 *       - Auth
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken: { type: string, example: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." }
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Validation error or missing email
 *       401:
 *         description: Invalid Google token
 *       500:
 *         description: Google OAuth not configured
 */
router.post("/google", async (req: Request, res: Response) => {
  const parsed = googleSchema.safeParse(req.body);
  if (!parsed.success) return sendZodError(res, parsed.error);

  let payload;
  try {
    payload = await verifyGoogleIdToken(parsed.data.idToken);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("GOOGLE_CLIENT_ID")) {
      return res.status(500).json({ message: "Google OAuth not configured" });
    }
    return res.status(401).json({ message: "Invalid Google token" });
  }

  if (!payload.email) {
    return res.status(400).json({ message: "Email is required" });
  }

  let user = await User.findOne({ googleId: payload.googleId });
  if (!user) {
    user = await User.findOne({ email: payload.email });
    if (user) {
      user.googleId = payload.googleId;
      if (user.provider !== "google") user.provider = "google";
      if (!user.avatarUrl && payload.picture) user.avatarUrl = payload.picture;
      await user.save();
    }
  }

  if (!user) {
    const baseUsername = buildUsernameBase(payload.name, payload.email, payload.googleId);
    const username = await generateUniqueUsername(baseUsername);
    user = await User.create({
      username,
      email: payload.email,
      provider: "google",
      googleId: payload.googleId,
      avatarUrl: payload.picture || undefined
    });
  }

  const authPayload = { userId: String(user._id), username: user.username };
  const accessToken = signAccessToken(authPayload);
  const refreshToken = signRefreshToken(authPayload);

  const rtHash = hashToken(refreshToken);
  user.refreshTokenHashes = [rtHash, ...user.refreshTokenHashes].slice(0, 10);
  await user.save();

  setRefreshCookie(res, refreshToken);
  res.json({
    accessToken,
    user: { id: String(user._id), username: user.username, email: user.email, avatarUrl: user.avatarUrl }
  });
});

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags:
 *       - Auth
 *     security: []
 *     responses:
 *       200:
 *         description: New access token
 *       401:
 *         description: Unauthorized
 */
router.post("/refresh", async (req: Request, res: Response) => {
  const token = (req as any).cookies?.refreshToken;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.userId);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const tokenHash = hashToken(token);
    if (!user.refreshTokenHashes.includes(tokenHash)) return res.status(401).json({ message: "Unauthorized" });

    const newPayload = { userId: String(user._id), username: user.username };
    const newAccess = signAccessToken(newPayload);
    const newRefresh = signRefreshToken(newPayload);

    const newHash = hashToken(newRefresh);
    user.refreshTokenHashes = [newHash, ...user.refreshTokenHashes.filter((h) => h !== tokenHash)].slice(0, 10);
    await user.save();

    setRefreshCookie(res, newRefresh);
    res.json({ accessToken: newAccess });
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
});

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags:
 *       - Auth
 *     responses:
 *       204:
 *         description: Logged out
 */
router.post("/logout", async (req: Request, res: Response) => {
  const token = (req as any).cookies?.refreshToken;

  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      const user = await User.findById(payload.userId);
      if (user) {
        const tokenHash = hashToken(token);
        user.refreshTokenHashes = user.refreshTokenHashes.filter((h) => h !== tokenHash);
        await user.save();
      }
    } catch {}
  }

  clearRefreshCookie(res);
  res.status(204).send();
});

export default router;
