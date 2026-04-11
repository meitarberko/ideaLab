import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar";
import Avatar from "../components/Avatar";
import { Button } from "../components/Button";
import { api } from "../lib/api";
import { EmptyState, LoadingState } from "../components/State";

type NotificationItem = {
  id: string;
  type: "like" | "comment";
  createdAt: string;
  ideaId: string;
  ideaText: string;
  actorId: string;
  actorUsername: string;
  actorAvatarUrl?: string;
  commentText?: string;
};

export default function Notifications() {
  const nav = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = async (mode: "init" | "more") => {
    try {
      if (mode === "init") setLoading(true);
      if (mode === "more") setLoadingMore(true);
      const response = await api.get("/notifications", {
        params: { limit: 20, cursor: mode === "more" ? cursor : undefined }
      });
      const nextItems = Array.isArray(response.data?.items) ? response.data.items : [];
      setItems((prev) => (mode === "init" ? nextItems : [...prev, ...nextItems]));
      setCursor(typeof response.data?.nextCursor === "string" ? response.data.nextCursor : null);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    api.post("/notifications/read").catch(() => undefined);
    load("init");
  }, []);

  return (
    <>
      <TopBar />
      <div className="container" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 900, fontSize: 22 }}>Recent activity</div>
          <div style={{ marginTop: 6, color: "rgba(0,0,0,0.6)", fontWeight: 700 }}>
            Likes and comments on your posts
          </div>
        </div>

        {loading && <LoadingState text="Loading notifications..." />}
        {!loading && items.length === 0 && <EmptyState title="No notifications yet" />}

        {!loading &&
          items.map((item) => (
            <button
              key={item.id}
              className="card"
              onClick={() => nav(`/ideas/${item.ideaId}`)}
              style={{
                padding: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                cursor: "pointer",
                textAlign: "left"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <Avatar url={item.actorAvatarUrl} size={40} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800 }}>
                    {item.actorUsername} {item.type === "like" ? "liked your post" : "commented on your post"}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      color: "rgba(0,0,0,0.65)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {item.type === "comment" ? item.commentText : item.ideaText}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "rgba(0,0,0,0.55)", fontWeight: 700, flexShrink: 0 }}>
                {new Date(item.createdAt).toLocaleString()}
              </div>
            </button>
          ))}

        {!!cursor && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Button variant="ghost" loading={loadingMore} onClick={() => load("more")} style={{ boxShadow: "none" }}>
              Show more
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
