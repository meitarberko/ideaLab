import { Button } from "./Button";

export default function AnalyzerExplanation({
  explanation,
  examples,
  onContinue
}: {
  explanation: string;
  examples: string[];
  onContinue: () => void;
}) {
  return (
    <div className="card" style={{ padding: 12, background: "var(--bg)" }}>
      <div style={{ fontWeight: 900 }}>Why this matters</div>
      <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{explanation}</div>

      <div style={{ marginTop: 10, fontWeight: 900 }}>Examples</div>
      <ul style={{ margin: "8px 0 0 18px" }}>
        {examples.map((example, idx) => (
          <li key={`${example}-${idx}`} style={{ marginBottom: 6 }}>{example}</li>
        ))}
      </ul>

      <div style={{ marginTop: 10 }}>
        <Button onClick={onContinue}>Continue</Button>
      </div>
    </div>
  );
}
