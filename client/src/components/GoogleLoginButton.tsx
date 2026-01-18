import React, { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Button } from "./Button";

declare global {
  interface Window {
    google?: any;
  }
}

export function GoogleLoginButton() {
  const { setSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const inited = useRef(false);

  useEffect(() => {
    if (inited.current) return;
    inited.current = true;

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error("Missing VITE_GOOGLE_CLIENT_ID in client env");
      return;
    }

    if (!window.google?.accounts?.id) {
      console.error("Google Identity script not loaded");
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (resp: any) => {
        try {
          setLoading(true);
          const idToken = resp.credential; // Google ID token JWT
          const r = await api.post("/auth/google", { idToken });
          setSession(r.data.accessToken, r.data.user);
          window.location.href = "/feed";
        } catch (e) {
          console.error(e);
          alert("Google login failed");
        } finally {
          setLoading(false);
        }
      }
    });
  }, [setSession]);

  const onClick = () => {
    if (!window.google?.accounts?.id) {
      alert("Google script not loaded");
      return;
    }
    // opens the Google prompt/popup
    window.google.accounts.id.prompt();
  };

  return (
    <Button type="button" variant="secondary" loading={loading} onClick={onClick}>
      Continue with Google
    </Button>
  );
}
