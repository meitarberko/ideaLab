import { Router } from "express";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { Comment } from "../models/Comment";

const router = Router();

router.delete("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) return res.status(404).json({ message: "Not found" });
  if (String(comment.authorId) !== req.user!.userId) return res.status(403).json({ message: "Forbidden" });

  await comment.deleteOne();
  res.status(204).send();
});

export default router;
