// import React from "react";
export default function Avatar({ url, size = 40 }: { url?: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.06)"
      }}
    >
      <img
        src={url || "/IdeaLabAvatar.png"}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          objectFit: "cover",
          transform: "scale(1.08)",
          transformOrigin: "center center"
        }}
      />
    </div>
  );
}
