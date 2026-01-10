import React, { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Button } from "../components/Button";
import Input from "../components/Input";

export default function Register() {
  const { setSession } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const r = await api.post("/auth/register", { username, email, password });
      setSession(r.data.accessToken, r.data.user);

      if (avatar) {
        const fd = new FormData();
        fd.append("avatar", avatar);
        const u = await api.patch("/users/me", fd, { headers: { "Content-Type": "multipart/form-data" } });
        setSession(r.data.accessToken, u.data);
      }
    } catch (e: any) {
      setErr("Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
        <div style={{ fontWeight: 800, fontSize: 22 }}>Create account</div>

        <form onSubmit={submit} style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div className="label">Username</div>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <div className="label">Email</div>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <div className="label">Password (minimum 5 chars)</div>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
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


          {err && <div style={{ color: "var(--danger)", fontWeight: 700 }}>{err}</div>}

          <Button loading={loading} type="submit">Register</Button>
          <a href="/login">Back to login</a>
        </form>
      </div>
    </div>
  );
}
