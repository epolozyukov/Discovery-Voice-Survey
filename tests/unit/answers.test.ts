import { describe, expect, it } from "vitest";
import { validateAnswerText, findMissingRequired } from "@/lib/domain/answers";

describe("validateAnswerText", () => {
  it("trims and accepts", () => {
    expect(validateAnswerText(" hi ", { required: true, maxLength: 10 })).toEqual({ ok: true, value: "hi" });
  });
  it("rejects empty when required", () => {
    expect(validateAnswerText("  ", { required: true, maxLength: 10 }).ok).toBe(false);
  });
  it("allows empty when optional", () => {
    expect(validateAnswerText("", { required: false, maxLength: 10 })).toEqual({ ok: true, value: "" });
  });
  it("enforces max length", () => {
    expect(validateAnswerText("x".repeat(11), { required: false, maxLength: 10 }).ok).toBe(false);
  });
});

describe("findMissingRequired", () => {
  const questions = [
    { id: "1", required: true },
    { id: "2", required: false },
    { id: "3", required: true },
  ];
  it("returns required questions with no or blank answer", () => {
    expect(findMissingRequired(questions, { "1": "a", "3": "  " })).toEqual(["3"]);
  });
  it("returns empty when complete", () => {
    expect(findMissingRequired(questions, { "1": "a", "3": "b" })).toEqual([]);
  });
});
