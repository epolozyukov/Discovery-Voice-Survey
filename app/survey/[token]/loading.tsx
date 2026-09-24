import { Brand, PvSplit } from "@/components/survey/pv-shell";
import { Orb } from "@/components/voice/orb";

export default function Loading() {
  return (
    <PvSplit rail={<Brand onDark />}>
      <div className="flex flex-col items-start gap-5" role="status" aria-live="polite">
        <Orb size={96} state="working" />
        <p className="pv-muted">Preparing your questionnaire…</p>
      </div>
    </PvSplit>
  );
}
