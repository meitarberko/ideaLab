import React, { useEffect, useRef, useState } from "react";
import TopBar from "../components/TopBar";
import { Button } from "../components/Button";
import Input from "../components/Input";
import Avatar from "../components/Avatar";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useNavigate } from "react-router-dom";
import { LoadingState, ErrorState } from "../components/State";

export default function EditProfile() {
  const nav = useNavigate();
  const { user, setSession, accessToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    const boot = async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const r = await api.get("/users/me");
        setUsername(r.data.username);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
        inFlightRef.current = false;
      }
    };
    boot();
  }, []);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const fd = new FormData();
      if (username.trim()) fd.append("username", username.trim());
      if (avatar) fd.append("avatar", avatar);

      const r = await api.patch("/users/me", fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (accessToken) setSession(accessToken, r.data);
      nav("/profile/me");
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
        <div className="container"><ErrorState title="Failed to load profile" /></div>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <div className="container">
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 900, fontSize: 20 }}>Edit Profile</div>

          <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
            <Avatar url={user?.avatarUrl} size={56} />
            <div style={{ fontWeight: 900 }}>{user?.email}</div>
          </div>

          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div className="label">Username</div>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>

            <div>
              <div className="label">Avatar (optional)</div>
              <input
                id="avatar"
                type="file"
                accept="image/*"
                className="file-hidden"
                onChange={(e) => setAvatar(e.target.files?.[0] || null)}
              />

              <div className="file-row">
                <label htmlFor="avatar" className="btn btn-secondary">
                  Choose file
                </label>

                <div className="file-name">
                  {avatar ? avatar.name : "No file chosen"}
                </div>

                {avatar && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setAvatar(null)}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <Button loading={saving} disabled={!username.trim()} onClick={save}>Save</Button>
              <Button variant="secondary" onClick={() => nav("/profile/me")}>Cancel</Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
