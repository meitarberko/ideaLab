// import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import Avatar from "./Avatar";
import { useAuth } from "../lib/auth";
import LabIcon from "../images/LabIcon.png";

export default function TopBar() {
  const nav = useNavigate();
  const { user, clearSession } = useAuth();
  const displayName = user?.username?.trim() || "Profile";

  const logout = async () => {
    await clearSession();
    nav("/login");
  };

  return (
    <div style={{ background: "var(--card)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "nowrap",
          overflow: "hidden"
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flex: "0 0 auto", minWidth: 0 }}
          onClick={() => nav("/feed")}
        >
          <img src={LabIcon} style={{ height: 36, flexShrink: 0 }} />
          <div style={{ fontWeight: 900, whiteSpace: "nowrap" }}>IdeaLab</div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", flex: "1 1 auto", minWidth: 0 }}>
          <Button variant="secondary" onClick={() => nav("/ideas/new")}>New Idea</Button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 1 auto", minWidth: 0, marginLeft: "auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              minWidth: 0,
              maxWidth: 180
            }}
            onClick={() => nav("/profile/me")}
          >
            <Avatar url={user?.avatarUrl} size={36} />
            <div
              style={{
                fontWeight: 800,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
              title={displayName}
            >
              {displayName}
            </div>
          </div>
          <Button variant="ghost" onClick={logout} style={{ flexShrink: 0, paddingInline: 12 }}>
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
