import { Router } from "express";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { Comment } from "../models/Comment";

const router = Router();

/**
 * @openapi
 * /api/comments/{id}:
 *   delete:
 *     summary: Delete comment
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Comment deleted
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.delete("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) return res.status(404).json({ message: "Not found" });
  if (String(comment.authorId) !== req.user!.userId) return res.status(403).json({ message: "Forbidden" });

  await comment.deleteOne();
  res.status(204).send();
});

export default router;
