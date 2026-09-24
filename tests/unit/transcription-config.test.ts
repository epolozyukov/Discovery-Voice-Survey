import { describe, expect, it } from "vitest";
import { getTranscriptionConfig } from "@/lib/transcription/config";

const groq = { TRANSCRIPTION_BASE_URL: "https://api.groq.com/openai/v1", TRANSCRIPTION_API_KEY: "gsk_abc" };

describe("getTranscriptionConfig", () => {
  it("returns null when url or key is missing/blank", () => {
    expect(getTranscriptionConfig({})).toBeNull();
    expect(getTranscriptionConfig({ ...groq, TRANSCRIPTION_API_KEY: "   " })).toBeNull();
    expect(getTranscriptionConfig({ ...groq, TRANSCRIPTION_BASE_URL: "" })).toBeNull();
  });
  it("trims whitespace/newlines pasted into env vars", () => {
    const c = getTranscriptionConfig({ TRANSCRIPTION_BASE_URL: " https://api.groq.com/openai/v1/ \n", TRANSCRIPTION_API_KEY: "gsk_abc \n" });
    expect(c).toMatchObject({ baseUrl: "https://api.groq.com/openai/v1", apiKey: "gsk_abc" });
  });
  it("rejects non-https urls except localhost", () => {
    expect(getTranscriptionConfig({ ...groq, TRANSCRIPTION_BASE_URL: "http://api.groq.com/openai/v1" })).toBeNull();
    expect(getTranscriptionConfig({ ...groq, TRANSCRIPTION_BASE_URL: "http://localhost:8000/v1" })).not.toBeNull();
    expect(getTranscriptionConfig({ ...groq, TRANSCRIPTION_BASE_URL: "not a url" })).toBeNull();
  });
  it("defaults the model per provider", () => {
    expect(getTranscriptionConfig(groq)?.model).toBe("whisper-large-v3-turbo");
    expect(getTranscriptionConfig({ TRANSCRIPTION_BASE_URL: "https://api.openai.com/v1", TRANSCRIPTION_API_KEY: "k" })?.model).toBe("whisper-1");
  });
  it("corrects the OpenAI-only 'whisper-1' model when pointed at Groq (regression: live 502)", () => {
    expect(getTranscriptionConfig({ ...groq, TRANSCRIPTION_MODEL: "whisper-1" })?.model).toBe("whisper-large-v3-turbo");
  });
  it("respects an explicit valid model", () => {
    expect(getTranscriptionConfig({ ...groq, TRANSCRIPTION_MODEL: "whisper-large-v3" })?.model).toBe("whisper-large-v3");
  });
});
