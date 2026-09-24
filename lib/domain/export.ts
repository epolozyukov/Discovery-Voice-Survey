import type { InputMethod } from "@/types";

export interface ExportQuestion { id: string; order: number; text: string }
export interface ExportParticipant {
  label: string;
  completedAt: string;
  answers: { questionId: string; answer: string; inputMethod: InputMethod }[];
}

const displayId = (index: number) => `Q${String(index + 1).padStart(2, "0")}`;

/** Prefix cells that spreadsheets would evaluate as formulas. */
function neutralise(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function cell(value: string): string {
  const safe = neutralise(value);
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function sortedQuestions(questions: readonly ExportQuestion[]) {
  return [...questions].sort((a, b) => a.order - b.order);
}

export function toCsv(questions: readonly ExportQuestion[], participants: readonly ExportParticipant[]): string {
  const ordered = sortedQuestions(questions);
  const rows = ["participant,questionId,question,answer,inputMethod,completedAt"];
  for (const p of participants) {
    ordered.forEach((q, i) => {
      const a = p.answers.find((x) => x.questionId === q.id);
      if (!a) return;
      rows.push(
        [p.label, displayId(i), q.text, a.answer, a.inputMethod, p.completedAt].map(cell).join(","),
      );
    });
  }
  return rows.join("\r\n");
}

export function toJson(questions: readonly ExportQuestion[], participants: readonly ExportParticipant[]) {
  const ordered = sortedQuestions(questions);
  return participants.map((p) => ({
    participantId: p.label,
    completedAt: p.completedAt,
    answers: ordered.flatMap((q, i) => {
      const a = p.answers.find((x) => x.questionId === q.id);
      return a
        ? [{ questionId: displayId(i), question: q.text, answer: a.answer, inputMethod: a.inputMethod }]
        : [];
    }),
  }));
}
