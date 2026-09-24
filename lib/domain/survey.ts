import { z } from "zod";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_QUESTIONS_PER_SURVEY,
  MAX_QUESTION_LENGTH,
  MAX_TITLE_LENGTH,
} from "@/lib/config/limits";

const questionSchema = z.object({
  id: z.string().optional(),
  text: z.string().trim().min(1, "Question text is required").max(MAX_QUESTION_LENGTH),
  required: z.boolean().default(true),
});

export const surveyInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(MAX_TITLE_LENGTH),
  description: z.string().trim().max(MAX_DESCRIPTION_LENGTH).optional(),
  questions: z
    .array(questionSchema)
    .min(1, "Add at least one question")
    .max(MAX_QUESTIONS_PER_SURVEY, `At most ${MAX_QUESTIONS_PER_SURVEY} questions`),
});

export type SurveyInput = z.infer<typeof surveyInputSchema>;
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function validateSurveyInput(input: unknown): ValidationResult<SurveyInput> {
  const parsed = surveyInputSchema.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data };
  return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid survey" };
}

/** Returns a new array with the item at `from` moved to `to`. */
export function reorderQuestions<T>(items: readonly T[], from: number, to: number): T[] {
  const inRange = (i: number) => Number.isInteger(i) && i >= 0 && i < items.length;
  if (!inRange(from) || !inRange(to)) throw new RangeError("Index out of range");
  const copy = [...items];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}
