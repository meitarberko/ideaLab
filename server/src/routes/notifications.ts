import { Router } from "express";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { Idea } from "../models/Idea";
import { Like } from "../models/Like";
import { Comment } from "../models/Comment";
import { User } from "../models/User";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const authed = req as AuthedRequest;
  const limit = Math.min(Number(req.query.limit || 5), 20);
  const cursor = req.query.cursor ? new Date(String(req.query.cursor)) : null;
  const userId = authed.user!.userId;

  const myIdeas = await Idea.find({ authorId: userId }).select("_id text").lean();
  const ideaIds = myIdeas.map((idea) => idea._id);
  const ideasMap = new Map(myIdeas.map((idea) => [String(idea._id), idea]));

  if (ideaIds.length === 0) {
    return res.json({ items: [], nextCursor: null, unreadCount: 0 });
  }

  const createdAtFilter = cursor ? { createdAt: { $lt: cursor } } : {};

  const [likes, comments, currentUser] = await Promise.all([
    Like.find({ ideaId: { $in: ideaIds }, userId: { $ne: userId }, ...createdAtFilter })
      .sort({ createdAt: -1 })
      .limit(limit * 3)
      .lean(),
    Comment.find({ ideaId: { $in: ideaIds }, authorId: { $ne: userId }, ...createdAtFilter })
      .sort({ createdAt: -1 })
      .limit(limit * 3)
      .lean(),
    User.findById(userId).select("notificationsSeenAt").lean()
  ]);

  const actorIds = Array.from(
    new Set([
      ...likes.map((like) => String(like.userId)),
      ...comments.map((comment) => String(comment.authorId))
    ])
  );
  const actors = await User.find({ _id: { $in: actorIds } }).select("username avatarUrl").lean();
  const actorsMap = new Map(actors.map((actor) => [String(actor._id), actor]));

  const items = [
    ...likes.map((like) => ({
      id: `like:${String(like._id)}`,
      type: "like" as const,
      createdAt: like.createdAt,
      ideaId: String(like.ideaId),
      ideaText: ideasMap.get(String(like.ideaId))?.text || "",
      actorId: String(like.userId),
      actorUsername: actorsMap.get(String(like.userId))?.username || "Unknown",
      actorAvatarUrl: actorsMap.get(String(like.userId))?.avatarUrl
    })),
    ...comments.map((comment) => ({
      id: `comment:${String(comment._id)}`,
      type: "comment" as const,
      createdAt: comment.createdAt,
      ideaId: String(comment.ideaId),
      ideaText: ideasMap.get(String(comment.ideaId))?.text || "",
      actorId: String(comment.authorId),
      actorUsername: actorsMap.get(String(comment.authorId))?.username || "Unknown",
      actorAvatarUrl: actorsMap.get(String(comment.authorId))?.avatarUrl,
      commentText: comment.text
    }))
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  const nextCursor = items.length === limit ? new Date(items[items.length - 1].createdAt).toISOString() : null;
  const seenAt = currentUser?.notificationsSeenAt ? new Date(currentUser.notificationsSeenAt).getTime() : 0;
  const unreadCount = items.filter((item) => new Date(item.createdAt).getTime() > seenAt).length;

  res.json({ items, nextCursor, unreadCount });
});

router.post("/read", requireAuth, async (req, res) => {
  const authed = req as AuthedRequest;
  await User.findByIdAndUpdate(authed.user!.userId, { notificationsSeenAt: new Date() });
  res.status(204).send();
});

export default router;
