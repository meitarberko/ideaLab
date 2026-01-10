import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { IdeaCard } from "../components/IdeaCard";

type FeedItem = {
  id: string;
  authorId: string;
  text: string;
  imageUrl?: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
};

type FeedResponse = {
  items: FeedItem[];
  nextCursor: string | null;
};

export default function HomeFeed() {
  const navigate = useNavigate();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const limit = useMemo(() => 10, []);

  async function loadFirst() {
    setLoading(true);
    setError("");
    const res = await apiFetch<FeedResponse>(`/ideas?limit=${limit}`);
    setLoading(false);

    if (!res.ok) return setError(res.error?.message || "Failed to load feed");
    setItems(res.data!.items);
    setNextCursor(res.data!.nextCursor);
  }

  async function loadMore() {
    if (!nextCursor || loading) return;
    setLoading(true);
    setError("");
    const res = await apiFetch<FeedResponse>(`/ideas?limit=${limit}&cursor=${encodeURIComponent(nextCursor)}`);
    setLoading(false);

    if (!res.ok) return setError(res.error?.message || "Failed to load more");
    setItems((prev) => [...prev, ...res.data!.items]);
    setNextCursor(res.data!.nextCursor);
  }

  useEffect(() => {
    loadFirst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Feed</h2>
        <button onClick={() => navigate("/ideas/new")}>Create Idea</button>
      </div>

      {error ? <div style={{ marginTop: 12, color: "crimson" }}>{error}</div> : null}

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((i) => (
          <IdeaCard
            key={i.id}
            id={i.id}
            text={i.text}
            imageUrl={i.imageUrl}
            createdAt={i.createdAt}
            likesCount={i.likesCount}
            commentsCount={i.commentsCount}
            onEdit={(id) => navigate(`/ideas/${id}/edit`)}
          />
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        {nextCursor ? (
          <button onClick={loadMore} disabled={loading}>
            {loading ? "Loading..." : "Load more"}
          </button>
        ) : (
          <div style={{ opacity: 0.7 }}>No more items</div>
        )}
      </div>
    </div>
  );
}
