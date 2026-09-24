"use client";

import { useMemo, useState } from "react";
import { useRecorder } from "./use-recorder";
import { Waveform } from "./waveform";
import { Icon } from "@/components/survey/pv-shell";
import { getClientProvider } from "@/lib/transcription/client";
import { hasSpeech } from "@/lib/transcription/audio";
import { MAX_RECORDING_SECONDS } from "@/lib/config/limits";

type Phase = "idle" | "transcribing" | "failed" | "silent";

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/** Record button + live feedback. Calls onTranscript with the raw transcript; the parent owns editing. */
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
      <p role="alert" className="pv-note w-full">
        {recorder.error === "denied" || recorder.error === "unsupported"
          ? "Microphone access is unavailable. You can continue by typing your answer instead."
          : "Recording could not start. Please type your answer instead."}
      </p>
    );
  }

  if (recorder.state === "recording") {
    return (
      <div className="flex w-full flex-col gap-3">
        <Waveform stream={recorder.stream} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span role="status" aria-live="polite" className="text-[15px] font-medium text-[#ffb4c2]">
            Recording… {fmt(recorder.seconds)} / {fmt(MAX_RECORDING_SECONDS)}
          </span>
          <button type="button" className="pv-btn pv-btn-primary pv-btn-sm pv-mic rec" onClick={recorder.stop}>
            <Icon name="stop" /> Stop Recording
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="pv-btn pv-btn-ghost pv-btn-sm"
          disabled={phase === "transcribing"}
          onClick={() => { setPhase("idle"); void recorder.start(); }}
        >
          <Icon name="mic" /> {hasAnswer ? "Record Again" : "Record Answer"}
        </button>
        {phase === "transcribing" && <span role="status" className="pv-muted text-sm">Transcribing your voice…</span>}
      </div>
      {phase === "failed" && (
        <p role="alert" className="pv-error">We couldn&apos;t transcribe your recording. Please try again or enter your answer manually.</p>
      )}
      {phase === "silent" && (
        <p role="alert" className="pv-error">We didn&apos;t hear anything. Please check your microphone and try again, or type your answer.</p>
      )}
    </div>
  );
}
