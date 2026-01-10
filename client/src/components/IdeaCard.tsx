import { Link } from "react-router-dom";

type IdeaCardProps = {
  id: string;
  text: string;
  imageUrl?: string;
  createdAt: string;
  likesCount?: number;
  commentsCount?: number;
  onEdit?: (id: string) => void;
};

export function IdeaCard({
  id,
  text,
  imageUrl,
  createdAt,
  likesCount = 0,
  commentsCount = 0,
  onEdit,
}: IdeaCardProps) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <Link to={`/ideas/${id}`} style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ fontSize: 14, opacity: 0.7 }}>
            {new Date(createdAt).toLocaleString()}
          </div>
          <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{text}</div>
        </Link>

        {onEdit ? (
          <button onClick={() => onEdit(id)} style={{ height: 36 }}>
            Edit
          </button>
        ) : null}
      </div>

      {imageUrl ? (
        <img
          src={imageUrl}
          alt="idea"
          style={{ width: "100%", marginTop: 10, borderRadius: 10, objectFit: "cover" }}
        />
      ) : null}

      <div style={{ marginTop: 10, display: "flex", gap: 12, opacity: 0.8 }}>
        <span>❤️ {likesCount}</span>
        <span>💬 {commentsCount}</span>
      </div>
    </div>
  );
}
