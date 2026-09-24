import { describe, expect, it } from "vitest";
import { validateSurveyInput, reorderQuestions } from "@/lib/domain/survey";

const q = (text: string, required = true) => ({ text, required });

describe("validateSurveyInput", () => {
  it("accepts a valid survey", () => {
    const r = validateSurveyInput({ title: "Pre-interview", description: "d", questions: [q("One?")] });
    expect(r.ok).toBe(true);
  });
  it("rejects an empty or whitespace title", () => {
    const r = validateSurveyInput({ title: "   ", questions: [q("One?")] });
    expect(r.ok).toBe(false);
  });
  it("rejects a survey without questions", () => {
    expect(validateSurveyInput({ title: "T", questions: [] }).ok).toBe(false);
  });
  it("rejects blank question text", () => {
    expect(validateSurveyInput({ title: "T", questions: [q("  ")] }).ok).toBe(false);
  });
  it("trims values", () => {
    const r = validateSurveyInput({ title: " T ", questions: [q(" Q ")] });
    expect(r.ok && r.value.title).toBe("T");
    expect(r.ok && r.value.questions[0].text).toBe("Q");
  });
  it("rejects too many questions", () => {
    const many = Array.from({ length: 51 }, (_, i) => q(`Q${i}`));
    expect(validateSurveyInput({ title: "T", questions: many }).ok).toBe(false);
  });
});

describe("reorderQuestions", () => {
  const items = ["a", "b", "c"].map((id) => ({ id }));
  it("moves an item and keeps others in order", () => {
    expect(reorderQuestions(items, 0, 2).map((i) => i.id)).toEqual(["b", "c", "a"]);
  });
  it("rejects out-of-range indexes", () => {
    expect(() => reorderQuestions(items, 0, 3)).toThrow();
    expect(() => reorderQuestions(items, -1, 1)).toThrow();
  });
  it("does not mutate input", () => {
    reorderQuestions(items, 0, 2);
    expect(items.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
});
