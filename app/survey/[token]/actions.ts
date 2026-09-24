"use server";

import { z } from "zod";
import { saveAnswer, submitSurvey, type ActionResult } from "@/lib/data/participant";
import type { InputMethod } from "@/types";

const args = z.object({ token: z.string().max(100), questionId: z.string().uuid(), text: z.string().max(100_000), method: z.enum(["text", "voice"]) });

export async function saveAnswerAction(token: string, questionId: string, text: string, method: InputMethod): Promise<ActionResult> {
  const parsed = args.safeParse({ token, questionId, text, method });
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  return saveAnswer(parsed.data.token, parsed.data.questionId, parsed.data.text, parsed.data.method);
}

export async function submitAction(token: string): Promise<ActionResult> {
  if (typeof token !== "string" || token.length > 100) return { ok: false, error: "Invalid request." };
  return submitSurvey(token);
}
