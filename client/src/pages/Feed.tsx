import React, { useCallback, useEffect, useState } from "react";
import TopBar from "../components/TopBar";
import { api } from "../lib/api";
import type { IdeaFeedItem } from "../types";
import IdeaCard from "../components/IdeaCard";
import { EmptyState, ErrorState, LoadingState } from "../components/State";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

type UserMini = { id: string; username: string; avatarUrl?: string };

export default function Feed() {
  const nav = useNavigate();
  const { user } = useAuth();

  const [items, setItems] = useState<IdeaFeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const [users, setUsers] = useState<Record<string, UserMini>>({});

  const [autoLoad, setAutoLoad] = useState(true);

  const load = useCallback(
    async (mode: "init" | "more") => {
      try {
        setError(false);
        if (mode === "init") setLoading(true);
        if (mode === "more") setLoadingMore(true);

        const r = await api.get("/ideas", {
          params: { limit: 10, cursor: mode === "more" ? cursor : undefined }
        });

        const newItems: IdeaFeedItem[] = r.data.items;
        const nextCursor: string | null = r.data.nextCursor;

        const authorIds = Array.from(new Set(newItems.map((i) => i.authorId)));
        const missing = authorIds.filter((id) => !users[id]);

        const fetched: Record<string, UserMini> = {};
        for (const id of missing) {
          const u = await api.get(`/users/${id}`);
          fetched[id] = u.data;
        }

        setUsers((prev) => ({ ...prev, ...fetched }));
        setItems((prev) => (mode === "init" ? newItems : [...prev, ...newItems]));
        setCursor(nextCursor);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [cursor, users]
  );

  useEffect(() => {
    load("init");
  }, [load]);

  useEffect(() => {
    if (!autoLoad) return;

    const el = document.getElementById("feed-sentinel");
    if (!el) return;

    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && cursor && !loadingMore) {
        load("more");
      }
    });

    obs.observe(el);
    return () => obs.disconnect();
  }, [cursor, loadingMore, autoLoad, load]);

  const canMore = !!cursor;

  const deleteIdea = async (id: string) => {
    await api.delete(`/ideas/${id}`);
    setItems((prev) => prev.filter((x) => x.id !== id));
  };

  if (loading) {
    return (
      <>
        <TopBar />
        <div className="container">
          <LoadingState text="Loading feed..." />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <TopBar />
        <div className="container">
          <ErrorState title="Failed to load feed" />
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <div className="container" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {items.length === 0 && <EmptyState title="No ideas yet" subtitle="Create the first idea from 'New Idea'." />}

        {items.map((idea) => {
          const author = users[idea.authorId] || { id: idea.authorId, username: "Loading..." };
          const canEdit = author.id === user?.id;

          return (
            <IdeaCard
              key={idea.id}
              idea={idea}
              author={author}
              canEdit={canEdit}
              onEdit={() => nav(`/ideas/${idea.id}/edit`)}
              onDelete={() => deleteIdea(idea.id)}
            />
          );
        })}

        {canMore && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button className="btn btn-secondary" disabled={loadingMore} onClick={() => load("more")}>
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        )}

        <div id="feed-sentinel" style={{ height: 1 }} />
      </div>
    </>
  );
}
