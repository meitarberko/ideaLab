import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { User } from "../models/User";
import { clearRefreshCookie, setRefreshCookie } from "../lib/cookies";
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/tokens";

const router = Router();

const registerSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(5)
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Validation error" });

  const { username, email, password } = parsed.data;
  const exists = await User.findOne({ username }).lean();
  if (exists) return res.status(409).json({ message: "Username already exists" });

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
  username: z.string().min(1),
  password: z.string().min(5)
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Validation error" });

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

router.post("/refresh", async (req, res) => {
  const token = req.cookies.refreshToken;
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

router.post("/logout", async (req, res) => {
  const token = req.cookies.refreshToken;
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
