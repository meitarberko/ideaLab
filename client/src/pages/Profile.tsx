import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TopBar from "../components/TopBar";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import Avatar from "../components/Avatar";
import { Button } from "../components/Button";
import IdeaCard from "../components/IdeaCard";
import type { IdeaFeedItem } from "../types";
import { EmptyState, ErrorState, LoadingState } from "../components/State";

type UserMini = { id: string; username: string; email: string; avatarUrl?: string };

export default function Profile({ mode }: { mode: "me" | "user" }) {
  const nav = useNavigate();
  const params = useParams();
  const { user } = useAuth();

  const userId = mode === "me" ? user?.id : params.id;

  const [profile, setProfile] = useState<UserMini | null>(null);
  const [ideas, setIdeas] = useState<IdeaFeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadProfile = async () => {
    if (!userId) return;
    try {
      const r = await api.get(mode === "me" ? "/users/me" : `/users/${userId}`);
      setProfile(r.data);
    } catch {
      setError(true);
    }
  };

  const loadIdeas = async (kind: "init" | "more") => {
    if (!userId) return;
    try {
      if (kind === "init") setLoading(true);
      if (kind === "more") setLoadingMore(true);

      if (mode === "me") {
        const r = await api.get("/ideas/mine", { params: { limit: 10, cursor: kind === "more" ? cursor : undefined } });
        const newItems: IdeaFeedItem[] = r.data.items.map((x: any) => ({
          ...x,
          likesCount: 0,
          commentsCount: 0
        }));
        setIdeas((prev) => (kind === "init" ? newItems : [...prev, ...newItems]));
        setCursor(r.data.nextCursor);
      } else {
        const r = await api.get("/ideas", { params: { limit: 10, cursor: kind === "more" ? cursor : undefined } });
        const all: IdeaFeedItem[] = r.data.items;
        const mine = all.filter((x) => x.authorId === userId);
        setIdeas((prev) => (kind === "init" ? mine : [...prev, ...mine]));
        setCursor(r.data.nextCursor);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setError(false);
    setCursor(null);
    setIdeas([]);
    loadProfile().then(() => loadIdeas("init"));
  }, [userId]);

  if (loading) {
    return (
      <>
        <TopBar />
        <div className="container"><LoadingState text="Loading profile..." /></div>
      </>
    );
  }

  if (error || !profile) {
    return (
      <>
        <TopBar />
        <div className="container"><ErrorState title="Failed to load profile" /></div>
      </>
    );
  }

  const isMe = profile.id === user?.id;

  return (
    <>
      <TopBar />
      <div className="container" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="card" style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar url={profile.avatarUrl} size={56} />
            <div>
              <div style={{ fontWeight: 900, fontSize: 20 }}>{profile.username}</div>
              <div style={{ fontSize: 12, color: "rgba(0,0,0,0.6)", fontWeight: 900 }}>{profile.email}</div>
            </div>
          </div>

          {isMe && <Button variant="secondary" onClick={() => nav("/profile/me/edit")}>Edit Profile</Button>}
        </div>

        {ideas.length === 0 && <EmptyState title="No ideas yet" />}

        {ideas.map((idea) => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            author={{ id: profile.id, username: profile.username, avatarUrl: profile.avatarUrl }}
            canEdit={isMe}
            onEdit={() => nav(`/ideas/${idea.id}/edit`)}
            onDelete={async () => {
              await api.delete(`/ideas/${idea.id}`);
              setIdeas((prev) => prev.filter((x) => x.id !== idea.id));
            }}
          />
        ))}

        {!!cursor && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button className="btn btn-secondary" disabled={loadingMore} onClick={() => loadIdeas("more")}>
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
