import { describe, expect, it } from "vitest";
import { nextParticipantLabels } from "@/lib/domain/labels";

describe("nextParticipantLabels", () => {
  it("starts at SME-001 for an empty survey", () => {
    expect(nextParticipantLabels([], 2)).toEqual(["SME-001", "SME-002"]);
  });
  it("continues after the highest existing number", () => {
    expect(nextParticipantLabels(["SME-001", "SME-002"], 1)).toEqual(["SME-003"]);
  });
  it("never reuses a label after a deletion (regression: SME-002..004 -> next must be SME-005)", () => {
    expect(nextParticipantLabels(["SME-002", "SME-003", "SME-004"], 2)).toEqual(["SME-005", "SME-006"]);
  });
  it("ignores labels that do not match the pattern", () => {
    expect(nextParticipantLabels(["Alice", "SME-007"], 1)).toEqual(["SME-008"]);
  });
  it("pads to three digits and grows beyond", () => {
    expect(nextParticipantLabels(["SME-999"], 1)).toEqual(["SME-1000"]);
  });
});
