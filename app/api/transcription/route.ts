import { NextResponse, type NextRequest } from "next/server";
import { canParticipantAnswer } from "@/lib/data/participant";
import { MAX_AUDIO_BYTES } from "@/lib/transcription/audio";
import { createWhisperCompatibleProvider } from "@/lib/transcription/whisper-compatible";

// Best-effort per-instance limiter; use a shared store (e.g. Upstash) for strict limits on serverless.
const hits = new Map<string, number[]>();
const LIMIT = 20;
const WINDOW_MS = 60_000;
function limited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > LIMIT;
}

const fail = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  const baseUrl = process.env.TRANSCRIPTION_BASE_URL;
  const apiKey = process.env.TRANSCRIPTION_API_KEY;
  if (!baseUrl || !apiKey) return fail(503, "Transcription is not available.");

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_AUDIO_BYTES + 10_000) return fail(413, "Recording too large.");

  const form = await request.formData().catch(() => null);
  const token = form?.get("token");
  const audio = form?.get("audio");
  if (typeof token !== "string" || !(audio instanceof Blob)) return fail(400, "Invalid request.");
  if (!audio.type.startsWith("audio/") || audio.size === 0 || audio.size > MAX_AUDIO_BYTES) return fail(400, "Invalid audio.");

  if (!(await canParticipantAnswer(token))) return fail(403, "Not allowed.");
  if (limited(token)) return fail(429, "Too many requests.");

  try {
    const provider = createWhisperCompatibleProvider({ baseUrl, apiKey, model: process.env.TRANSCRIPTION_MODEL ?? "whisper-1" });
    const text = await provider.transcribe(audio);
    return NextResponse.json({ text }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // Deliberately no logging of audio/transcript content.
    return fail(502, "Transcription failed.");
  }
}
