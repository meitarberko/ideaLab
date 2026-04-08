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
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState("");

  const [analyzerOpen, setAnalyzerOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const inFlightRef = useRef(false);
  const lastIdRef = useRef<string | undefined>(undefined);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const actionButtonStyle = {
    minWidth: 0,
    padding: "9px 12px",
    borderRadius: 12,
    fontSize: 13,
    lineHeight: 1.1,
    boxShadow: "none",
    justifyContent: "flex-start"
  } as const;
  const triggerButtonStyle = {
    minWidth: 40,
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 16,
    lineHeight: 1,
    boxShadow: "none"
  } as const;
  const iconButtonStyle = {
    minWidth: 42,
    padding: "9px 12px",
    borderRadius: 999,
    fontSize: 16,
    lineHeight: 1,
    boxShadow: "none",
    border: liked ? "1px solid rgba(58, 62, 140, 0.22)" : "1px solid rgba(58, 62, 140, 0.12)",
    background: liked ? "rgba(58, 62, 140, 0.12)" : "#fff"
  } as const;
  const analyzeButtonStyle = {
    minWidth: 0,
    padding: "10px 14px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 800,
    lineHeight: 1.1,
    boxShadow: "none",
    border: "1px solid rgba(58, 62, 140, 0.14)",
    background: "#fff",
    color: "var(--secondary)"
  } as const;

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

  useEffect(() => {
    if (!actionsOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!actionsRef.current?.contains(event.target as Node)) {
        setActionsOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [actionsOpen]);

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
    if (!text || commentSubmitting) return;

    try {
      setCommentSubmitting(true);
      setCommentError("");

      const response = await api.post(`/ideas/${idea.id}/comments`, { text });
      const newCommentId = typeof response.data?.id === "string" ? response.data.id : `temp-${Date.now()}`;

      setComments((prev) => [
        {
          id: newCommentId,
          ideaId: idea.id,
          authorId: user?.id || "",
          text,
          createdAt: new Date().toISOString()
        },
        ...prev
      ]);
      setCommentText("");
      setIdea({ ...idea, commentsCount: idea.commentsCount + 1 });
    } catch (err) {
      console.error("Add comment failed:", err);
      setCommentError(getApiErrorMessage(err, "Failed to add comment"));
    } finally {
      setCommentSubmitting(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!idea) return;
    await api.delete(`/comments/${commentId}`);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setIdea({ ...idea, commentsCount: Math.max(0, idea.commentsCount - 1) });
  };

  const deleteIdea = async () => {
    if (!idea) return;
    await api.delete(`/ideas/${idea.id}`);
    nav("/feed");
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
              style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer", minWidth: 0, flex: "1 1 auto" }}
              onClick={() => nav(`/profile/${author.id}`)}
            >
              <Avatar url={author.avatarUrl} size={44} />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 900,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                  title={author.username}
                >
                  {author.username}
                </div>
                <div style={{ fontSize: 12, color: "rgba(0,0,0,0.6)" }}>{new Date(idea.createdAt).toLocaleString()}</div>
              </div>
            </div>

            {canEdit && (
              <div ref={actionsRef} style={{ position: "relative" }}>
                <Button
                  variant="ghost"
                  onClick={() => setActionsOpen((open) => !open)}
                  style={triggerButtonStyle}
                  aria-label="More actions"
                  title="More actions"
                >
                  ...
                </Button>
                {actionsOpen && (
                  <div
                    className="card"
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      minWidth: 140,
                      padding: 8,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      zIndex: 20,
                      boxShadow: "0 14px 32px rgba(19, 27, 84, 0.12)"
                    }}
                  >
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setActionsOpen(false);
                        nav(`/ideas/${idea.id}/edit`);
                      }}
                      style={{ ...actionButtonStyle, color: "var(--secondary)" }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        setActionsOpen(false);
                        await deleteIdea();
                      }}
                      style={{
                        ...actionButtonStyle,
                        background: "#fff",
                        color: "var(--danger)",
                        border: "1px solid rgba(211,47,47,0.18)"
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                )}
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

          <div
            style={{
              marginTop: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap"
            }}
          >
            <div style={{ display: "flex", gap: 14, fontWeight: 900 }}>
              <div>Likes: {idea.likesCount}</div>
              <div>Comments: {idea.commentsCount}</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Button
                variant="ghost"
                onClick={toggleLike}
                style={iconButtonStyle}
                title={liked ? "Unlike" : "Like"}
                aria-label={liked ? "Unlike" : "Like"}
              >
                👍
              </Button>
              <Button variant="ghost" onClick={() => setAnalyzerOpen(true)} style={analyzeButtonStyle}>
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
            {commentError && <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 700 }}>{commentError}</div>}
            <Button
              variant="ghost"
              disabled={!commentText.trim()}
              loading={commentSubmitting}
              onClick={addComment}
              style={{
                minWidth: 0,
                padding: "12px 18px",
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 700,
                lineHeight: 1.1,
                boxShadow: "none",
                border: "1px solid rgba(58, 62, 140, 0.14)",
                background: "#fff",
                color: "var(--secondary)"
              }}
            >
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
                    <button
                      className="btn btn-ghost"
                      onClick={() => deleteComment(c.id)}
                      style={{
                        minWidth: 0,
                        padding: "8px 14px",
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: 700,
                        lineHeight: 1.1,
                        boxShadow: "none",
                        background: "#fff",
                        color: "var(--danger)",
                        border: "1px solid rgba(211,47,47,0.18)"
                      }}
                    >
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
