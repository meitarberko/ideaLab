import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { Button } from "./Button";
import AnalyzerQuestion from "./AnalyzerQuestion";
import AnalyzerExplanation from "./AnalyzerExplanation";

type AnalyzerSection = {
  question: string;
  explanation: string;
  examples: string[];
};

type AnalyzerPayload = {
  development: AnalyzerSection;
  risks: AnalyzerSection;
  opportunities: AnalyzerSection;
  improvements: AnalyzerSection;
};

type AnalyzeResponse = {
  ideaId: string;
  analysis: AnalyzerPayload;
  cached: boolean;
};

const sections: Array<{ key: keyof AnalyzerPayload; title: string }> = [
  { key: "development", title: "Step 1: Development" },
  { key: "risks", title: "Step 2: Risks" },
  { key: "opportunities", title: "Step 3: Opportunities" },
  { key: "improvements", title: "Step 4: Improvements" }
];

export default function IdeaAnalyzerModal({
  open,
  ideaId,
  onClose
}: {
  open: boolean;
  ideaId: string;
  onClose: () => void;
}) {
  const [analysis, setAnalysis] = useState<AnalyzerPayload | null>(null);
  const [cached, setCached] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAnalysis(null);
    setCached(false);
    setLoading(false);
    setError(null);
    setStep(0);
    setShowExplanation(false);
  }, [open, ideaId]);

  const current = useMemo(() => {
    if (!analysis) return null;
    if (step >= sections.length) return null;
    const section = sections[step];
    return { ...section, data: analysis[section.key] };
  }, [analysis, step]);

  if (!open) return null;

  const runAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.post<AnalyzeResponse>(`/ideas/${ideaId}/analyze`);
      setAnalysis(r.data.analysis);
      setCached(Boolean(r.data.cached));
      setStep(0);
      setShowExplanation(false);
    } catch {
      setError("Analyzer failed. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    setShowExplanation(false);
    setStep((s) => s + 1);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.2)",
        zIndex: 60,
        display: "flex",
        justifyContent: "flex-end"
      }}
      onClick={onClose}
    >
      <aside
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(460px, 96vw)",
          height: "100%",
          borderRadius: 0,
          padding: 16,
          overflowY: "auto"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>IdeaLab Analyzer</div>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>

        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          {!analysis && (
            <>
              <div style={{ color: "rgba(0,0,0,0.75)", fontWeight: 700 }}>
                Run analysis for this idea. Result is cached and reused.
              </div>

              {error && <div style={{ fontWeight: 900, color: "var(--danger)" }}>{error}</div>}

              <Button loading={loading} onClick={runAnalyze}>Analyze</Button>
            </>
          )}

          {analysis && step < sections.length && current && (
            <>
              <div style={{ fontSize: 12, color: "rgba(0,0,0,0.65)", fontWeight: 900 }}>
                Source: {cached ? "Cached" : "Fresh"}
              </div>

              <AnalyzerQuestion
                title={current.title}
                question={current.data.question}
                onYes={nextStep}
                onNo={() => setShowExplanation(true)}
                disabled={showExplanation}
              />

              {showExplanation && (
                <AnalyzerExplanation
                  explanation={current.data.explanation}
                  examples={current.data.examples}
                  onContinue={nextStep}
                />
              )}
            </>
          )}

          {analysis && step >= sections.length && (
            <div className="card" style={{ padding: 12, background: "var(--bg)" }}>
              <div style={{ fontWeight: 900 }}>Analysis complete</div>
              <div style={{ marginTop: 6 }}>You reached the end of all analyzer sections.</div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
