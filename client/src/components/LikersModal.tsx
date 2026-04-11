import { useEffect, useState } from "react";
import { api } from "../lib/api";
import Avatar from "./Avatar";
import { LoadingState, EmptyState } from "./State";

type Liker = {
  id: string;
  username: string;
  avatarUrl?: string;
};

export default function LikersModal({
  open,
  ideaId,
  onClose
}: {
  open: boolean;
  ideaId: string;
  onClose: () => void;
}) {
  const [items, setItems] = useState<Liker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get(`/ideas/${ideaId}/likes`);
        setItems(Array.isArray(response.data?.items) ? response.data.items : []);
      } catch {
        setError("Failed to load likes");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, ideaId]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.2)",
        zIndex: 70,
        display: "grid",
        placeItems: "center",
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(420px, 100%)",
          maxHeight: "min(70vh, 560px)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          overflow: "auto"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Likes</div>
          <button className="btn btn-ghost" onClick={onClose} style={{ minWidth: 0, boxShadow: "none" }}>
            Close
          </button>
        </div>

        {loading && <LoadingState text="Loading likes..." />}
        {!loading && error && <div style={{ color: "var(--danger)", fontWeight: 800 }}>{error}</div>}
        {!loading && !error && items.length === 0 && <EmptyState title="No likes yet" />}

        {!loading && !error && items.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0",
                  borderBottom: "1px solid rgba(0,0,0,0.06)"
                }}
              >
                <Avatar url={item.avatarUrl} size={36} />
                <div style={{ fontWeight: 800 }}>{item.username}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
