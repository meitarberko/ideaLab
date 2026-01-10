import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

export default function CreateIdea() {
  const nav = useNavigate();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    if (!text.trim()) return setError("text is required");
    if (!file) return setError("image is required");

    const fd = new FormData();
    fd.append("text", text.trim());
    fd.append("image", file);

    setLoading(true);
    const res = await apiFetch<{ id: string }>("/ideas", { method: "POST", body: fd });
    setLoading(false);

    if (!res.ok) return setError(res.error?.message || "Create failed");
    nav(`/ideas/${res.data!.id}`);
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: 16 }}>
      <h2>Create Idea</h2>

      {error ? <div style={{ color: "crimson", marginBottom: 10 }}>{error}</div> : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="Write your idea..."
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => nav(-1)} disabled={loading}>
            Cancel
          </button>
          <button onClick={submit} disabled={loading}>
            {loading ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
