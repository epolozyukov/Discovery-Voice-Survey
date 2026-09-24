"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AUDIO_BITS_PER_SECOND, pickRecorderMimeType } from "@/lib/transcription/audio";
import { MAX_RECORDING_SECONDS } from "@/lib/config/limits";

export type RecorderState = "idle" | "recording";
export type RecorderError = "unsupported" | "denied" | "failed";

export function useRecorder(onComplete: (audio: Blob) => void) {
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<RecorderError>();
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunks = useRef<Blob[]>([]);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; });

  const cleanup = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);

  const stop = useCallback(() => {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }, []);

  const start = useCallback(async () => {
    setError(undefined);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) return setError("unsupported");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return setError("denied");
    }
    try {
      const mimeType = pickRecorderMimeType((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(stream.current, { mimeType, audioBitsPerSecond: AUDIO_BITS_PER_SECOND });
      chunks.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: rec.mimeType || mimeType || "audio/webm" });
        chunks.current = [];
        cleanup();
        setState("idle");
        onCompleteRef.current(blob); // Blob lives only in memory; discarded after transcription.
      };
      rec.start();
      recorder.current = rec;
      setSeconds(0);
      setState("recording");
      timer.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_RECORDING_SECONDS) stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      cleanup();
      setError("failed");
    }
  }, [cleanup, stop]);

  useEffect(() => () => {
    if (recorder.current?.state === "recording") {
      recorder.current.onstop = null;
      recorder.current.stop();
    }
    cleanup();
  }, [cleanup]);

  return { state, seconds, error, start, stop };
}
