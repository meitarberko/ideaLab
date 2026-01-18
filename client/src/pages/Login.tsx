import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Button } from "../components/Button";
import { GoogleLoginButton } from "../components/GoogleLoginButton";
import Input from "../components/Input";
import LabIcon from "../images/LabIcon.png";

export default function Login() {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setUsername("");
    setPassword("");
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!username.trim() || !password) {
      setErr("Username and password are required");
      return;
    }
    if (loading) return;
    setLoading(true);
    try {
      const r = await api.post("/auth/login", { username, password });
      setSession(r.data.accessToken, r.data.user);
      navigate("/feed");
    } catch {
      setErr("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <img src={LabIcon} style={{ height: 100 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>IdeaLab</div>
            <div style={{ fontSize: 13, color: "rgba(0,0,0,0.6)" }}>A laboratory for early stage ideas.</div>
          </div>
        </div>

        <form onSubmit={submit} style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div className="label">Username</div>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>

          <div>
            <div className="label">Password</div>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          {err && <div style={{ color: "var(--danger)", fontWeight: 700 }}>{err}</div>}

          <Button loading={loading} disabled={!username.trim() || !password} type="submit">
            Login
          </Button>

          <GoogleLoginButton />

          <a href="/register" style={{ marginTop: 6 }}>
            Create account
          </a>
        </form>
      </div>
    </div>
  );
}
