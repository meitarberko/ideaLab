import { Router } from "express";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { Idea } from "../models/Idea";
import { Like } from "../models/Like";
import { Comment } from "../models/Comment";
import { makeUploader, buildPublicUploadUrl } from "../lib/uploads";
import { z } from "zod";
import path from "path";
import { requireFile } from "../middleware/requireFile";
import { validateBody } from "../middleware/validate";
import { createIdeaBodySchema } from "../schemas/ideasSchemas";



const router = Router();
const uploadIdeaImage = makeUploader("ideas");

router.post("/", requireAuth, uploadIdeaImage.single("image"),
  requireFile("image"), validateBody(createIdeaBodySchema), async (req: any, res) => {
    console.log("requireFile type:", typeof requireFile);

    const { text } = req.validatedBody;

    const filename = path.basename(req.file.path);
    const imageUrl = buildPublicUploadUrl("ideas", filename);

    const idea = await Idea.create({
      authorId: req.user!.userId,
      text,
      imageUrl
    });

    res.status(201).json({ id: String(idea._id) });
  }
);

router.get("/", async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 10), 30);
  const cursor = req.query.cursor ? new Date(String(req.query.cursor)) : null;

  const query: any = {};
  if (cursor) query.createdAt = { $lt: cursor };

  const ideas = await Idea.find(query).sort({ createdAt: -1 }).limit(limit + 1).lean();

  const items = ideas.slice(0, limit);
  const nextCursor = ideas.length > limit ? items[items.length - 1].createdAt.toISOString() : null;

  const ideaIds = items.map((i) => i._id);
  const likesAgg = await Like.aggregate([
    { $match: { ideaId: { $in: ideaIds } } },
    { $group: { _id: "$ideaId", count: { $sum: 1 } } }
  ]);

  const commentsAgg = await Comment.aggregate([
    { $match: { ideaId: { $in: ideaIds } } },
    { $group: { _id: "$ideaId", count: { $sum: 1 } } }
  ]);

  const likesMap = new Map<string, number>(likesAgg.map((x: any) => [String(x._id), x.count]));
  const commentsMap = new Map<string, number>(commentsAgg.map((x: any) => [String(x._id), x.count]));

  res.json({
    items: items.map((i) => ({
      id: String(i._id),
      authorId: String(i.authorId),
      text: i.text,
      imageUrl: i.imageUrl,
      createdAt: i.createdAt,
      likesCount: likesMap.get(String(i._id)) || 0,
      commentsCount: commentsMap.get(String(i._id)) || 0
    })),
    nextCursor
  });
});

router.get("/mine", requireAuth, async (req: AuthedRequest, res) => {
  const limit = Math.min(Number(req.query.limit || 10), 30);
  const cursor = req.query.cursor ? new Date(String(req.query.cursor)) : null;

  const query: any = { authorId: req.user!.userId };
  if (cursor) query.createdAt = { $lt: cursor };

  const ideas = await Idea.find(query).sort({ createdAt: -1 }).limit(limit + 1).lean();
  const items = ideas.slice(0, limit);
  const nextCursor = ideas.length > limit ? items[items.length - 1].createdAt.toISOString() : null;

  res.json({
    items: items.map((i) => ({
      id: String(i._id),
      authorId: String(i.authorId),
      text: i.text,
      imageUrl: i.imageUrl,
      createdAt: i.createdAt
    })),
    nextCursor
  });
});

router.get("/:id", async (req, res) => {
  const idea = await Idea.findById(req.params.id).lean();
  if (!idea) return res.status(404).json({ message: "Not found" });

  const likesCount = await Like.countDocuments({ ideaId: idea._id });
  const commentsCount = await Comment.countDocuments({ ideaId: idea._id });

  res.json({
    id: String(idea._id),
    authorId: String(idea.authorId),
    text: idea.text,
    imageUrl: idea.imageUrl,
    createdAt: idea.createdAt,
    updatedAt: idea.updatedAt,
    likesCount,
    commentsCount
  });
});

const updateSchema = z.object({
  text: z.string().min(1).optional(),
  removeImage: z.string().optional()
});

router.patch("/:id", requireAuth, uploadIdeaImage.single("image"), async (req: AuthedRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Validation error" });

  const idea = await Idea.findById(req.params.id);
  if (!idea) return res.status(404).json({ message: "Not found" });
  if (String(idea.authorId) !== req.user!.userId) return res.status(403).json({ message: "Forbidden" });

  if (parsed.data.text) idea.text = parsed.data.text;

  const remove = parsed.data.removeImage === "true";
  if (remove) idea.imageUrl = undefined;

  if (req.file) {
    const filename = path.basename(req.file.path);
    idea.imageUrl = buildPublicUploadUrl("ideas", filename);
  }

  await idea.save();
  res.json({ id: String(idea._id) });
});

router.delete("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const idea = await Idea.findById(req.params.id);
  if (!idea) return res.status(404).json({ message: "Not found" });
  if (String(idea.authorId) !== req.user!.userId) return res.status(403).json({ message: "Forbidden" });

  await Like.deleteMany({ ideaId: idea._id });
  await Comment.deleteMany({ ideaId: idea._id });
  await idea.deleteOne();

  res.status(204).send();
});

export default router;
