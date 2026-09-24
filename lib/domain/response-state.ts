import type { ResponseStatus } from "@/types";

const allowed: Record<ResponseStatus, readonly ResponseStatus[]> = {
  not_started: ["in_progress"],
  in_progress: ["completed"],
  completed: [],
};

export const canTransition = (from: ResponseStatus, to: ResponseStatus) => allowed[from].includes(to);

export function assertTransition(from: ResponseStatus, to: ResponseStatus): void {
  if (!canTransition(from, to)) throw new Error(`Invalid response transition ${from} -> ${to}`);
}

export const isEditable = (status: ResponseStatus) => status !== "completed";
