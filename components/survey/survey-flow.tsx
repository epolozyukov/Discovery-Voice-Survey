"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { saveAnswerAction, submitAction } from "@/app/survey/[token]/actions";
import { MAX_ANSWER_LENGTH } from "@/lib/config/limits";
import { validateAnswerText, findMissingRequired } from "@/lib/domain/answers";
import { VoiceAnswer } from "@/components/voice/voice-answer";
import { Brand, Icon, PvShell } from "./pv-shell";
import { Confetti } from "./confetti";
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
  const [step, setStepRaw] = useState<Step>(readOnly ? "done" : "welcome");
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const restored = useRef(false);

  const setStep = (next: Step, direction: "fwd" | "back" = "fwd") => {
    setDir(direction);
    setStepRaw(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Restore an unfinished local draft after refresh (server answers stay the base).
  useEffect(() => {
    if (readOnly || restored.current) return;
    restored.current = true;
    const draft = readDraft(token);
    if (draft) {
      /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from localStorage */
      setAnswers((a) => ({ ...a, ...draft.answers }));
      if (draft.step !== "done") setStepRaw(draft.step);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [token, readOnly]);

  useEffect(() => {
    if (readOnly || !restored.current || step === "done") return;
    writeDraft(token, { answers, step });
  }, [answers, step, token, readOnly]);

  /** Typing edits keep the original input method, so an edited transcript stays "voice". */
  const setText = (id: string, text: string) =>
    setAnswers((a) => ({ ...a, [id]: { text, inputMethod: a[id]?.inputMethod ?? "text" } }));
  const setTranscript = (id: string, text: string) =>
    setAnswers((a) => ({ ...a, [id]: { text, inputMethod: "voice" } }));

  /** Persists one answer; on failure the text stays in the local draft so the user can retry. */
  const persist = async (index: number): Promise<boolean> => {
    const q = questions[index];
    const a = answers[q.id];
    if (!a) return true;
    const res = await saveAnswerAction(token, q.id, a.text, a.inputMethod);
    if (!res.ok) { setError(res.error); return false; }
    return true;
  };

  const go = (next: Step, from: number, validate: boolean, direction: "fwd" | "back") =>
    start(async () => {
      setError(undefined);
      const q = questions[from];
      if (validate) {
        const v = validateAnswerText(answers[q.id]?.text ?? "", { required: q.required, maxLength: MAX_ANSWER_LENGTH });
        if (!v.ok) return setError(v.error);
      }
      if (!(await persist(from))) return;
      setStep(next, direction);
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

  const enter = dir === "fwd" ? "pv-enter-fwd" : "pv-enter-back";

  /* ───────── Welcome ───────── */
  if (step === "welcome") {
    const minutes = Math.max(2, Math.round(questions.length * 0.9));
    return (
      <PvShell>
        <div className="pv-rise"><Brand /></div>
        <div className="flex flex-col gap-5">
          <p className="pv-eyebrow pv-rise d1">Pre-workshop questionnaire</p>
          <h1 className="pv-display pv-grad pv-rise d1 text-[clamp(38px,7vw,76px)]">{session.survey.title}</h1>
          <p className="pv-rise d2 text-[clamp(17px,2vw,21px)] leading-relaxed">Welcome!</p>
          {session.survey.description && (
            <p className="pv-muted pv-rise d2 max-w-2xl whitespace-pre-wrap text-[clamp(16px,1.8vw,19px)] leading-relaxed">{session.survey.description}</p>
          )}
        </div>
        <div className="pv-rise d3 flex flex-wrap gap-3">
          <span className="pv-chip"><Icon name="sparkle" /> {questions.length} question{questions.length === 1 ? "" : "s"}</span>
          <span className="pv-chip">⏱ about {minutes} min</span>
          <span className="pv-chip"><Icon name="mic" /> Type or speak</span>
        </div>
        <p className="pv-muted pv-rise d3 max-w-xl text-[15px]">
          Your answers are saved as you go, and you can review and edit everything before you submit.
        </p>
        <div className="pv-rise d4">
          <button className="pv-btn pv-btn-primary text-lg" onClick={() => setStep(0)}>
            Start <Icon name="arrow" />
          </button>
        </div>
      </PvShell>
    );
  }

  /* ───────── Done ───────── */
  if (step === "done") {
    return (
      <PvShell>
        <Confetti />
        <div className="flex flex-col items-center gap-6 text-center">
          <svg className="pv-check" viewBox="0 0 120 120" fill="none" aria-hidden="true">
            <circle cx="60" cy="60" r="54" stroke="url(#g)" strokeWidth="5" strokeLinecap="round" transform="rotate(-90 60 60)" />
            <path d="M36 62l16 16 32-34" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            <defs><linearGradient id="g" x1="0" y1="0" x2="120" y2="120"><stop stopColor="#7c5cff" /><stop offset="1" stopColor="#22d3ee" /></linearGradient></defs>
          </svg>
          <h1 className="pv-display pv-grad pv-rise d2 text-[clamp(40px,8vw,84px)]">Thank you!</h1>
          <p className="pv-rise d3 max-w-lg text-lg">Your responses have been submitted successfully.</p>
          <p className="pv-muted pv-rise d4 max-w-lg">
            The Discovery team will use your input to prepare for the upcoming workshop. You can now close this window.
          </p>
        </div>
      </PvShell>
    );
  }

  /* ───────── Review ───────── */
  if (step === "review") {
    return (
      <PvShell wide>
        <div className={`${enter} flex flex-col gap-8`}>
          <div className="flex flex-col gap-3">
            <Brand />
            <h1 className="pv-display pv-grad text-[clamp(34px,5.5vw,60px)]">Review your answers</h1>
            <p className="pv-muted">Take a last look. You can edit any answer before submitting.</p>
          </div>
          <ol className="flex flex-col gap-4">
            {questions.map((q, i) => {
              const text = answers[q.id]?.text ?? "";
              return (
                <li key={q.id} className="pv-glass flex gap-4 p-5 sm:p-6" style={{ animation: `pv-rise .6s ${0.05 * i}s both cubic-bezier(.2,.8,.2,1)` }}>
                  <span className="pv-num" aria-hidden="true">{i + 1}</span>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <p className="font-semibold leading-snug">{i + 1}. {q.text}{q.required && <span aria-label="required" className="text-[#a99bff]"> *</span>}</p>
                    <p className={`whitespace-pre-wrap break-words ${text ? "" : "pv-muted italic"}`}>{text || (q.required ? "Needs an answer" : "No answer")}</p>
                    <button className="pv-btn pv-btn-ghost pv-btn-sm self-start" onClick={() => setStep(i, "back")}>
                      <Icon name="pencil" /> Edit
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
          {error && <p role="alert" className="pv-error">{error}</p>}
          <div className="pv-sticky pv-glass flex items-center justify-between gap-3 p-3">
            <button className="pv-btn pv-btn-ghost" onClick={() => setStep(questions.length - 1, "back")}><Icon name="back" /> Back</button>
            <button className="pv-btn pv-btn-primary" disabled={pending} onClick={submit}>{pending ? "Submitting…" : "Submit Interview"}</button>
          </div>
        </div>
      </PvShell>
    );
  }

  /* ───────── Question ───────── */
  const q = questions[step];
  const isLast = step === questions.length - 1;
  const pct = Math.round(((step + 1) / questions.length) * 100);
  const answer = answers[q.id];
  const len = answer?.text.length ?? 0;
  const next = () => go(isLast ? "review" : step + 1, step, true, "fwd");

  return (
    <PvShell>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Brand />
          <p className="pv-muted text-sm font-medium tabular-nums">Question {step + 1} of {questions.length}</p>
        </div>
        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progress" className="pv-progress">
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div key={String(step)} className={`${enter} flex flex-col gap-7`}>
        <h1 className="pv-display pv-question">
          {q.text}
          {q.required && <span aria-label="required" className="text-[#a99bff]"> *</span>}
        </h1>

        <div className="pv-glass pv-answer">
          <label>
            <span className="sr-only">Your answer</span>
            <textarea
              className="pv-textarea"
              maxLength={MAX_ANSWER_LENGTH}
              placeholder="Type your answer..."
              value={answer?.text ?? ""}
              onChange={(e) => setText(q.id, e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !pending) next(); }}
            />
          </label>
          <div className="flex flex-wrap items-end justify-between gap-3 px-5 pb-4 pt-2">
            <VoiceAnswer token={token} hasAnswer={answer?.inputMethod === "voice"} onTranscript={(t) => setTranscript(q.id, t)} />
            <span className="pv-muted ml-auto text-xs tabular-nums" aria-live="off">{len.toLocaleString()} / {MAX_ANSWER_LENGTH.toLocaleString()}</span>
          </div>
        </div>

        {answer?.inputMethod === "voice" && (
          <p className="pv-note">✨ Transcribed from your recording. Please check and edit the text above before continuing.</p>
        )}
        {error && <p role="alert" className="pv-error">{error}</p>}

        <div className="flex items-center justify-between gap-3">
          <button className="pv-btn pv-btn-ghost" disabled={pending || step === 0} onClick={() => go(step - 1, step, false, "back")}>
            <Icon name="back" /> Back
          </button>
          <div className="flex items-center gap-4">
            <span className="pv-muted hidden text-xs sm:inline">Ctrl / ⌘ + Enter</span>
            <button className="pv-btn pv-btn-primary" disabled={pending} onClick={next}>
              {isLast ? "Review" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </PvShell>
  );
}
