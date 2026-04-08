export function LoadingState({ text }: { text?: string }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ fontWeight: 800 }}>{text || "Loading..."}</div>
    </div>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ fontWeight: 900, fontSize: 18 }}>{title}</div>
      {subtitle && <div style={{ marginTop: 6, color: "rgba(0,0,0,0.6)" }}>{subtitle}</div>}
    </div>
  );
}

export function ErrorState({ title }: { title: string }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ fontWeight: 900, color: "var(--danger)" }}>{title}</div>
    </div>
  );
}
