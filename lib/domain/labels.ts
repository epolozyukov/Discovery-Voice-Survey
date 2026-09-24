const LABEL_RE = /^SME-(\d+)$/;

/** Next `count` labels after the highest existing SME number, so deleted numbers are never reused. */
export function nextParticipantLabels(existing: readonly string[], count: number): string[] {
  const highest = existing.reduce((max, label) => {
    const n = LABEL_RE.exec(label)?.[1];
    return n ? Math.max(max, Number(n)) : max;
  }, 0);
  return Array.from({ length: count }, (_, i) => `SME-${String(highest + i + 1).padStart(3, "0")}`);
}
