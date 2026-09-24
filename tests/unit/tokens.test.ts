import { describe, expect, it } from "vitest";
import { generateToken, isWellFormedToken, checkParticipantAccess } from "@/lib/domain/tokens";

describe("tokens", () => {
  it("generates unique high-entropy url-safe tokens", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
  it("validates format", () => {
    expect(isWellFormedToken(generateToken())).toBe(true);
    expect(isWellFormedToken("1")).toBe(false);
    expect(isWellFormedToken("../etc/passwd")).toBe(false);
  });
});

describe("checkParticipantAccess", () => {
  it("rejects unknown token", () => {
    expect(checkParticipantAccess(null)).toEqual({ ok: false, reason: "not_found" });
  });
  it("rejects non-active surveys", () => {
    expect(checkParticipantAccess({ surveyStatus: "inactive", responseStatus: "not_started" })).toEqual({ ok: false, reason: "inactive" });
    expect(checkParticipantAccess({ surveyStatus: "draft", responseStatus: "not_started" })).toEqual({ ok: false, reason: "inactive" });
  });
  it("allows active surveys", () => {
    expect(checkParticipantAccess({ surveyStatus: "active", responseStatus: "in_progress" })).toEqual({ ok: true, readOnly: false });
  });
  it("marks completed responses read-only", () => {
    expect(checkParticipantAccess({ surveyStatus: "active", responseStatus: "completed" })).toEqual({ ok: true, readOnly: true });
  });
});
