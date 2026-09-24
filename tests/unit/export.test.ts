import { describe, expect, it } from "vitest";
import { toCsv, toJson, type ExportParticipant } from "@/lib/domain/export";

const questions = [
  { id: "q-a", order: 1, text: "How do you use AI?" },
  { id: "q-b", order: 2, text: 'Which "tools", exactly?' },
];
const participants: ExportParticipant[] = [
  {
    label: "SME-001",
    completedAt: "2026-09-24T10:00:00Z",
    answers: [
      { questionId: "q-a", answer: "We use Copilot, mostly", inputMethod: "voice" },
      { questionId: "q-b", answer: 'He said "ok"\nsecond line', inputMethod: "text" },
    ],
  },
  { label: "SME-002", completedAt: "2026-09-25T10:00:00Z", answers: [{ questionId: "q-a", answer: "=HYPERLINK(1)", inputMethod: "text" }] },
];

describe("toCsv", () => {
  const lines = toCsv(questions, participants).split("\r\n");
  it("has the expected header", () => {
    expect(lines[0]).toBe("participant,questionId,question,answer,inputMethod,completedAt");
  });
  it("uses display ids Q01.. and escapes commas, quotes, newlines", () => {
    expect(lines[1]).toBe('SME-001,Q01,How do you use AI?,"We use Copilot, mostly",voice,2026-09-24T10:00:00Z');
    expect(toCsv(questions, participants)).toContain('"He said ""ok""\nsecond line"');
    expect(toCsv(questions, participants)).toContain('"Which ""tools"", exactly?"');
  });
  it("neutralises spreadsheet formulas", () => {
    expect(toCsv(questions, participants)).toContain("'=HYPERLINK(1)");
  });
  it("exports multiple participants", () => {
    expect(lines.filter((l) => l.startsWith("SME-002")).length).toBe(1);
  });
});

describe("toJson", () => {
  it("returns per-participant structure", () => {
    const out = toJson(questions, participants);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({
      participantId: "SME-001",
      completedAt: "2026-09-24T10:00:00Z",
      answers: [
        { questionId: "Q01", question: "How do you use AI?", answer: "We use Copilot, mostly", inputMethod: "voice" },
        { questionId: "Q02", question: 'Which "tools", exactly?', answer: 'He said "ok"\nsecond line', inputMethod: "text" },
      ],
    });
  });
});
