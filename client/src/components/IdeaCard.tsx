import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "./Avatar";
import { Button } from "./Button";
import type { IdeaFeedItem } from "../types";
import { api } from "../lib/api";

export default function IdeaCard({
  idea,
  author,
  canEdit,
  onEdit,
  onDelete
}: {
  idea: IdeaFeedItem;
  author: { id: string; username: string; avatarUrl?: string };
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const nav = useNavigate();
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const [liked, setLiked] = useState(Boolean(idea.likedByMe));
  const [likesCount, setLikesCount] = useState(idea.likesCount);
  const [likeLoading, setLikeLoading] = useState(false);

  const short = idea.text.length > 220 ? idea.text.slice(0, 220) + "..." : idea.text;

  useEffect(() => {
    setLiked(Boolean(idea.likedByMe));
    setLikesCount(idea.likesCount);
  }, [idea.id, idea.likedByMe, idea.likesCount]);

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

  const triggerButtonStyle = {
    minWidth: 40,
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 16,
    lineHeight: 1,
    boxShadow: "none"
  } as const;
  const menuButtonStyle = {
    minWidth: 0,
    padding: "9px 12px",
    borderRadius: 12,
    fontSize: 13,
    lineHeight: 1.1,
    boxShadow: "none",
    justifyContent: "flex-start"
  } as const;
  const viewButtonStyle = {
    minWidth: 0,
    padding: "10px 18px",
    borderRadius: 999,
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.1,
    boxShadow: "none",
    border: "1px solid rgba(58, 62, 140, 0.14)",
    background: "#fff",
    color: "var(--secondary)"
  } as const;
  const statButtonStyle = {
    minWidth: 0,
    padding: "9px 14px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1.1,
    boxShadow: "none",
    border: "1px solid rgba(58, 62, 140, 0.12)",
    background: "#fff",
    color: "var(--secondary)"
  } as const;

  const toggleLike = async () => {
    if (likeLoading) return;

    try {
      setLikeLoading(true);
      if (!liked) {
        await api.post(`/ideas/${idea.id}/likes`);
        setLiked(true);
        setLikesCount((count) => count + 1);
      } else {
        await api.delete(`/ideas/${idea.id}/likes`);
        setLiked(false);
        setLikesCount((count) => Math.max(0, count - 1));
      }
    } finally {
      setLikeLoading(false);
    }
  };

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div
          style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer", minWidth: 0, flex: "1 1 auto" }}
          onClick={() => nav(`/profile/${author.id}`)}
        >
          <Avatar url={author.avatarUrl} size={42} />
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
                    onEdit();
                  }}
                  style={{ ...menuButtonStyle, color: "var(--secondary)" }}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    setActionsOpen(false);
                    await Promise.resolve(onDelete());
                  }}
                  style={{
                    ...menuButtonStyle,
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

      <div style={{ marginTop: 12, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{short}</div>

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
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button
            variant="ghost"
            onClick={toggleLike}
            loading={likeLoading}
            style={{
              ...statButtonStyle,
              border: liked ? "1px solid rgba(58, 62, 140, 0.22)" : statButtonStyle.border,
              background: liked ? "rgba(58, 62, 140, 0.12)" : "#fff"
            }}
            title={liked ? "Unlike" : "Like"}
            aria-label={liked ? "Unlike" : "Like"}
          >
            👍 {likesCount ?? 0}
          </Button>
          <Button
            variant="ghost"
            onClick={() => nav(`/ideas/${idea.id}`)}
            style={statButtonStyle}
            title="Open comments"
            aria-label="Open comments"
          >
            Comments {idea.commentsCount ?? 0}
          </Button>
        </div>
        <Button variant="ghost" onClick={() => nav(`/ideas/${idea.id}`)} style={viewButtonStyle}>
          View
        </Button>
      </div>
    </div>
  );
}
