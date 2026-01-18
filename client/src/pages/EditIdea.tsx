import React, { useEffect, useRef, useState } from "react";
import TopBar from "../components/TopBar";
import {Button } from "../components/Button";
import Input from "../components/Input";
import { api } from "../lib/api";
import { useNavigate, useParams } from "react-router-dom";
import { LoadingState, ErrorState } from "../components/State";

export default function EditIdea() {
  const nav = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const [text, setText] = useState("");
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(undefined);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const inFlightRef = useRef(false);
  const lastIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    if (lastIdRef.current === id && inFlightRef.current) return;
    lastIdRef.current = id;
    const load = async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const r = await api.get(`/ideas/${id}`);
        setText(r.data.text);
        setCurrentImageUrl(r.data.imageUrl);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
        inFlightRef.current = false;
      }
    };
    load();
  }, [id]);

  const save = async () => {
    if (!id) return;
    if (saving) return;
    setSaving(true);
    try {
      const fd = new FormData();
      if (text.trim()) fd.append("text", text.trim());
      if (removeImage) fd.append("removeImage", "true");
      if (newImage) fd.append("image", newImage);

      await api.patch(`/ideas/${id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      nav(`/ideas/${id}`);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <TopBar />
        <div className="container"><LoadingState text="Loading..." /></div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <TopBar />
        <div className="container"><ErrorState title="Failed to load idea" /></div>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <div className="container">
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 900, fontSize: 20 }}>Edit Idea</div>

          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div className="label">Idea text</div>
              <textarea
                className="input"
                style={{ minHeight: 140, resize: "vertical" }}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>

            {currentImageUrl && !removeImage && (
              <img src={currentImageUrl} style={{ width: "100%", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)" }} />
            )}

            <div>
              <div className="label">Replace image (optional)</div>
              <Input type="file" accept="image/*" onChange={(e) => setNewImage(e.target.files?.[0] || null)} />
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="checkbox" checked={removeImage} onChange={(e) => setRemoveImage(e.target.checked)} />
              <div style={{ fontWeight: 800 }}>Remove current image</div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <Button loading={saving} disabled={!text.trim()} onClick={save}>Save</Button>
              <Button variant="secondary" onClick={() => nav(`/ideas/${id}`)}>Cancel</Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
