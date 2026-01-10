import { Router, Request } from "express";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { Comment } from "../models/Comment";
import { Idea } from "../models/Idea";
import { z } from "zod";
import { Types } from "mongoose";

const router = Router({ mergeParams: true });

const addSchema = z.object({
  text: z.string().trim().min(1, "text is required")
});

function isValidObjectId(id: string) {
  return Types.ObjectId.isValid(id);
}

router.post("/", requireAuth, async (req: Request, res) => {
  const authed = req as AuthedRequest;
  const ideaId = String(req.params.id || "");
  if (!isValidObjectId(ideaId)) {
    return res.status(400).json({ message: "Invalid idea id" });
  }

  const parsed = addSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation error",
      errors: parsed.error.issues.map(i => ({ field: i.path.join("."), message: i.message }))
    });
  }

  const ideaExists = await Idea.exists({ _id: ideaId });
  if (!ideaExists) return res.status(404).json({ message: "Idea not found" });

  const comment = await Comment.create({
    ideaId,
    authorId: authed.user!.userId,
    text: parsed.data.text
  });

  res.status(201).json({ id: String(comment._id) });
});

router.get(
  "/",
  async (
    req: Request<{ id: string }, any, any, { limit?: string; cursor?: string }>,
    res
  ) => {
    const ideaId = String(req.params.id || "");
    if (!isValidObjectId(ideaId)) {
      return res.status(400).json({ message: "Invalid idea id" });
    }

    const limit = Math.min(Number(req.query.limit || 20), 50);
    const cursor = req.query.cursor ? new Date(String(req.query.cursor)) : null;

    const query: any = { ideaId };
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
  }
);

export default router;
