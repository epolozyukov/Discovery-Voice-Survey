import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { serviceClient } from "@/lib/supabase/admin";
import * as admin from "@/lib/data/admin";
import * as participant from "@/lib/data/participant";

const hasDb = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

describe.skipIf(!hasDb)("survey lifecycle (real Supabase)", () => {
  let surveyId: string;
  let token: string;
  let qIds: string[];

  beforeAll(async () => {
    surveyId = await admin.createSurvey({
      title: `ITEST ${Date.now()}`,
      questions: [
        { text: "Required one?", required: true },
        { text: "Optional two?", required: false },
      ],
    });
    await admin.addParticipants(surveyId, ["SME-001"]);
    token = (await admin.listParticipants(surveyId))[0].token;
    qIds = (await admin.getSurveyWithQuestions(surveyId))!.questions.map((q) => q.id);
  });

  afterAll(async () => {
    if (surveyId) await admin.deleteSurvey(surveyId);
  });

  it("stores questions in order", async () => {
    const data = await admin.getSurveyWithQuestions(surveyId);
    expect(data?.questions.map((q) => q.text)).toEqual(["Required one?", "Optional two?"]);
  });

  it("rejects participants while the survey is a draft", async () => {
    expect(await participant.loadSession(token)).toEqual({ ok: false, reason: "inactive" });
  });

  it("rejects unknown and malformed tokens", async () => {
    expect(await participant.loadSession("1")).toEqual({ ok: false, reason: "not_found" });
    expect(await participant.loadSession("A".repeat(43))).toEqual({ ok: false, reason: "not_found" });
  });

  it("refuses to save answers on an inactive survey", async () => {
    expect((await participant.saveAnswer(token, qIds[0], "x", "text")).ok).toBe(false);
  });

  it("lets participants answer once active and marks the response in progress", async () => {
    await admin.setSurveyStatus(surveyId, "active");
    expect((await participant.saveAnswer(token, qIds[0], "  first answer ", "voice")).ok).toBe(true);
    const loaded = await participant.loadSession(token);
    expect(loaded.ok && loaded.session.status).toBe("in_progress");
    expect(loaded.ok && loaded.session.answers[qIds[0]]).toEqual({ text: "first answer", inputMethod: "voice" });
  });

  it("rejects answers for questions from another survey and over-long answers", async () => {
    expect((await participant.saveAnswer(token, "00000000-0000-0000-0000-000000000000", "x", "text")).ok).toBe(false);
    expect((await participant.saveAnswer(token, qIds[0], "x".repeat(10_001), "text")).ok).toBe(false);
  });

  it("locks question edits once answers exist", async () => {
    const res = await admin.updateSurvey(surveyId, { title: "ITEST renamed", questions: [{ text: "Changed?", required: true }] });
    expect(res.ok).toBe(false);
  });

  it("blocks submission until required questions are answered", async () => {
    await participant.saveAnswer(token, qIds[0], "   ", "text");
    expect((await participant.submitSurvey(token)).ok).toBe(false);
    await participant.saveAnswer(token, qIds[0], "final answer", "text");
  });

  it("submits, becomes read-only and exports", async () => {
    expect((await participant.submitSurvey(token)).ok).toBe(true);
    const after = await participant.loadSession(token);
    expect(after.ok && after.readOnly).toBe(true);
    expect((await participant.saveAnswer(token, qIds[0], "tamper", "text")).ok).toBe(false);
    expect((await participant.submitSurvey(token)).ok).toBe(false);

    const exp = await admin.getExportData(surveyId);
    expect(exp?.participants).toHaveLength(1);
    expect(exp?.participants[0].answers[0].answer).toBe("final answer");
  });

  it("isolates participants: a second token cannot see the first response", async () => {
    await admin.addParticipants(surveyId, ["SME-002"]);
    const other = (await admin.listParticipants(surveyId)).find((p) => p.label === "SME-002")!;
    const s = await participant.loadSession(other.token);
    expect(s.ok && s.session.answers).toEqual({});
    expect(s.ok && s.session.status).toBe("not_started");
  });

  it("reset returns a completed response to not_started and clears answers", async () => {
    const p = (await admin.listParticipants(surveyId)).find((x) => x.label === "SME-001")!;
    await admin.resetResponse(p.id);
    const s = await participant.loadSession(token);
    expect(s.ok && s.readOnly).toBe(false);
    expect(s.ok && s.session.answers).toEqual({});
  });

  it("deactivated surveys stop accepting answers", async () => {
    await admin.setSurveyStatus(surveyId, "inactive");
    expect((await participant.saveAnswer(token, qIds[0], "x", "text")).ok).toBe(false);
  });

  it("anon key cannot read tables directly (RLS)", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data } = await anon.from("answers").select("*");
    expect(data ?? []).toEqual([]);
    expect(serviceClient()).toBeDefined();
  });
});
