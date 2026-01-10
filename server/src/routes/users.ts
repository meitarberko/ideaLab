import { Router } from "express";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { User } from "../models/User";
import { makeUploader, buildPublicUploadUrl } from "../lib/uploads";
import { z } from "zod";
import path from "path";

const router = Router();
const uploadAvatar = makeUploader("avatars");

router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await User.findById(req.user!.userId).lean();
  if (!user) return res.status(404).json({ message: "Not found" });
  res.json({ id: String(user._id), username: user.username, email: user.email, avatarUrl: user.avatarUrl });
});

const updateSchema = z.object({
  username: z.string().min(1).optional()
});

router.patch("/me", requireAuth, uploadAvatar.single("avatar"), async (req: AuthedRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Validation error" });

  const updates: { username?: string; avatarUrl?: string } = {};
  if (parsed.data.username) updates.username = parsed.data.username;

  if (req.file) {
    const filename = path.basename(req.file.path);
    updates.avatarUrl = buildPublicUploadUrl("avatars", filename);
  }

  if (updates.username) {
    const exists = await User.findOne({ username: updates.username, _id: { $ne: req.user!.userId } }).lean();
    if (exists) return res.status(409).json({ message: "Username already exists" });
  }

  const user = await User.findByIdAndUpdate(req.user!.userId, updates, { new: true }).lean();
  if (!user) return res.status(404).json({ message: "Not found" });

  res.json({ id: String(user._id), username: user.username, email: user.email, avatarUrl: user.avatarUrl });
});

router.get("/:id", async (req, res) => {
  const user = await User.findById(req.params.id).lean();
  if (!user) return res.status(404).json({ message: "Not found" });
  res.json({ id: String(user._id), username: user.username, email: user.email, avatarUrl: user.avatarUrl });
});

export default router;
