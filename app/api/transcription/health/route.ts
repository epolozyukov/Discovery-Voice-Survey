import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/auth";
import { getTranscriptionConfig } from "@/lib/transcription/config";

/** Admin-only configuration check: is transcription configured, and does the provider accept our key? */
export async function GET() {
  if (!(await getAdminOrNull())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const config = getTranscriptionConfig();
  if (!config) return NextResponse.json({ configured: false });
  let upstreamStatus: number | null = null;
  try {
    const res = await fetch(`${config.baseUrl}/models`, { headers: { Authorization: `Bearer ${config.apiKey}` } });
    upstreamStatus = res.status;
  } catch {
    upstreamStatus = null;
  }
  return NextResponse.json(
    { configured: true, ok: upstreamStatus === 200, upstreamStatus, model: config.model, host: new URL(config.baseUrl).hostname },
    { headers: { "Cache-Control": "no-store" } },
  );
}
