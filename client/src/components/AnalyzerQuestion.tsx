import { Button } from "./Button";

export default function AnalyzerQuestion({
  title,
  question,
  onYes,
  onNo,
  disabled
}: {
  title: string;
  question: string;
  onYes: () => void;
  onNo: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="card" style={{ padding: 12, background: "var(--bg)" }}>
      <div style={{ fontSize: 12, color: "rgba(0,0,0,0.65)", fontWeight: 800 }}>{title}</div>
      <div style={{ marginTop: 6, fontWeight: 900 }}>{question}</div>
      <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
        <Button variant="primary" disabled={disabled} onClick={onYes}>Already thought about that</Button>
        <Button variant="secondary" disabled={disabled} onClick={onNo}>Tell me more</Button>
      </div>
    </div>
  );
}
