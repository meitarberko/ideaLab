import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TopBar from "../components/TopBar";
import { api, getApiErrorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import Avatar from "../components/Avatar";
import { Button } from "../components/Button";
import IdeaAnalyzerModal from "../components/IdeaAnalyzerModal";
import { LoadingState, ErrorState, EmptyState } from "../components/State";

type Idea = {
  id: string;
  authorId: string;
  text: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  commentsCount: number;
  likedByMe?: boolean;
};

type UserMini = { id: string; username: string; avatarUrl?: string };

type CommentItem = { id: string; ideaId: string; authorId: string; text: string; createdAt: string };

export default function IdeaDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();

  const [idea, setIdea] = useState<Idea | null>(null);
  const [author, setAuthor] = useState<UserMini | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [liked, setLiked] = useState(false);

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);

  const [analyzerOpen, setAnalyzerOpen] = useState(false);
  const inFlightRef = useRef(false);
  const lastIdRef = useRef<string | undefined>(undefined);

  const readIdeaPayload = (data: unknown): Idea => {
    if (!data || typeof data !== "object") {
      throw new Error("Idea response is invalid");
    }

    const ideaData = data as Partial<Idea>;
    if (
      typeof ideaData.id !== "string" ||
      typeof ideaData.authorId !== "string" ||
      typeof ideaData.text !== "string" ||
      typeof ideaData.createdAt !== "string"
    ) {
      throw new Error("Idea response is missing required fields");
    }

    return {
      id: ideaData.id,
      authorId: ideaData.authorId,
      text: ideaData.text,
      imageUrl: typeof ideaData.imageUrl === "string" ? ideaData.imageUrl : undefined,
      createdAt: ideaData.createdAt,
      updatedAt: typeof ideaData.updatedAt === "string" ? ideaData.updatedAt : ideaData.createdAt,
      likesCount: typeof ideaData.likesCount === "number" ? ideaData.likesCount : 0,
      commentsCount: typeof ideaData.commentsCount === "number" ? ideaData.commentsCount : 0,
      likedByMe: Boolean(ideaData.likedByMe)
    };
  };

  const readCommentsPayload = (data: unknown): CommentItem[] => {
    const items = Array.isArray((data as any)?.items) ? (data as any).items as CommentItem[] : null;
    if (!items) {
      throw new Error("Comments response is missing items[]");
    }
    return items;
  };

  const loadAll = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      setError(false);
      setErrorMessage("");
      setLoading(true);

      const r = await api.get(`/ideas/${id}`);
      const it = readIdeaPayload(r.data);

      setIdea(it);
      setLiked(!!it.likedByMe);

      const u = await api.get(`/users/${it.authorId}`);
      setAuthor(u.data);

      await loadComments();
    } catch (err) {
      console.error("Idea details load failed:", err);
      setError(true);
      setErrorMessage(getApiErrorMessage(err, "Failed to load idea"));
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  };

  const loadComments = async () => {
    setCommentsLoading(true);
    try {
      const r = await api.get(`/ideas/${id}/comments`, { params: { limit: 50 } });
      setComments(readCommentsPayload(r.data));
    } catch (err) {
      console.error("Comments load failed:", err);
      throw err;
    } finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    if (lastIdRef.current === id && inFlightRef.current) return;
    lastIdRef.current = id;
    loadAll();
  }, [id]);

  const canEdit = idea?.authorId === user?.id;

  const toggleLike = async () => {
    if (!idea) return;

    if (!liked) {
      await api.post(`/ideas/${idea.id}/likes`);
      setLiked(true);
      setIdea({ ...idea, likesCount: idea.likesCount + 1 });
    } else {
      await api.delete(`/ideas/${idea.id}/likes`);
      setLiked(false);
      setIdea({ ...idea, likesCount: Math.max(0, idea.likesCount - 1) });
    }
  };

  const addComment = async () => {
    if (!idea) return;
    const text = commentText.trim();
    if (!text) return;

    await api.post(`/ideas/${idea.id}/comments`, { text });
    setCommentText("");
    await loadComments();
    setIdea({ ...idea, commentsCount: idea.commentsCount + 1 });
  };

  const deleteComment = async (commentId: string) => {
    if (!idea) return;
    await api.delete(`/comments/${commentId}`);
    await loadComments();
    setIdea({ ...idea, commentsCount: Math.max(0, idea.commentsCount - 1) });
  };

  if (loading) {
    return (
      <>
        <TopBar />
        <div className="container">
          <LoadingState text="Loading idea..." />
        </div>
      </>
    );
  }

  if (error || !idea || !author) {
    return (
      <>
        <TopBar />
        <div className="container">
          <ErrorState title="Failed to load idea" subtitle={errorMessage} />
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <div className="container" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div
              style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}
              onClick={() => nav(`/profile/${author.id}`)}
            >
              <Avatar url={author.avatarUrl} size={44} />
              <div>
                <div style={{ fontWeight: 900 }}>{author.username}</div>
                <div style={{ fontSize: 12, color: "rgba(0,0,0,0.6)" }}>{new Date(idea.createdAt).toLocaleString()}</div>
              </div>
            </div>

            {canEdit && (
              <div style={{ display: "flex", gap: 8 }}>
                <Button variant="secondary" onClick={() => nav(`/ideas/${idea.id}/edit`)}>
                  Edit
                </Button>
              </div>
            )}
          </div>

          <div style={{ marginTop: 12, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{idea.text}</div>

          {idea.imageUrl && (
            <img
              src={idea.imageUrl}
              style={{ width: "100%", marginTop: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)" }}
            />
          )}

          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 14, fontWeight: 900 }}>
              <div>Likes: {idea.likesCount}</div>
              <div>Comments: {idea.commentsCount}</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Button variant={liked ? "secondary" : "primary"} onClick={toggleLike}>
                {liked ? "Unlike" : "Like"}
              </Button>
              <Button variant="primary" onClick={() => setAnalyzerOpen(true)}>
                Analyze
              </Button>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Comments</div>

          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <textarea
              className="input"
              style={{ minHeight: 90, resize: "vertical" }}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <Button disabled={!commentText.trim()} onClick={addComment}>
              Add Comment
            </Button>
          </div>

          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {commentsLoading && <LoadingState text="Loading comments..." />}
            {!commentsLoading && comments.length === 0 && <EmptyState title="No comments yet" />}

            {comments.map((c) => (
              <div key={c.id} className="card" style={{ padding: 12, background: "var(--bg)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontSize: 12, color: "rgba(0,0,0,0.6)", fontWeight: 900 }}>
                    {new Date(c.createdAt).toLocaleString()}
                  </div>
                  {c.authorId === user?.id && (
                    <button className="btn btn-danger" onClick={() => deleteComment(c.id)}>
                      Delete
                    </button>
                  )}
                </div>
                <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{c.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {idea && (
        <IdeaAnalyzerModal
          open={analyzerOpen}
          ideaId={idea.id}
          onClose={() => setAnalyzerOpen(false)}
        />
      )}
    </>
  );
}
