import type { ValidationResult } from "./survey";

export function validateAnswerText(
  raw: string,
  opts: { required: boolean; maxLength: number },
): ValidationResult<string> {
  const value = raw.trim();
  if (value.length > opts.maxLength) {
    return { ok: false, error: `Answer must be at most ${opts.maxLength} characters` };
  }
  if (opts.required && value.length === 0) {
    return { ok: false, error: "Please provide an answer before continuing." };
  }
  return { ok: true, value };
}

export function findMissingRequired(
  questions: readonly { id: string; required: boolean }[],
  answers: Readonly<Record<string, string | undefined>>,
): string[] {
  return questions
    .filter((q) => q.required && !(answers[q.id] ?? "").trim())
    .map((q) => q.id);
}
