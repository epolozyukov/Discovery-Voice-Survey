"use client";

import { useMemo, useState } from "react";
import { useRecorder } from "./use-recorder";
import { Orb } from "./orb";
import { Icon } from "@/components/survey/pv-shell";
import { getClientProvider } from "@/lib/transcription/client";
import { hasSpeech } from "@/lib/transcription/audio";
import { MAX_RECORDING_SECONDS } from "@/lib/config/limits";

type Phase = "idle" | "transcribing" | "failed" | "silent";

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/** Orb + record controls. Calls onTranscript with the raw transcript; the parent owns editing. */
export function VoiceAnswer({ token, hasAnswer, onTranscript }: { token: string; hasAnswer: boolean; onTranscript: (text: string) => void }) {
  const provider = useMemo(() => getClientProvider(token), [token]);
  const [phase, setPhase] = useState<Phase>("idle");
  const recorder = useRecorder(async (audio) => {
    setPhase("transcribing");
    try {
      const text = await provider.transcribe(audio);
      if (!hasSpeech(text)) return setPhase("silent");
      onTranscript(text);
      setPhase("idle");
    } catch {
      setPhase("failed");
    }
  });

  if (recorder.error) {
    return (
      <p role="alert" className="pv-note w-full text-center">
        {recorder.error === "denied" || recorder.error === "unsupported"
          ? "Microphone access is unavailable. You can continue by typing your answer instead."
          : "Recording could not start. Please type your answer instead."}
      </p>
    );
  }

  const recording = recorder.state === "recording";
  const working = phase === "transcribing";

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <Orb size={116} state={recording ? "recording" : working ? "working" : "idle"} stream={recorder.stream} />

      {recording ? (
        <>
          <span role="status" aria-live="polite" className="text-[15px] font-semibold text-[#c0384a]">
            Recording… {fmt(recorder.seconds)} / {fmt(MAX_RECORDING_SECONDS)}
          </span>
          <button type="button" className="pv-btn pv-btn-rec pv-btn-sm" onClick={recorder.stop}>
            <Icon name="stop" /> Stop Recording
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            className={`pv-btn pv-btn-sm ${hasAnswer ? "pv-btn-ghost" : "pv-btn-primary"}`}
            disabled={working}
            onClick={() => { setPhase("idle"); void recorder.start(); }}
          >
            <Icon name="mic" /> {hasAnswer ? "Record Again" : "Record Answer"}
          </button>
          {working && <span role="status" className="pv-muted text-sm">Turning your voice into text…</span>}
          {!working && !hasAnswer && phase === "idle" && <span className="pv-muted text-sm">Tap the button and speak. You can edit the text afterwards.</span>}
        </>
      )}

      {phase === "failed" && (
        <p role="alert" className="pv-error">We couldn&apos;t transcribe your recording. Please try again or enter your answer manually.</p>
      )}
      {phase === "silent" && (
        <p role="alert" className="pv-error">We didn&apos;t hear anything. Please check your microphone and try again, or type your answer.</p>
      )}
    </div>
  );
}
