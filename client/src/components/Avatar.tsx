// import React from "react";
import IdeaLabAvatar from "../images/IdeaLabAvatar.png";


export default function Avatar({ url, size = 40 }: { url?: string; size?: number }) {
  return (
    <img
      src={url || IdeaLabAvatar}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(0,0,0,0.08)" }}
    />
  );
}
