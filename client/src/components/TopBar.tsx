// import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import Avatar from "./Avatar";
import { useAuth } from "../lib/auth";
import LabIcon from "../images/LabIcon.png";
import NotificationsMenu from "./NotificationsMenu";

export default function TopBar() {
  const nav = useNavigate();
  const { user, clearSession } = useAuth();
  const displayName = user?.username || "";
  const topButtonStyle = {
    minWidth: 0,
    padding: "10px 18px",
    borderRadius: 999,
    boxShadow: "none"
  } as const;

  const logout = async () => {
    await clearSession();
    nav("/login");
  };

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.86)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(43,52,127,0.08)",
        boxShadow: "0 10px 30px rgba(19, 27, 84, 0.05)"
      }}
    >
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", flexShrink: 0 }} onClick={() => nav("/feed")}>
          <img src={LabIcon} style={{ height: 30 }} />
          <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: -0.4 }}>IdeaLab</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <Button variant="secondary" onClick={() => nav("/ideas/new")} style={topButtonStyle}>New Idea</Button>
          <NotificationsMenu />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              minWidth: 0,
              padding: "6px 10px 6px 6px",
              borderRadius: 999,
              background: "rgba(43,52,127,0.04)"
            }}
            onClick={() => nav("/profile/me")}
          >
            <Avatar url={user?.avatarUrl} size={36} />
            <div
              style={{
                fontWeight: 800,
                maxWidth: 120,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
              title={displayName}
            >
              {displayName}
            </div>
          </div>
          <Button variant="ghost" onClick={logout} style={{ ...topButtonStyle, color: "var(--secondary)" }}>Logout</Button>
        </div>
      </div>
    </div>
  );
}
