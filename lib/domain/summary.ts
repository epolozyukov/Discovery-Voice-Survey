import type { ResponseStatus } from "@/types";

export type StatusCounts = Record<ResponseStatus, number>;

export function countByStatus(items: readonly { status: ResponseStatus }[]): StatusCounts {
  const counts: StatusCounts = { not_started: 0, in_progress: 0, completed: 0 };
  for (const i of items) counts[i.status]++;
  return counts;
}

export function completionRate(counts: StatusCounts): number {
  const total = counts.not_started + counts.in_progress + counts.completed;
  return total === 0 ? 0 : Math.round((counts.completed / total) * 100);
}
