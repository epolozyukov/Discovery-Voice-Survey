"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { saveAnswerAction, submitAction } from "@/app/survey/[token]/actions";
import { MAX_ANSWER_LENGTH } from "@/lib/config/limits";
import { validateAnswerText, findMissingRequired } from "@/lib/domain/answers";
import { VoiceAnswer } from "@/components/voice/voice-answer";
import { Brand, Icon, PvSplit, RailTrack } from "./pv-shell";
import { Confetti } from "./confetti";
import type { ParticipantSession } from "@/lib/data/participant";
import type { InputMethod } from "@/types";

type Step = "welcome" | "review" | "done" | number;
type Answers = Record<string, { text: string; inputMethod: InputMethod }>;
type Mode = "voice" | "type";
interface Draft { answers: Answers; step: Step; mode?: Mode }

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
  const [mode, setMode] = useState<Mode>("voice");
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
      if (draft.mode) setMode(draft.mode);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [token, readOnly]);

  useEffect(() => {
    if (readOnly || !restored.current || step === "done") return;
    writeDraft(token, { answers, step, mode });
  }, [answers, step, mode, token, readOnly]);

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
  const title = session.survey.title;

  const ModeToggle = (
    <div className="pv-toggle" role="group" aria-label="How would you like to answer?">
      <button type="button" aria-pressed={mode === "voice"} onClick={() => setMode("voice")}><Icon name="mic" /> Voice</button>
      <button type="button" aria-pressed={mode === "type"} onClick={() => setMode("type")}><Icon name="keyboard" /> Type</button>
    </div>
  );

  /* ───────── Welcome ───────── */
  if (step === "welcome") {
    const minutes = Math.max(2, Math.round(questions.length * 0.9));
    return (
      <PvSplit
        rail={
          <>
            <div className="pv-rise"><Brand onDark /></div>
            <div className="flex flex-col gap-5">
              <p className="pv-rail-eyebrow pv-rise d1">Pre-workshop questionnaire</p>
              <h1 className="pv-rail-title pv-rise d1">{title}</h1>
              {session.survey.description && <p className="pv-rail-desc pv-rise d2">{session.survey.description}</p>}
              <div className="pv-rise d3 flex flex-wrap gap-2">
                <span className="pv-rail-chip"><Icon name="sparkle" /> {questions.length} question{questions.length === 1 ? "" : "s"}</span>
                <span className="pv-rail-chip">⏱ about {minutes} min</span>
              </div>
            </div>
          </>
        }
      >
        <div className="pv-rise flex flex-col gap-2">
          <p className="pv-eyebrow">Before you start</p>
          <h2 className="pv-display text-[clamp(30px,4vw,44px)]">Here’s how it works</h2>
          <p className="pv-muted">Welcome! It only takes a few minutes.</p>
        </div>

        <ol className="pv-how pv-rise d2">
          <li><span className="n">1</span><div><p className="font-bold">Read each question</p><p className="pv-muted text-[15px]">One at a time, in your own words. There are no wrong answers.</p></div></li>
          <li><span className="n">2</span><div><p className="font-bold">Speak or type</p><p className="pv-muted text-[15px]">Talk into your microphone and your speech becomes text you can edit, or simply type.</p></div></li>
          <li><span className="n">3</span><div><p className="font-bold">Review and submit</p><p className="pv-muted text-[15px]">Answers are saved as you go. Check everything before you send it.</p></div></li>
        </ol>

        <div className="pv-rise d3 flex flex-col gap-3">
          <p className="font-bold">How would you like to answer?</p>
          <div className="pv-modes" role="group" aria-label="How would you like to answer?">
            <button type="button" className="pv-mode" aria-pressed={mode === "voice"} onClick={() => setMode("voice")}>
              <span className="t"><Icon name="mic" /> Voice</span>
              <span className="d">Speak your answers</span>
            </button>
            <button type="button" className="pv-mode" aria-pressed={mode === "type"} onClick={() => setMode("type")}>
              <span className="t"><Icon name="keyboard" /> Type</span>
              <span className="d">Write them out</span>
            </button>
          </div>
        </div>

        <div className="pv-rise d4 flex flex-col gap-5">
          <button className="pv-btn pv-btn-primary self-start px-10 text-lg" onClick={() => setStep(0)}>
            Start <Icon name="arrow" />
          </button>
          <p className="pv-privacy">
            <span className="mt-0.5 flex-none"><Icon name="lock" /></span>
            <span>Your voice recording is turned into text and then discarded. Only the text of your answers is saved. The recording itself is never stored.</span>
          </p>
        </div>
      </PvSplit>
    );
  }

  /* ───────── Done ───────── */
  if (step === "done") {
    return (
      <PvSplit
        rail={
          <>
            <Brand onDark />
            <div className="flex flex-col gap-4">
              <svg className="pv-check" viewBox="0 0 120 120" fill="none" aria-hidden="true">
                <circle cx="60" cy="60" r="54" stroke="#8fe0d5" strokeWidth="6" strokeLinecap="round" transform="rotate(-90 60 60)" />
                <path d="M36 62l16 16 32-34" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="pv-rail-eyebrow">Submitted</p>
              <p className="pv-rail-title">{title}</p>
            </div>
          </>
        }
      >
        <Confetti />
        <h1 className="pv-display pv-grad pv-rise d1 text-[clamp(44px,7vw,84px)]">Thank you!</h1>
        <p className="pv-rise d2 text-xl font-medium">Your responses have been submitted successfully.</p>
        <p className="pv-muted pv-rise d3 max-w-lg text-lg">
          The Discovery team will use your input to prepare for the upcoming workshop. You can now close this window.
        </p>
      </PvSplit>
    );
  }

  /* ───────── Review ───────── */
  if (step === "review") {
    return (
      <PvSplit
        orb="small"
        rail={
          <>
            <Brand onDark />
            <div className="pv-rail-desktop"><p className="pv-rail-eyebrow mb-4">Your progress</p><RailTrack total={questions.length} current={questions.length} /></div>
            <p className="text-sm font-semibold text-white">{title}</p>
          </>
        }
      >
        <div className={`${enter} flex flex-col gap-7`}>
          <div className="flex flex-col gap-2">
            <p className="pv-eyebrow">Last step</p>
            <h1 className="pv-display pv-grad text-[clamp(34px,5vw,56px)]">Review your answers</h1>
            <p className="pv-muted">Take a last look. You can edit any answer before submitting.</p>
          </div>
          <ol className="flex flex-col gap-4">
            {questions.map((q, i) => {
              const text = answers[q.id]?.text ?? "";
              return (
                <li key={q.id} className="pv-glass flex gap-4 p-5" style={{ animation: `pv-rise .6s ${0.05 * i}s both cubic-bezier(.2,.8,.2,1)` }}>
                  <span className="pv-num" aria-hidden="true">{i + 1}</span>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <p className="font-semibold leading-snug">{i + 1}. {q.text}{q.required && <span aria-label="required" className="pv-accent"> *</span>}</p>
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
      </PvSplit>
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
    <PvSplit
      orb="small"
      rail={
        <>
          <Brand onDark />
          <div className="pv-rail-desktop"><p className="pv-rail-eyebrow mb-4">Your progress</p><RailTrack total={questions.length} current={step} /></div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="pv-rail-desktop text-sm text-[rgba(230,247,244,.7)]">Your answers are saved as you go.</p>
          </div>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="pv-muted text-sm font-semibold tabular-nums">Question {step + 1} of {questions.length}</p>
          {ModeToggle}
        </div>
        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progress" className="pv-progress">
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div key={String(step)} className={`${enter} flex flex-col gap-6`}>
        <h1 className="pv-display pv-question">
          {q.text}
          {q.required && <span aria-label="required" className="pv-accent"> *</span>}
        </h1>

        {mode === "voice" && (
          <VoiceAnswer token={token} hasAnswer={answer?.inputMethod === "voice"} onTranscript={(t) => setTranscript(q.id, t)} />
        )}

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
          <div className="flex justify-end px-5 pb-3">
            <span className="pv-muted text-xs tabular-nums" aria-live="off">{len.toLocaleString()} / {MAX_ANSWER_LENGTH.toLocaleString()}</span>
          </div>
        </div>

        {answer?.inputMethod === "voice" && (
          <p className="pv-note">✨ Transcribed from your recording. Please check and edit the text before continuing.</p>
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
    </PvSplit>
  );
}
