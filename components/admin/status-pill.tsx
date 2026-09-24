import type { ResponseStatus, SurveyStatus } from "@/types";

const styles: Record<string, { label: string; cls: string; dot: string }> = {
  active: { label: "Active", cls: "bg-ad-ok-soft text-ad-ok", dot: "bg-ad-ok" },
  draft: { label: "Draft", cls: "bg-ad-warn-soft text-ad-warn", dot: "bg-ad-warn" },
  inactive: { label: "Inactive", cls: "bg-ad-line text-ad-muted", dot: "bg-ad-muted" },
  completed: { label: "Completed", cls: "bg-ad-ok-soft text-ad-ok", dot: "bg-ad-ok" },
  in_progress: { label: "In progress", cls: "bg-ad-brand-soft text-ad-brand", dot: "bg-ad-brand" },
  not_started: { label: "Not started", cls: "bg-ad-line text-ad-muted", dot: "bg-ad-muted" },
};

export function StatusPill({ value, testId }: { value: SurveyStatus | ResponseStatus; testId?: string }) {
  const s = styles[value];
  return (
    <span data-testid={testId} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </span>
  );
}
