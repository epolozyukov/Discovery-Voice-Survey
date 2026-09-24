import { PvShell } from "@/components/survey/pv-shell";
import { Orb } from "@/components/voice/orb";

export default function Loading() {
  return (
    <PvShell>
      <div className="flex flex-col items-center gap-5 py-10" role="status" aria-live="polite">
        <Orb size={110} state="working" />
        <p className="pv-muted">Preparing your questionnaire…</p>
      </div>
    </PvShell>
  );
}
