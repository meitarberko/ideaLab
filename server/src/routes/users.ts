import { Router } from "express";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { User } from "../models/User";
import { makeUploader, buildPublicUploadUrl } from "../lib/uploads";
import { z } from "zod";
import path from "path";
import mongoose from "mongoose";

const router = Router();
const uploadAvatar = makeUploader("avatars");

/**
 * @openapi
 * /api/users/me:
 *   get:
 *     summary: Get current user
 *     description: Get the current user's profile
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/UserProfile"
 *             example:
 *               id: "64f1c2b5e4b0f1a2b3c4d5e6"
 *               username: "janedoe"
 *               email: "jane@example.com"
 *               avatarUrl: "https://cdn.example.com/uploads/avatars/jane.png"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */
router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById((req as AuthedRequest).user!.userId).lean();
  if (!user) return res.status(404).json({ message: "Not found" });
  res.json({ id: String(user._id), username: user.username, email: user.email, avatarUrl: user.avatarUrl });
});

const updateSchema = z.object({
  username: z.string().min(1).optional()
});

/**
 * @openapi
 * /api/users/me:
 *   patch:
 *     summary: Update current user
 *     description: Update the current user's profile
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: newusername
 *               avatar:
 *                 type: string
 *                 format: binary
 *           examples:
 *             updateUsername:
 *               summary: Update username
 *               value:
 *                 username: "newusername"
 *             uploadAvatar:
 *               summary: Upload avatar
 *               value:
 *                 avatar: "<binary>"
 *     responses:
 *       200:
 *         description: Updated user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/UserProfile"
 *             example:
 *               id: "64f1c2b5e4b0f1a2b3c4d5e6"
 *               username: "janedoe"
 *               email: "jane@example.com"
 *               avatarUrl: "https://cdn.example.com/uploads/avatars/jane.png"
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *       409:
 *         description: Conflict
 */
router.patch("/me", requireAuth, uploadAvatar.single("avatar"), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Validation error" });

  const updates: { username?: string; avatarUrl?: string } = {};
  if (parsed.data.username) updates.username = parsed.data.username;

  if (req.file) {
    const filename = path.basename(req.file.path);
    updates.avatarUrl = buildPublicUploadUrl("avatars", filename);
  }

  if (updates.username) {
    const exists = await User.findOne({ username: updates.username, _id: { $ne: (req as AuthedRequest).user!.userId } }).lean();
    if (exists) return res.status(409).json({ message: "Username already exists" });
  }

  const user = await User.findByIdAndUpdate((req as AuthedRequest).user!.userId, updates, { new: true }).lean();
  if (!user) return res.status(404).json({ message: "Not found" });

  res.json({ id: String(user._id), username: user.username, email: user.email, avatarUrl: user.avatarUrl });
});

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     summary: Get user by id
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User profile
 *       400:
 *         description: Invalid id
 *       404:
 *         description: Not found
 */
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  const user = await User.findById(id).lean();

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({
    id: String(user._id),
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl
  });
});

export default router;
