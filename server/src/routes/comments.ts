import { Router, Request } from "express";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { Comment } from "../models/Comment";
import { z } from "zod";

const router = Router({ mergeParams: true });

const addSchema = z.object({ text: z.string().min(1) });

router.post("/:id", requireAuth, async (req: AuthedRequest & { params: { id: string } }, res) => {
    const parsed = addSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation error" });
    }

    const comment = await Comment.create({
      ideaId: req.params.id,
      authorId: req.user!.userId,
      text: parsed.data.text
    });

    res.status(201).json({ id: String(comment._id) });
  });

router.get("/:id", async (req: Request<{ id: string },any, any, 
    { limit?: string; cursor?: string }>, res) => {
    const limit = Math.min(Number(req.query.limit || 20), 50);
    const cursor = req.query.cursor ? new Date(String(req.query.cursor)) : null;

    const query: any = { ideaId: req.params.id };

    if (cursor) query.createdAt = { $lt: cursor };

  const comments = await Comment.find(query).sort({ createdAt: -1 }).limit(limit + 1).lean();
  const items = comments.slice(0, limit);
  const nextCursor = comments.length > limit ? items[items.length - 1].createdAt.toISOString() : null;

  res.json({
    items: items.map((c) => ({
      id: String(c._id),
      ideaId: String(c.ideaId),
      authorId: String(c.authorId),
      text: c.text,
      createdAt: c.createdAt
    })),
    nextCursor
  });
});

export default router;
