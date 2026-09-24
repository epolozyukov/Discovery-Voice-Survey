import type { SpeechToTextProvider } from "./types";
import { MockTranscriptionProvider } from "./mock";

/** Browser-side provider: uploads the temporary Blob to our route, which holds the API key. */
export function createHttpProvider(token: string): SpeechToTextProvider {
  return {
    async transcribe(audio: Blob) {
      const form = new FormData();
      form.append("token", token);
      form.append("audio", audio, "audio");
      const res = await fetch("/api/transcription", { method: "POST", body: form });
      const json = (await res.json().catch(() => null)) as { text?: string } | null;
      if (!res.ok || typeof json?.text !== "string") throw new Error("Transcription failed");
      return json.text;
    },
  };
}

export function getClientProvider(token: string): SpeechToTextProvider {
  if (process.env.NEXT_PUBLIC_TRANSCRIPTION_PROVIDER === "mock") return new MockTranscriptionProvider();
  return createHttpProvider(token);
}
