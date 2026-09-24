import "server-only";
import { serviceClient } from "@/lib/supabase/admin";
import { MAX_ANSWER_LENGTH } from "@/lib/config/limits";
import { validateAnswerText, findMissingRequired } from "@/lib/domain/answers";
import { assertTransition } from "@/lib/domain/response-state";
import { checkParticipantAccess, isWellFormedToken } from "@/lib/domain/tokens";
import type { InputMethod, ResponseStatus, SurveyStatus } from "@/types";

export interface ParticipantSession {
  responseId: string;
  status: ResponseStatus;
  survey: { title: string; description: string | null };
  questions: { id: string; text: string; required: boolean }[];
  answers: Record<string, { text: string; inputMethod: InputMethod }>;
}

export type LoadResult =
  | { ok: true; readOnly: boolean; session: ParticipantSession }
  | { ok: false; reason: "not_found" | "inactive" };

interface Loaded {
  responseId: string;
  status: ResponseStatus;
  surveyId: string;
  surveyStatus: SurveyStatus;
  title: string;
  description: string | null;
}

async function findByToken(token: string): Promise<Loaded | null> {
  if (!isWellFormedToken(token)) return null;
  const { data } = await serviceClient()
    .from("participants")
    .select("survey_id, surveys(title, description, status), responses(id, status)")
    .eq("token", token)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as {
    survey_id: string;
    surveys: { title: string; description: string | null; status: SurveyStatus };
    responses: { id: string; status: ResponseStatus } | { id: string; status: ResponseStatus }[];
  };
  const resp = Array.isArray(row.responses) ? row.responses[0] : row.responses;
  if (!resp) return null;
  return {
    responseId: resp.id, status: resp.status, surveyId: row.survey_id,
    surveyStatus: row.surveys.status, title: row.surveys.title, description: row.surveys.description,
  };
}

export async function loadSession(token: string): Promise<LoadResult> {
  const found = await findByToken(token);
  const access = checkParticipantAccess(found && { surveyStatus: found.surveyStatus, responseStatus: found.status });
  if (!access.ok || !found) return { ok: false, reason: access.ok ? "not_found" : access.reason };
  const db = serviceClient();
  const [qs, as] = await Promise.all([
    db.from("questions").select("id, text, required").eq("survey_id", found.surveyId).order("position"),
    db.from("answers").select("question_id, answer, input_method").eq("response_id", found.responseId),
  ]);
  const answers: ParticipantSession["answers"] = {};
  for (const a of (as.data ?? []) as { question_id: string; answer: string; input_method: InputMethod }[]) {
    answers[a.question_id] = { text: a.answer, inputMethod: a.input_method };
  }
  return {
    ok: true,
    readOnly: access.readOnly,
    session: {
      responseId: found.responseId,
      status: found.status,
      survey: { title: found.title, description: found.description },
      questions: (qs.data ?? []) as ParticipantSession["questions"],
      answers,
    },
  };
}

export type ActionResult = { ok: true } | { ok: false; error: string };

async function markStarted(l: Loaded) {
  if (l.status !== "not_started") return;
  assertTransition("not_started", "in_progress");
  await serviceClient()
    .from("responses")
    .update({ status: "in_progress", started_at: new Date().toISOString() })
    .eq("id", l.responseId)
    .eq("status", "not_started");
}

export async function saveAnswer(token: string, questionId: string, text: string, method: InputMethod): Promise<ActionResult> {
  const found = await findByToken(token);
  const access = checkParticipantAccess(found && { surveyStatus: found.surveyStatus, responseStatus: found.status });
  if (!access.ok || !found) return { ok: false, error: "This survey is not available." };
  if (access.readOnly) return { ok: false, error: "This survey has already been submitted." };

  const db = serviceClient();
  const { data: q } = await db.from("questions").select("id, required").eq("id", questionId).eq("survey_id", found.surveyId).maybeSingle();
  if (!q) return { ok: false, error: "Unknown question." };
  const v = validateAnswerText(text, { required: false, maxLength: MAX_ANSWER_LENGTH });
  if (!v.ok) return v;
  if (method !== "text" && method !== "voice") return { ok: false, error: "Invalid input method." };

  await markStarted(found);
  const { error } = await db.from("answers").upsert(
    { response_id: found.responseId, question_id: questionId, answer: v.value, input_method: method, updated_at: new Date().toISOString() },
    { onConflict: "response_id,question_id" },
  );
  return error ? { ok: false, error: "Could not save your answer. Please try again." } : { ok: true };
}

export async function submitSurvey(token: string): Promise<ActionResult> {
  const found = await findByToken(token);
  const access = checkParticipantAccess(found && { surveyStatus: found.surveyStatus, responseStatus: found.status });
  if (!access.ok || !found) return { ok: false, error: "This survey is not available." };
  if (access.readOnly) return { ok: false, error: "This survey has already been submitted." };

  const db = serviceClient();
  const [qs, as] = await Promise.all([
    db.from("questions").select("id, required").eq("survey_id", found.surveyId),
    db.from("answers").select("question_id, answer").eq("response_id", found.responseId),
  ]);
  const map = Object.fromEntries(((as.data ?? []) as { question_id: string; answer: string }[]).map((a) => [a.question_id, a.answer]));
  if (findMissingRequired((qs.data ?? []) as { id: string; required: boolean }[], map).length) {
    return { ok: false, error: "Please answer all required questions before submitting." };
  }
  await markStarted(found);
  assertTransition("in_progress", "completed");
  const { error } = await db
    .from("responses")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", found.responseId)
    .neq("status", "completed");
  return error ? { ok: false, error: "Could not submit. Please try again." } : { ok: true };
}
