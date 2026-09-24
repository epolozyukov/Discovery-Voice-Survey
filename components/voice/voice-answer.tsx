"use client";

import { useMemo, useState } from "react";
import { useRecorder } from "./use-recorder";
import { getClientProvider } from "@/lib/transcription/client";
import { MAX_RECORDING_SECONDS } from "@/lib/config/limits";
import { btnPrimary, btnSecondary } from "@/components/ui/styles";

type Phase = "idle" | "transcribing" | "failed";

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/** Record button + status. Calls onTranscript with the raw transcript; the parent owns editing. */
export function VoiceAnswer({ token, hasAnswer, onTranscript }: { token: string; hasAnswer: boolean; onTranscript: (text: string) => void }) {
  const provider = useMemo(() => getClientProvider(token), [token]);
  const [phase, setPhase] = useState<Phase>("idle");
  const recorder = useRecorder(async (audio) => {
    setPhase("transcribing");
    try {
      onTranscript(await provider.transcribe(audio));
      setPhase("idle");
    } catch {
      setPhase("failed");
    }
  });

  if (recorder.error) {
    return (
      <p role="alert" className="rounded-md border border-gray-300 p-3 text-sm">
        {recorder.error === "denied" || recorder.error === "unsupported"
          ? "Microphone access is unavailable. You can continue by typing your answer instead."
          : "Recording could not start. Please type your answer instead."}
      </p>
    );
  }

  if (recorder.state === "recording") {
    return (
      <div className="flex items-center gap-4" role="status" aria-live="polite">
        <span className="font-medium text-red-700">● Recording… {fmt(recorder.seconds)} / {fmt(MAX_RECORDING_SECONDS)}</span>
        <button type="button" className={btnPrimary} onClick={recorder.stop}>Stop Recording</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <button type="button" className={btnSecondary} disabled={phase === "transcribing"} onClick={() => { setPhase("idle"); void recorder.start(); }}>
          🎙 {hasAnswer ? "Record Again" : "Record Answer"}
        </button>
        {phase === "transcribing" && <span role="status">Transcribing…</span>}
      </div>
      {phase === "failed" && (
        <p role="alert" className="text-sm text-red-700">We couldn&apos;t transcribe your recording. Please try again or enter your answer manually.</p>
      )}
      {hasAnswer && <p className="text-sm text-gray-600">Recording again replaces the current answer.</p>}
    </div>
  );
}
