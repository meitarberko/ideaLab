import React, { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Button } from "../components/Button";
import Input from "../components/Input";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = {
  username?: string;
  email?: string;
  password?: string;
  general?: string;
};

export default function Register() {
  const { setSession } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<{ username: boolean; email: boolean; password: boolean }>({
    username: false,
    email: false,
    password: false
  });
  const [submitted, setSubmitted] = useState(false);

  const validate = (data: { username: string; email: string; password: string }) => {
    const next: Errors = {};
    if (!data.username.trim()) next.username = "Username is required";
    if (!data.email.trim()) next.email = "Email is required";
    else if (!EMAIL_REGEX.test(data.email.trim())) next.email = "Please enter a valid email";
    if (!data.password) next.password = "Password is required";
    else if (data.password.length < 5) next.password = "Password must be at least 5 characters";
    return next;
  };

  const clientErrors = validate({ username, email, password });
  const isValid = Object.keys(clientErrors).length === 0;

  const showError = (field: keyof Errors) => {
    if (!submitted && !touched[field as keyof typeof touched]) return null;
    return errors[field] || clientErrors[field];
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setErrors({});
    if (!isValid) return;
    if (loading) return;
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
      const status = e?.response?.status;
      const message = e?.response?.data?.message || "";
      const nextErrors: Errors = {};

      if (status === 409) {
        if (message.toLowerCase().includes("username")) nextErrors.username = message;
        else if (message.toLowerCase().includes("email")) nextErrors.email = message;
        else nextErrors.general = message || "Registration failed";
      } else if (status === 400 && Array.isArray(e?.response?.data?.errors)) {
        for (const err of e.response.data.errors) {
          if (err.field === "username") nextErrors.username = err.message;
          if (err.field === "email") nextErrors.email = err.message;
          if (err.field === "password") nextErrors.password = err.message;
        }
      } else {
        nextErrors.general = "Registration failed";
      }

      setErrors(nextErrors);
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
            <Input
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setErrors((prev) => ({ ...prev, username: undefined, general: prev.general }));
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, username: true }))}
            />
            {showError("username") && <div style={{ color: "var(--danger)", fontWeight: 700 }}>{showError("username")}</div>}
          </div>
          <div>
            <div className="label">Email</div>
            <Input
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((prev) => ({ ...prev, email: undefined, general: prev.general }));
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
            />
            {showError("email") && <div style={{ color: "var(--danger)", fontWeight: 700 }}>{showError("email")}</div>}
          </div>
          <div>
            <div className="label">Password (minimum 5 chars)</div>
            <Input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((prev) => ({ ...prev, password: undefined, general: prev.general }));
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
            />
            {showError("password") && <div style={{ color: "var(--danger)", fontWeight: 700 }}>{showError("password")}</div>}
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


          {errors.general && <div style={{ color: "var(--danger)", fontWeight: 700 }}>{errors.general}</div>}

          <Button loading={loading} disabled={!isValid} type="submit">Register</Button>
          <a href="/login">Back to login</a>
        </form>
      </div>
    </div>
  );
}
