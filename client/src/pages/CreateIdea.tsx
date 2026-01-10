import { useState } from "react";
import TopBar from "../components/TopBar";
import { Button } from "../components/Button";
import Input from "../components/Input";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function CreateIdea() {
  const nav = useNavigate();
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!text.trim()) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("text", text.trim());
      if (image) fd.append("image", image);

      const r = await api.post("/ideas", fd, { headers: { "Content-Type": "multipart/form-data" } });
      nav(`/ideas/${r.data.id}`);
    } catch {
      setErr("Failed to publish");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TopBar />
      <div className="container">
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 900, fontSize: 20 }}>New Idea</div>

          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div className="label">Idea text</div>
              <textarea
                className="input"
                style={{ minHeight: 140, resize: "vertical" }}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>

            <div>
              <div className="label">Image (optional)</div>
              <Input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} />
              {image && (
                <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ fontWeight: 800 }}>{image.name}</div>
                  <Button variant="secondary" type="button" onClick={() => setImage(null)}>Remove</Button>
                </div>
              )}
            </div>

            {err && <div style={{ fontWeight: 900, color: "var(--danger)" }}>{err}</div>}

            <div style={{ display: "flex", gap: 10 }}>
              <Button loading={loading} disabled={!text.trim()} onClick={submit}>Publish</Button>
              <Button variant="secondary" onClick={() => nav("/feed")}>Cancel</Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
