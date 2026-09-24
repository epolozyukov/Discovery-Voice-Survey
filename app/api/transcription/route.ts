import { NextResponse, type NextRequest } from "next/server";
import { canParticipantAnswer } from "@/lib/data/participant";
import { MAX_AUDIO_BYTES } from "@/lib/transcription/audio";
import { getTranscriptionConfig } from "@/lib/transcription/config";
import { TranscriptionError, createWhisperCompatibleProvider } from "@/lib/transcription/whisper-compatible";

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
  const config = getTranscriptionConfig();
  if (!config) return fail(503, "Transcription is not available.");

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
    const text = await createWhisperCompatibleProvider(config).transcribe(audio);
    return NextResponse.json({ text }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    // Log only the upstream HTTP status (never audio, transcripts, keys or upstream bodies).
    console.error(`transcription upstream failed status=${e instanceof TranscriptionError ? (e.status ?? "n/a") : "error"}`);
    return fail(502, "Transcription failed.");
  }
}
