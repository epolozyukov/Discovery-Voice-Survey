"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { saveAnswerAction, submitAction } from "@/app/survey/[token]/actions";
import { MAX_ANSWER_LENGTH } from "@/lib/config/limits";
import { validateAnswerText, findMissingRequired } from "@/lib/domain/answers";
import { btnPrimary, btnSecondary, input } from "@/components/ui/styles";
import type { ParticipantSession } from "@/lib/data/participant";
import type { InputMethod } from "@/types";

type Step = "welcome" | "review" | "done" | number;
type Answers = Record<string, { text: string; inputMethod: InputMethod }>;
interface Draft { answers: Answers; step: Step }

const draftKey = (token: string) => `dvs:draft:${token}`;

function readDraft(token: string): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(token));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}
function writeDraft(token: string, draft: Draft) {
  try { localStorage.setItem(draftKey(token), JSON.stringify(draft)); } catch { /* storage unavailable */ }
}
function clearDraft(token: string) {
  try { localStorage.removeItem(draftKey(token)); } catch { /* storage unavailable */ }
}

export function SurveyFlow({ token, readOnly, session }: { token: string; readOnly: boolean; session: ParticipantSession }) {
  const { questions } = session;
  const [answers, setAnswers] = useState<Answers>(session.answers);
  const [step, setStep] = useState<Step>(readOnly ? "done" : "welcome");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const restored = useRef(false);

  // Restore an unfinished local draft after refresh (server answers stay the base).
  useEffect(() => {
    if (readOnly || restored.current) return;
    restored.current = true;
    const draft = readDraft(token);
    if (draft) {
      /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from localStorage */
      setAnswers((a) => ({ ...a, ...draft.answers }));
      if (draft.step !== "done") setStep(draft.step);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [token, readOnly]);

  useEffect(() => {
    if (readOnly || !restored.current || step === "done") return;
    writeDraft(token, { answers, step });
  }, [answers, step, token, readOnly]);

  const setText = (id: string, text: string) =>
    setAnswers((a) => ({ ...a, [id]: { text, inputMethod: a[id]?.inputMethod ?? "text" } }));

  /** Persists one answer; on failure the text stays in the local draft so the user can retry. */
  const persist = async (index: number): Promise<boolean> => {
    const q = questions[index];
    const a = answers[q.id];
    if (!a) return true;
    const res = await saveAnswerAction(token, q.id, a.text, a.inputMethod);
    if (!res.ok) { setError(res.error); return false; }
    return true;
  };

  const go = (next: Step, from?: number, validate = false) =>
    start(async () => {
      setError(undefined);
      if (from !== undefined) {
        const q = questions[from];
        if (validate) {
          const v = validateAnswerText(answers[q.id]?.text ?? "", { required: q.required, maxLength: MAX_ANSWER_LENGTH });
          if (!v.ok) return setError(v.error);
        }
        if (!(await persist(from))) return;
      }
      setStep(next);
    });

  const submit = () =>
    start(async () => {
      setError(undefined);
      const missing = findMissingRequired(questions, Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v.text])));
      if (missing.length) return setError("Please answer all required questions before submitting.");
      for (let i = 0; i < questions.length; i++) if (!(await persist(i))) return;
      const res = await submitAction(token);
      if (!res.ok) return setError(res.error);
      clearDraft(token);
      setStep("done");
    });

  const shell = "mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10";

  if (step === "welcome") {
    return (
      <main className={shell}>
        <h1 className="text-3xl font-semibold">{session.survey.title}</h1>
        <p className="text-lg">Welcome!</p>
        {session.survey.description && <p className="whitespace-pre-wrap">{session.survey.description}</p>}
        <p>You will be asked {questions.length} question{questions.length === 1 ? "" : "s"}. Your answers are saved as you go, and you can review everything before submitting.</p>
        <button className={`${btnPrimary} self-start`} onClick={() => setStep(0)}>Start</button>
      </main>
    );
  }

  if (step === "done") {
    return (
      <main className={shell}>
        <h1 className="text-3xl font-semibold">Thank you!</h1>
        <p>Your responses have been submitted successfully.</p>
        <p>The Discovery team will use your input to prepare for the upcoming workshop. You can now close this window.</p>
      </main>
    );
  }

  if (step === "review") {
    return (
      <main className={shell}>
        <h1 className="text-2xl font-semibold">Review your answers</h1>
        <ol className="flex flex-col gap-5">
          {questions.map((q, i) => (
            <li key={q.id} className="flex flex-col gap-1">
              <p className="font-medium">{i + 1}. {q.text}{q.required && <span aria-label="required"> *</span>}</p>
              <p className="whitespace-pre-wrap rounded-md border border-gray-300 p-3">{answers[q.id]?.text || <span className="text-gray-500">No answer</span>}</p>
              <button className={`${btnSecondary} self-start`} onClick={() => setStep(i)}>Edit</button>
            </li>
          ))}
        </ol>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <div className="flex justify-between">
          <button className={btnSecondary} onClick={() => setStep(questions.length - 1)}>← Back</button>
          <button className={btnPrimary} disabled={pending} onClick={submit}>{pending ? "Submitting…" : "Submit Interview"}</button>
        </div>
      </main>
    );
  }

  const q = questions[step];
  const isLast = step === questions.length - 1;
  const pct = Math.round(((step + 1) / questions.length) * 100);
  return (
    <main className={shell}>
      <div>
        <p className="mb-1 text-sm font-medium">Question {step + 1} of {questions.length}</p>
        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progress" className="h-2 rounded bg-gray-200">
          <div className="h-2 rounded bg-blue-700" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <h1 className="text-xl font-semibold">{q.text}{q.required && <span aria-label="required"> *</span>}</h1>
      <label className="flex flex-col gap-1">
        <span className="sr-only">Your answer</span>
        <textarea
          className={input}
          rows={8}
          maxLength={MAX_ANSWER_LENGTH}
          placeholder="Type your answer..."
          value={answers[q.id]?.text ?? ""}
          onChange={(e) => setText(q.id, e.target.value)}
        />
      </label>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <div className="flex justify-between">
        <button className={btnSecondary} disabled={pending || step === 0} onClick={() => go(step - 1, step)}>← Back</button>
        <button className={btnPrimary} disabled={pending} onClick={() => go(isLast ? "review" : step + 1, step, true)}>{isLast ? "Review" : "Next →"}</button>
      </div>
    </main>
  );
}
