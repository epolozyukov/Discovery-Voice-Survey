import { PvShell } from "@/components/survey/pv-shell";

export default function Loading() {
  return (
    <PvShell>
      <div className="flex flex-col items-center gap-5" role="status" aria-live="polite">
        <div className="pv-orb-load" />
        <p className="pv-muted">Preparing your questionnaire…</p>
      </div>
    </PvShell>
  );
}
