import { Router } from "express";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { Like } from "../models/Like";

const router = Router({ mergeParams: true });

router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  try {
    await Like.create({ userId: req.user!.userId, ideaId: req.params.id });
    res.status(201).send();
  } catch {
    res.status(204).send();
  }
});

router.delete("/", requireAuth, async (req: AuthedRequest, res) => {
  await Like.deleteOne({ userId: req.user!.userId, ideaId: req.params.id });
  res.status(204).send();
});

export default router;
