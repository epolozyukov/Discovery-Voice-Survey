import { describe, expect, it } from "vitest";
import { canTransition, assertTransition, isEditable } from "@/lib/domain/response-state";

describe("response state", () => {
  it("allows the forward path", () => {
    expect(canTransition("not_started", "in_progress")).toBe(true);
    expect(canTransition("in_progress", "completed")).toBe(true);
  });
  it("rejects skipping, going back and leaving completed", () => {
    expect(canTransition("not_started", "completed")).toBe(false);
    expect(canTransition("in_progress", "not_started")).toBe(false);
    expect(canTransition("completed", "in_progress")).toBe(false);
  });
  it("assertTransition throws on invalid", () => {
    expect(() => assertTransition("completed", "in_progress")).toThrow();
  });
  it("only unfinished responses are editable", () => {
    expect(isEditable("not_started")).toBe(true);
    expect(isEditable("in_progress")).toBe(true);
    expect(isEditable("completed")).toBe(false);
  });
});
