import { Router, Request, Response } from "express";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { Idea } from "../models/Idea";
import { Like } from "../models/Like";
import { Comment } from "../models/Comment";
import { makeUploader, buildPublicUploadUrl } from "../lib/uploads";
import { z } from "zod";
import path from "path";
import { requireFile } from "../middleware/requireFile";
import { validateBody, validateParams } from "../middleware/validate";
import { createIdeaBodySchema, ideaIdParamsSchema } from "../schemas/ideasSchemas";
import analyzeRouter from "./analyze";
import likesRouter from "./likes";
import commentsRouter from "./comments";

const router = Router();
const uploadIdeaImage = makeUploader("ideas");

function requireText(req: any, res: any, next: any) {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) return res.status(400).json({ message: "text is required" });
  next();
}
router.use("/:id/analyze", analyzeRouter);
router.use("/:id/likes", likesRouter);
router.use("/:id/comments", commentsRouter);

/**
 * @openapi
 * /api/ideas:
 *   post:
 *     summary: Create idea
 *     description: Create a new idea
 *     tags:
 *       - Ideas
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *                 example: "This is my idea"
 *               image:
 *                 type: string
 *                 format: binary
 *           example:
 *             text: "This is my idea"
 *             image: "<binary>"
 *     responses:
 *       201:
 *         description: Idea created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/IdeaCreateResponse"
 *             example:
 *               id: "64f1c2b5e4b0f1a2b3c4d5e6"
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/",
  requireAuth,
  uploadIdeaImage.single("image"),
  requireText,
  validateBody(createIdeaBodySchema),
  async (req: Request, res: Response) => {
    const authed = req as AuthedRequest;
    const { text } = (req as any).validatedBody;

    let imageUrl: string | undefined;

    if ((req as any).file) {
      const filename = path.basename((req as any).file.path);
      imageUrl = buildPublicUploadUrl("ideas", filename);
    }

    const idea = await Idea.create({
      authorId: authed.user!.userId,
      text,
      imageUrl
    });

    res.status(201).json({ id: String(idea._id) });
  }
);

/**
 * @openapi
 * /api/ideas:
 *   get:
 *     summary: Get ideas feed (cursor paging)
 *     tags:
 *       - Ideas
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Feed items
 */
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

  const userId = (req as any).user?.id;
  let likedSet = new Set<string>();

  if (userId) {
    const ids = items.map((d: any) => String(d._id));
    const likes = await Like.find({ userId, ideaId: { $in: ids } }).select("ideaId").lean();
    likedSet = new Set(likes.map((l: any) => String(l.ideaId)));
  }

  res.json({
    items: items.map((i: any) => ({
      id: String(i._id),
      authorId: String(i.authorId),
      text: i.text,
      imageUrl: i.imageUrl,
      createdAt: i.createdAt,
      likesCount: likesMap.get(String(i._id)) || 0,
      commentsCount: commentsMap.get(String(i._id)) || 0,
      likedByMe: userId ? likedSet.has(String(i._id)) : false
    })),
    nextCursor
  });
});

/**
 * @openapi
 * /api/ideas/mine:
 *   get:
 *     summary: Get my ideas (cursor paging)
 *     description: Get ideas created by the current user
 *     tags:
 *       - Ideas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User ideas
 *       401:
 *         description: Unauthorized
 */
router.get("/mine", requireAuth, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  const limit = Math.min(Number(req.query.limit || 10), 30);
  const cursor = req.query.cursor ? new Date(String(req.query.cursor)) : null;

  const query: any = { authorId: authed.user!.userId };
  if (cursor) query.createdAt = { $lt: cursor };

  const ideas = await Idea.find(query).sort({ createdAt: -1 }).limit(limit + 1).lean();
  const items = ideas.slice(0, limit);
  const nextCursor = ideas.length > limit ? items[items.length - 1].createdAt.toISOString() : null;

  res.json({
    items: items.map((i: any) => ({
      id: String(i._id),
      authorId: String(i.authorId),
      text: i.text,
      imageUrl: i.imageUrl,
      createdAt: i.createdAt
    })),
    nextCursor
  });
});

/**
 * @openapi
 * /api/ideas/{id}:
 *   get:
 *     summary: Get idea by id
 *     tags:
 *       - Ideas
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Idea
 *       404:
 *         description: Not found
 */
router.get("/:id", validateParams(ideaIdParamsSchema), async (req, res) => {
  const idea = await Idea.findById(req.params.id).lean();
  if (!idea) return res.status(404).json({ message: "id doesnt exist" });

  const likesCount = await Like.countDocuments({ ideaId: idea._id });
  const commentsCount = await Comment.countDocuments({ ideaId: idea._id });

  let likedByMe = false;
  if ((req as any).user?.id) {
    const exists = await Like.findOne({ ideaId: idea._id, userId: (req as any).user.id }).lean();
    likedByMe = !!exists;
  }

  res.json({
    id: String(idea._id),
    authorId: String(idea.authorId),
    text: idea.text,
    imageUrl: idea.imageUrl,
    createdAt: idea.createdAt,
    updatedAt: idea.updatedAt,
    likesCount,
    commentsCount,
    likedByMe
  });
});

const updateSchema = z.object({
  text: z.string().min(1).optional(),
  removeImage: z.string().optional()
});

/**
 * @openapi
 * /api/ideas/{id}:
 *   patch:
 *     summary: Update idea
 *     description: Update an existing idea
 *     tags:
 *       - Ideas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 example: "Updated idea text"
 *               image:
 *                 type: string
 *                 format: binary
 *               removeImage:
 *                 type: string
 *                 example: "true"
 *           examples:
 *             updateText:
 *               summary: Update text
 *               value:
 *                 text: "Updated idea text"
 *             removeImage:
 *               summary: Remove image
 *               value:
 *                 removeImage: "true"
 *     responses:
 *       200:
 *         description: Idea updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/IdeaCreateResponse"
 *             example:
 *               id: "64f1c2b5e4b0f1a2b3c4d5e6"
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.patch(
  "/:id",
  validateParams(ideaIdParamsSchema),
  requireAuth,
  uploadIdeaImage.single("image"),
  async (req: Request, res: Response) => {
    const authed = req as AuthedRequest;
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation error" });

    const idea = await Idea.findById(req.params.id);
    if (!idea) return res.status(404).json({ message: "Not found" });
    if (String(idea.authorId) !== authed.user!.userId) return res.status(403).json({ message: "Forbidden" });

    if (parsed.data.text) idea.text = parsed.data.text;

    const remove = parsed.data.removeImage === "true";
    if (remove) idea.imageUrl = undefined;

    if ((req as any).file) {
      const filename = path.basename((req as any).file.path);
      idea.imageUrl = buildPublicUploadUrl("ideas", filename);
    }

    await idea.save();
    res.json({ id: String(idea._id) });
  }
);

/**
 * @openapi
 * /api/ideas/{id}:
 *   delete:
 *     summary: Delete idea
 *     tags:
 *       - Ideas
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Idea deleted
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.delete("/:id", validateParams(ideaIdParamsSchema), requireAuth, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  const idea = await Idea.findById(req.params.id);
  if (!idea) return res.status(404).json({ message: "Not found" });
  if (String(idea.authorId) !== authed.user!.userId) return res.status(403).json({ message: "Forbidden" });

  await Like.deleteMany({ ideaId: idea._id });
  await Comment.deleteMany({ ideaId: idea._id });
  await idea.deleteOne();

  res.status(204).send();
});

export default router;
