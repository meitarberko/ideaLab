import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import Avatar from "./Avatar";
import { Button } from "./Button";

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

export default function NotificationsMenu() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const response = await api.get("/notifications", { params: { limit: 5 } });
      setItems(Array.isArray(response.data?.items) ? response.data.items : []);
      setUnreadCount(typeof response.data?.unreadCount === "number" ? response.data.unreadCount : 0);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const toggleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      if (!loaded) await load();
      await api.post("/notifications/read");
      setUnreadCount(0);
    }
  };

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        className="btn btn-ghost"
        onClick={toggleOpen}
        style={{ minWidth: 44, padding: "10px 12px", borderRadius: 999, boxShadow: "none", position: "relative" }}
        aria-label="Notifications"
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 6,
              right: 8,
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#d32f2f",
              border: "2px solid #fff"
            }}
          />
        )}
      </button>

      {open && (
        <div
          className="card"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "min(380px, 92vw)",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            zIndex: 80,
            boxShadow: "0 18px 40px rgba(19, 27, 84, 0.12)"
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 16 }}>Notifications</div>

          {loading && <div style={{ color: "rgba(0,0,0,0.6)", fontWeight: 700 }}>Loading...</div>}
          {!loading && items.length === 0 && <div style={{ color: "rgba(0,0,0,0.6)", fontWeight: 700 }}>No notifications yet</div>}

          {!loading &&
            items.map((item) => (
              <button
                key={item.id}
                className="btn btn-ghost"
                onClick={() => {
                  setOpen(false);
                  nav(`/ideas/${item.ideaId}`);
                }}
                style={{
                  minWidth: 0,
                  width: "100%",
                  justifyContent: "flex-start",
                  padding: "10px 12px",
                  borderRadius: 16,
                  boxShadow: "none"
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <Avatar url={item.actorAvatarUrl} size={34} />
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, whiteSpace: "normal", textAlign: "left" }}>
                      {item.actorUsername} {item.type === "like" ? "liked your post" : "commented on your post"}
                    </span>
                    <span style={{ fontSize: 12, color: "rgba(0,0,0,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}>
                      {item.type === "comment" ? item.commentText : item.ideaText}
                    </span>
                  </span>
                </span>
              </button>
            ))}

          <Button
            variant="ghost"
            onClick={() => {
              setOpen(false);
              nav("/notifications");
            }}
            style={{ minWidth: 0, boxShadow: "none", border: "1px solid rgba(58, 62, 140, 0.12)" }}
          >
            Show more
          </Button>
        </div>
      )}
    </div>
  );
}
