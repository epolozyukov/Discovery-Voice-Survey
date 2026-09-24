export function StatTile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="ad-card flex flex-col gap-1 p-5">
      <span className="text-sm font-medium text-ad-muted">{label}</span>
      <span className="ad-grad-text text-3xl font-bold tabular-nums">{value}</span>
      {hint && <span className="text-xs text-ad-muted">{hint}</span>}
    </div>
  );
}
