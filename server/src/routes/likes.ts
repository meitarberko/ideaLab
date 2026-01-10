import { Router } from "express";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { Like } from "../models/Like";
import { Idea } from "../models/Idea";
import mongoose from "mongoose";

const router = Router({ mergeParams: true });

/**
 * @openapi
 * /api/ideas/{id}/likes:
 *   post:
 *     summary: Like idea
 *     tags:
 *       - Likes
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Like created
 *       204:
 *         description: Already liked
 *       400:
 *         description: Invalid id
 *       404:
 *         description: Not found
 */
router.post("/", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid idea id" });
    }

    const idea = await Idea.findById(id).lean();
    if (!idea) return res.status(404).json({ message: "Idea not found" });

    await Like.create({ userId: req.user!.userId, ideaId: req.params.id });
    res.status(201).send();
  } catch (err: any) {
    if (err?.code === 11000) return res.status(204).send();
    return next(err);
  }
});

/**
 * @openapi
 * /api/ideas/{id}/likes:
 *   delete:
 *     summary: Remove like
 *     tags:
 *       - Likes
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Like removed
 *       400:
 *         description: Invalid id
 *       404:
 *         description: Not found
 */
router.delete("/", requireAuth, async (req: AuthedRequest, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid idea id" });
  }

  const idea = await Idea.findById(id).lean();
  if (!idea) return res.status(404).json({ message: "Idea not found" });

  await Like.deleteOne({ userId: req.user!.userId, ideaId: req.params.id });
  res.status(204).send();
});

export default router;