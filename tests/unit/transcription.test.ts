import { describe, expect, it, vi } from "vitest";
import { createWhisperCompatibleProvider } from "@/lib/transcription/whisper-compatible";
import { MockTranscriptionProvider } from "@/lib/transcription/mock";
import { pickRecorderMimeType, extensionForMime } from "@/lib/transcription/audio";

const blob = new Blob(["abc"], { type: "audio/webm" });

describe("whisper-compatible provider", () => {
  const cfg = { baseUrl: "https://api.example.com/v1", apiKey: "secret", model: "whisper-1" };

  it("posts audio with bearer key and returns trimmed text", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify({ text: "  hello world " }), { status: 200 }));
    const text = await createWhisperCompatibleProvider(cfg, fetchFn).transcribe(blob);
    expect(text).toBe("hello world");
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://api.example.com/v1/audio/transcriptions");
    expect(init.headers.Authorization).toBe("Bearer secret");
    expect((init.body as FormData).get("model")).toBe("whisper-1");
  });
  it("throws a generic error on upstream failure without leaking the body", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("key sk-123 invalid", { status: 401 }));
    await expect(createWhisperCompatibleProvider(cfg, fetchFn).transcribe(blob)).rejects.toThrow(/^Transcription failed$/);
  });
  it("throws on malformed response", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    await expect(createWhisperCompatibleProvider(cfg, fetchFn).transcribe(blob)).rejects.toThrow("Transcription failed");
  });
});

describe("mock provider", () => {
  it("returns queued transcripts then can fail", async () => {
    const p = new MockTranscriptionProvider(["one", new Error("boom")]);
    expect(await p.transcribe(blob)).toBe("one");
    await expect(p.transcribe(blob)).rejects.toThrow("boom");
  });
});

describe("audio helpers", () => {
  it("picks the first supported mime type", () => {
    expect(pickRecorderMimeType((t) => t === "audio/mp4")).toBe("audio/mp4");
    expect(pickRecorderMimeType(() => false)).toBeUndefined();
  });
  it("maps mime to file extension", () => {
    expect(extensionForMime("audio/webm;codecs=opus")).toBe("webm");
    expect(extensionForMime("audio/mp4")).toBe("mp4");
    expect(extensionForMime("audio/ogg")).toBe("ogg");
    expect(extensionForMime("application/x")).toBe("webm");
  });
});
