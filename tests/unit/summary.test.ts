import { describe, expect, it } from "vitest";
import { countByStatus, completionRate } from "@/lib/domain/summary";

describe("countByStatus", () => {
  it("counts every status, including zeros", () => {
    expect(countByStatus([{ status: "completed" }, { status: "in_progress" }, { status: "completed" }])).toEqual({
      not_started: 0,
      in_progress: 1,
      completed: 2,
    });
  });
});

describe("completionRate", () => {
  it("returns a whole percentage", () => {
    expect(completionRate({ not_started: 1, in_progress: 1, completed: 1 })).toBe(33);
  });
  it("is 0 with no participants", () => {
    expect(completionRate({ not_started: 0, in_progress: 0, completed: 0 })).toBe(0);
  });
});
