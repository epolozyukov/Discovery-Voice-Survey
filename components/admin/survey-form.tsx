"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSurvey } from "@/app/admin/actions";
import { reorderQuestions } from "@/lib/domain/survey";
import { btnPrimary, btnSecondary, btnDanger, input } from "@/components/ui/styles";

interface Props {
  surveyId: string | null;
  initial: { title: string; description: string; questions: { text: string; required: boolean }[] };
}

export function SurveyForm({ surveyId, initial }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [questions, setQuestions] = useState(initial.questions.length ? initial.questions : [{ text: "", required: true }]);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const update = (i: number, patch: Partial<{ text: string; required: boolean }>) =>
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));

  const submit = () =>
    start(async () => {
      setError(undefined);
      const res = await saveSurvey(surveyId, { title, description, questions });
      if (res.error) return setError(res.error);
      router.push(`/admin/surveys/${res.id}`);
      router.refresh();
    });

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex flex-col gap-6">
      <div className="ad-card flex flex-col gap-5 p-6">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required className={input} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Description (shown on the welcome screen)
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={3} className={input} />
      </label>
      </div>
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-lg font-semibold">Questions</legend>
        {questions.map((q, i) => (
          <div key={i} className="ad-card flex flex-col gap-3 p-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">Question {i + 1}</span>
              <textarea value={q.text} onChange={(e) => update(i, { text: e.target.value })} maxLength={1000} rows={2} className={input} />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <label className="mr-auto flex items-center gap-2 text-sm">
                <input type="checkbox" checked={q.required} onChange={(e) => update(i, { required: e.target.checked })} /> Required
              </label>
              <button type="button" className={btnSecondary} disabled={i === 0} aria-label={`Move question ${i + 1} up`} onClick={() => setQuestions((qs) => reorderQuestions(qs, i, i - 1))}>↑</button>
              <button type="button" className={btnSecondary} disabled={i === questions.length - 1} aria-label={`Move question ${i + 1} down`} onClick={() => setQuestions((qs) => reorderQuestions(qs, i, i + 1))}>↓</button>
              <button type="button" className={btnDanger} aria-label={`Delete question ${i + 1}`} onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))}>Delete</button>
            </div>
          </div>
        ))}
        <button type="button" className={`${btnSecondary} self-start`} onClick={() => setQuestions((qs) => [...qs, { text: "", required: true }])}>+ Add question</button>
      </fieldset>
      {error && <p role="alert" className="rounded-lg bg-ad-bad-soft px-3 py-2 text-sm text-ad-bad">{error}</p>}
      <button type="submit" disabled={pending} className={`${btnPrimary} self-start`}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}
