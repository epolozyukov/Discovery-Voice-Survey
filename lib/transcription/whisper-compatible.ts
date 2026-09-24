import type { SpeechToTextProvider } from "./types";
import { extensionForMime } from "./audio";

export interface WhisperConfig { baseUrl: string; apiKey: string; model: string }

/** Works with OpenAI, Groq and self-hosted faster-whisper servers exposing /audio/transcriptions. */
export function createWhisperCompatibleProvider(cfg: WhisperConfig, fetchFn: typeof fetch = fetch): SpeechToTextProvider {
  return {
    async transcribe(audio: Blob) {
      const form = new FormData();
      form.append("file", audio, `audio.${extensionForMime(audio.type)}`);
      form.append("model", cfg.model);
      form.append("response_format", "json");
      const res = await fetchFn(`${cfg.baseUrl.replace(/\/$/, "")}/audio/transcriptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.apiKey}` },
        body: form,
      });
      // Never surface upstream bodies: they may contain keys or user content.
      if (!res.ok) throw new Error("Transcription failed");
      const json = (await res.json().catch(() => null)) as { text?: unknown } | null;
      if (typeof json?.text !== "string") throw new Error("Transcription failed");
      return json.text.trim();
    },
  };
}
