import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TopBar from "../components/TopBar";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import Avatar from "../components/Avatar";
import { Button } from "../components/Button";
import Modal from "../components/Modal";
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

type Analysis = {
  ideaDevelopment: string;
  competitors: string[];
  risks: string[];
  opportunities: string[];
  improvements: string[];
  searchDirections: string[];
  createdAt: string;
};

export default function IdeaDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();

  const [idea, setIdea] = useState<Idea | null>(null);
  const [author, setAuthor] = useState<UserMini | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [liked, setLiked] = useState(false);

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);

  const [analyzerOpen, setAnalyzerOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      setError(false);
      setLoading(true);

      const r = await api.get(`/ideas/${id}`);
      const it: Idea = r.data;

      setIdea(it);
      setLiked(!!it.likedByMe);

      const u = await api.get(`/users/${it.authorId}`);
      setAuthor(u.data);

      await loadComments();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    setCommentsLoading(true);
    try {
      const r = await api.get(`/ideas/${id}/comments`, { params: { limit: 50 } });
      setComments(r.data.items);
    } finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
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

  const runAnalyze = async () => {
    if (!idea) return;
    setAnalysisError(null);
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const r = await api.post(`/ideas/${idea.id}/analyze`, { question: question.trim() || undefined });
      setAnalysis(r.data);
    } catch {
      setAnalysisError("Analyzer failed. Try again later.");
    } finally {
      setAnalyzing(false);
    }
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
          <ErrorState title="Failed to load idea" />
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
                IdeaLab Analyzer
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

      <Modal open={analyzerOpen} title="IdeaLab Analyzer" onClose={() => setAnalyzerOpen(false)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontWeight: 900 }}>Free question (optional)</div>
          <textarea
            className="input"
            style={{ minHeight: 90, resize: "vertical" }}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />

          {analysisError && <div style={{ fontWeight: 900, color: "var(--danger)" }}>{analysisError}</div>}

          <Button loading={analyzing} onClick={runAnalyze}>
            Analyze
          </Button>

          {analysis && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 12, color: "rgba(0,0,0,0.6)", fontWeight: 900 }}>
                Analyzed at: {new Date(analysis.createdAt).toLocaleString()}
              </div>

              <div className="card" style={{ padding: 12, background: "var(--bg)" }}>
                <div style={{ fontWeight: 900 }}>Idea development</div>
                <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{analysis.ideaDevelopment}</div>
              </div>

              <Section title="Competitors" items={analysis.competitors} />
              <Section title="Risks" items={analysis.risks} />
              <Section title="Opportunities" items={analysis.opportunities} />
              <Section title="Improvements" items={analysis.improvements} />
              <Section title="Search directions" items={analysis.searchDirections} />
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="card" style={{ padding: 12, background: "var(--bg)" }}>
      <div style={{ fontWeight: 900 }}>{title}</div>
      <ul style={{ margin: "8px 0 0 18px" }}>
        {items.map((x, i) => (
          <li key={i} style={{ marginBottom: 6 }}>
            {x}
          </li>
        ))}
      </ul>
    </div>
  );
}
