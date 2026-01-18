// import React from "react";
export default function Avatar({ url, size = 40 }: { url?: string; size?: number }) {
  return (
    <img
      src={url || "/IdeaLabAvatar.png"}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(0,0,0,0.08)" }}
    />
  );
}
