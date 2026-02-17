import React, { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

declare global {
  interface Window {
    google?: any;
  }
}

export function GoogleLoginButton() {
  const { setSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const inited = useRef(false);
  const btnRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (inited.current) return;
    inited.current = true;

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    console.log("VITE_GOOGLE_CLIENT_ID =", clientId);

    if (!clientId) {
      console.error("Missing VITE_GOOGLE_CLIENT_ID in client env");
      return;
    }

    // Helper שמחכה רגע אם הסקריפט נטען מאוחר
    const tryInit = (attempt = 0) => {
      if (!window.google?.accounts?.id) {
        if (attempt < 20) {
          // עד ~2 שניות המתנה
          setTimeout(() => tryInit(attempt + 1), 100);
        } else {
          console.error("Google Identity script not loaded (timeout)");
        }
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        // FedCM יותר יציב בכרום חדש
        use_fedcm_for_prompt: true,
        callback: async (resp: any) => {
          console.log("Google callback fired", resp);

          try {
            setLoading(true);

            const idToken = resp?.credential;
            if (!idToken) {
              console.error("No credential returned from Google", resp);
              alert("Google login failed (no credential)");
              return;
            }

            const r = await api.post("/auth/google", { idToken });
            setSession(r.data.accessToken, r.data.user);

            window.location.href = "/feed";
          } catch (e: any) {
            console.error(
              "Google login failed:",
              e?.response?.status,
              e?.response?.data || e
            );
            alert("Google login failed");
          } finally {
            setLoading(false);
          }
        },
      });

      // ✅ זה הכפתור שעושה את ה-flow היציב (לא prompt)
      if (btnRef.current) {
        // לנקות אם כבר נרנדר קודם
        btnRef.current.innerHTML = "";

        window.google.accounts.id.renderButton(btnRef.current, {
          theme: "outline",
          size: "large",
          width: 320,
          text: "continue_with",
          shape: "pill",
        });
      }
    };

    tryInit();

    return () => {
      try {
        window.google?.accounts?.id?.cancel();
      } catch {}
    };
  }, [setSession]);

  // ✅ אין onClick ואין prompt — הכפתור של Google מטפל בהכל
  return (
    <div style={{ opacity: loading ? 0.7 : 1, pointerEvents: loading ? "none" : "auto" }}>
      <div ref={btnRef} />
    </div>
  );
}