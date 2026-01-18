// import React from "react";
import { useNavigate } from "react-router-dom";
import {Button } from "../components/Button";
import Avatar from "./Avatar";
import { useAuth } from "../lib/auth";
import LabIcon from "../images/LabIcon.png";

export default function TopBar() {
  const nav = useNavigate();
  const { user, clearSession } = useAuth();

  return (
    <div style={{ background: "var(--card)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => nav("/feed")}>
          <img src={LabIcon} style={{ height: 36 }} />
          <div style={{ fontWeight: 900 }}>IdeaLab</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Button variant="secondary" onClick={() => nav("/ideas/new")}>New Idea</Button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => nav("/profile/me")}>
            <Avatar url={user?.avatarUrl} size={36} />
            <div style={{ fontWeight: 800 }}>{user?.username}</div>
          </div>
          <Button variant="secondary" onClick={() => clearSession()}>Logout</Button>
        </div>
      </div>
    </div>
  );
}
