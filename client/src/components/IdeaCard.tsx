// import React from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "./Avatar";
import { Button } from "./Button";
import type { IdeaFeedItem } from "../types";
import { useAuth } from "../lib/auth";

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
  const { user } = useAuth();

  const short = idea.text.length > 220 ? idea.text.slice(0, 220) + "..." : idea.text;

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }} onClick={() => nav(`/profile/${author.id}`)}>
          <Avatar url={author.avatarUrl} size={42} />
          <div>
            <div style={{ fontWeight: 900 }}>{author.username}</div>
            <div style={{ fontSize: 12, color: "rgba(0,0,0,0.6)" }}>{new Date(idea.createdAt).toLocaleString()}</div>
          </div>
        </div>

        {canEdit && (
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="secondary" onClick={onEdit}>Edit</Button>
            <Button variant="danger" onClick={onDelete}>Delete</Button>
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

      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 14, color: "rgba(0,0,0,0.7)", fontWeight: 800 }}>
          <div>Likes: {idea.likesCount}</div>
          <div>Comments: {idea.commentsCount}</div>
        </div>
        <Button variant="primary" onClick={() => nav(`/ideas/${idea.id}`)}>View</Button>
      </div>
    </div>
  );
}
