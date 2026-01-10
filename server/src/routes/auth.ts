import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import multer from "multer";
import { User } from "../models/User";
import { clearRefreshCookie, setRefreshCookie } from "../lib/cookies";
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/tokens";

const router = Router();
const upload = multer();

function sendZodError(res: Response, error: z.ZodError) {
  return res.status(400).json({
    message: "Validation error",
    errors: error.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message
    }))
  });
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
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Validation error
 *       409:
 *         description: Conflict
 */
router.post("/register", upload.none(), async (req: Request, res: Response) => {
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

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     responses:
 *       200:
 *         description: Login success
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post("/login", upload.none(), async (req: Request, res: Response) => {
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
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     responses:
 *       200:
 *         description: New access token
 *       401:
 *         description: Unauthorized
 */
router.post("/refresh", async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
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
 *     responses:
 *       204:
 *         description: Logged out
 */
router.post("/logout", async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;

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
