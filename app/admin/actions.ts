"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authClient } from "@/lib/supabase/server";
import { isAdminEmail, requireAdmin } from "@/lib/auth";
import { validateSurveyInput } from "@/lib/domain/survey";
import * as db from "@/lib/data/admin";

export type FormState = { error?: string } | undefined;

const uuid = z.string().uuid();

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await authClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !isAdminEmail(data.user?.email)) {
    await supabase.auth.signOut();
    return { error: "Invalid credentials or not an authorised admin." };
  }
  redirect("/admin");
}

export async function logout() {
  await (await authClient()).auth.signOut();
  redirect("/admin/login");
}

export async function saveSurvey(surveyId: string | null, payload: unknown): Promise<{ error?: string; id?: string }> {
  await requireAdmin();
  const parsed = validateSurveyInput(payload);
  if (!parsed.ok) return { error: parsed.error };
  if (surveyId === null) {
    const id = await db.createSurvey(parsed.value);
    revalidatePath("/admin");
    return { id };
  }
  if (!uuid.safeParse(surveyId).success) return { error: "Invalid survey" };
  const res = await db.updateSurvey(surveyId, parsed.value);
  if (!res.ok) return { error: res.error };
  revalidatePath("/admin");
  return { id: surveyId };
}

export async function changeStatus(formData: FormData) {
  await requireAdmin();
  const id = uuid.parse(formData.get("id"));
  const status = z.enum(["draft", "active", "inactive"]).parse(formData.get("status"));
  await db.setSurveyStatus(id, status);
  revalidatePath("/admin", "layout");
}

export async function removeSurvey(formData: FormData) {
  await requireAdmin();
  await db.deleteSurvey(uuid.parse(formData.get("id")));
  redirect("/admin");
}

export async function createParticipants(formData: FormData) {
  await requireAdmin();
  const id = uuid.parse(formData.get("id"));
  const count = z.coerce.number().int().min(1).max(100).parse(formData.get("count"));
  await db.addParticipants(id, await db.nextParticipantLabels(id, count));
  revalidatePath(`/admin/surveys/${id}`);
}

export async function removeParticipant(formData: FormData) {
  await requireAdmin();
  const surveyId = uuid.parse(formData.get("surveyId"));
  await db.deleteParticipant(uuid.parse(formData.get("participantId")));
  revalidatePath(`/admin/surveys/${surveyId}`);
  redirect(`/admin/surveys/${surveyId}`);
}

export async function resetParticipant(formData: FormData) {
  await requireAdmin();
  const surveyId = uuid.parse(formData.get("surveyId"));
  await db.resetResponse(uuid.parse(formData.get("participantId")));
  revalidatePath(`/admin/surveys/${surveyId}`, "layout");
}
