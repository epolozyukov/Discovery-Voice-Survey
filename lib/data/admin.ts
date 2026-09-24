import "server-only";
import { serviceClient } from "@/lib/supabase/admin";
import { generateToken } from "@/lib/domain/tokens";
import type { SurveyInput } from "@/lib/domain/survey";
import type { InputMethod, Question, ResponseStatus, Survey, SurveyStatus } from "@/types";

type SurveyRow = { id: string; title: string; description: string | null; status: SurveyStatus; created_at: string; updated_at: string };
type QuestionRow = { id: string; survey_id: string; position: number; text: string; required: boolean };

const toSurvey = (r: SurveyRow): Survey => ({
  id: r.id, title: r.title, description: r.description, status: r.status, createdAt: r.created_at, updatedAt: r.updated_at,
});
const toQuestion = (r: QuestionRow): Question => ({
  id: r.id, surveyId: r.survey_id, order: r.position, text: r.text, required: r.required,
});

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export interface SurveySummary extends Survey { questionCount: number; participantCount: number; completedCount: number }

export async function listSurveys(): Promise<SurveySummary[]> {
  const db = serviceClient();
  const [surveys, questions, participants, responses] = await Promise.all([
    db.from("surveys").select("*").order("created_at", { ascending: false }),
    db.from("questions").select("survey_id"),
    db.from("participants").select("id, survey_id"),
    db.from("responses").select("participant_id, status"),
  ]);
  const surveyRows = check(surveys) as SurveyRow[];
  const qs = check(questions) as { survey_id: string }[];
  const ps = check(participants) as { id: string; survey_id: string }[];
  const rs = check(responses) as { participant_id: string; status: ResponseStatus }[];
  const surveyOf = new Map(ps.map((p) => [p.id, p.survey_id]));
  return surveyRows.map((s) => ({
    ...toSurvey(s),
    questionCount: qs.filter((q) => q.survey_id === s.id).length,
    participantCount: ps.filter((p) => p.survey_id === s.id).length,
    completedCount: rs.filter((r) => r.status === "completed" && surveyOf.get(r.participant_id) === s.id).length,
  }));
}

export async function getSurveyWithQuestions(id: string): Promise<{ survey: Survey; questions: Question[] } | null> {
  const db = serviceClient();
  const { data: s } = await db.from("surveys").select("*").eq("id", id).maybeSingle();
  if (!s) return null;
  const qs = check(await db.from("questions").select("*").eq("survey_id", id).order("position")) as QuestionRow[];
  return { survey: toSurvey(s as SurveyRow), questions: qs.map(toQuestion) };
}

async function hasAnswers(surveyId: string): Promise<boolean> {
  const db = serviceClient();
  const { data } = await db.from("participants").select("id").eq("survey_id", surveyId);
  const ids = ((data ?? []) as { id: string }[]).map((p) => p.id);
  if (!ids.length) return false;
  const { data: rs } = await db.from("responses").select("id").in("participant_id", ids);
  const rids = ((rs ?? []) as { id: string }[]).map((r) => r.id);
  if (!rids.length) return false;
  const { count } = await db.from("answers").select("id", { count: "exact", head: true }).in("response_id", rids);
  return (count ?? 0) > 0;
}

export async function createSurvey(input: SurveyInput): Promise<string> {
  const db = serviceClient();
  const row = check(
    await db.from("surveys").insert({ title: input.title, description: input.description || null }).select("id").single(),
  ) as { id: string };
  check(await db.rpc("replace_questions", { p_survey_id: row.id, p_questions: input.questions }));
  return row.id;
}

export async function updateSurvey(id: string, input: SurveyInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = serviceClient();
  const current = await getSurveyWithQuestions(id);
  if (!current) return { ok: false, error: "Survey not found" };
  const same =
    current.questions.length === input.questions.length &&
    current.questions.every((q, i) => q.text === input.questions[i].text && q.required === input.questions[i].required);
  if (!same && (await hasAnswers(id))) {
    return { ok: false, error: "Questions are locked once participants have answered. Delete their responses first." };
  }
  check(
    await db.from("surveys").update({ title: input.title, description: input.description || null, updated_at: new Date().toISOString() }).eq("id", id),
  );
  if (!same) check(await db.rpc("replace_questions", { p_survey_id: id, p_questions: input.questions }));
  return { ok: true };
}

export async function setSurveyStatus(id: string, status: SurveyStatus): Promise<void> {
  check(await serviceClient().from("surveys").update({ status, updated_at: new Date().toISOString() }).eq("id", id));
}

export async function deleteSurvey(id: string): Promise<void> {
  check(await serviceClient().from("surveys").delete().eq("id", id));
}

export async function addParticipants(surveyId: string, labels: string[]): Promise<void> {
  const db = serviceClient();
  for (const label of labels) {
    const p = check(
      await db.from("participants").insert({ survey_id: surveyId, label, token: generateToken() }).select("id").single(),
    ) as { id: string };
    check(await db.from("responses").insert({ participant_id: p.id }));
  }
}

export async function nextParticipantLabels(surveyId: string, count: number): Promise<string[]> {
  const { count: existing } = await serviceClient().from("participants").select("id", { count: "exact", head: true }).eq("survey_id", surveyId);
  const start = (existing ?? 0) + 1;
  return Array.from({ length: count }, (_, i) => `SME-${String(start + i).padStart(3, "0")}`);
}

export interface ParticipantRow {
  id: string; label: string; token: string; status: ResponseStatus; completedAt: string | null;
}

export async function listParticipants(surveyId: string): Promise<ParticipantRow[]> {
  const rows = check(
    await serviceClient()
      .from("participants")
      .select("id, label, token, created_at, responses(status, completed_at)")
      .eq("survey_id", surveyId)
      .order("created_at"),
  ) as unknown as { id: string; label: string; token: string; responses: { status: ResponseStatus; completed_at: string | null } | { status: ResponseStatus; completed_at: string | null }[] | null }[];
  return rows.map((r) => {
    const resp = Array.isArray(r.responses) ? r.responses[0] : r.responses;
    return { id: r.id, label: r.label, token: r.token, status: resp?.status ?? "not_started", completedAt: resp?.completed_at ?? null };
  });
}

export interface ResponseDetail {
  participant: { id: string; label: string; surveyId: string };
  status: ResponseStatus;
  completedAt: string | null;
  items: { question: Question; answer: string | null; inputMethod: InputMethod | null }[];
}

export async function getResponseDetail(participantId: string): Promise<ResponseDetail | null> {
  const db = serviceClient();
  const { data: p } = await db.from("participants").select("id, label, survey_id").eq("id", participantId).maybeSingle();
  if (!p) return null;
  const { data: r } = await db.from("responses").select("id, status, completed_at").eq("participant_id", participantId).maybeSingle();
  const survey = await getSurveyWithQuestions(p.survey_id);
  const answers = r
    ? (check(await db.from("answers").select("question_id, answer, input_method").eq("response_id", r.id)) as { question_id: string; answer: string; input_method: InputMethod }[])
    : [];
  return {
    participant: { id: p.id, label: p.label, surveyId: p.survey_id },
    status: (r?.status ?? "not_started") as ResponseStatus,
    completedAt: r?.completed_at ?? null,
    items: (survey?.questions ?? []).map((q) => {
      const a = answers.find((x) => x.question_id === q.id);
      return { question: q, answer: a?.answer ?? null, inputMethod: a?.input_method ?? null };
    }),
  };
}

export async function deleteParticipant(participantId: string): Promise<void> {
  check(await serviceClient().from("participants").delete().eq("id", participantId));
}

export async function getExportData(surveyId: string) {
  const db = serviceClient();
  const detail = await getSurveyWithQuestions(surveyId);
  if (!detail) return null;
  const parts = check(
    await db.from("participants").select("id, label, responses(id, status, completed_at)").eq("survey_id", surveyId).order("created_at"),
  ) as unknown as { id: string; label: string; responses: { id: string; status: string; completed_at: string | null } | { id: string; status: string; completed_at: string | null }[] | null }[];
  const completed = parts
    .map((p) => ({ p, r: Array.isArray(p.responses) ? p.responses[0] : p.responses }))
    .filter((x) => x.r?.status === "completed" && x.r.completed_at);
  const ids = completed.map((x) => x.r!.id);
  const answers = ids.length
    ? (check(await db.from("answers").select("response_id, question_id, answer, input_method").in("response_id", ids)) as { response_id: string; question_id: string; answer: string; input_method: InputMethod }[])
    : [];
  return {
    title: detail.survey.title,
    questions: detail.questions.map((q) => ({ id: q.id, order: q.order, text: q.text })),
    participants: completed.map(({ p, r }) => ({
      label: p.label,
      completedAt: r!.completed_at!,
      answers: answers.filter((a) => a.response_id === r!.id).map((a) => ({ questionId: a.question_id, answer: a.answer, inputMethod: a.input_method })),
    })),
  };
}

/** Deletes a participant's answers and returns the response to "not_started" (link stays valid). */
export async function resetResponse(participantId: string): Promise<void> {
  const db = serviceClient();
  const { data: r } = await db.from("responses").select("id").eq("participant_id", participantId).maybeSingle();
  if (!r) return;
  check(await db.from("answers").delete().eq("response_id", r.id));
  check(await db.from("responses").update({ status: "not_started", started_at: null, completed_at: null }).eq("id", r.id));
}
