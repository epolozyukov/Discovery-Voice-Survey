import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/data/participant", () => ({ canParticipantAnswer: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getAdminOrNull: vi.fn() }));

import { canParticipantAnswer } from "@/lib/data/participant";
import { getAdminOrNull } from "@/lib/auth";
import { POST } from "@/app/api/transcription/route";
import { GET as health } from "@/app/api/transcription/health/route";

const ENV = { TRANSCRIPTION_BASE_URL: "https://api.groq.com/openai/v1", TRANSCRIPTION_API_KEY: "gsk_secret", TRANSCRIPTION_MODEL: "whisper-large-v3-turbo" };
const saved = { ...process.env };

function req(fields: Record<string, string | Blob | null>) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) if (v !== null) form.append(k, v);
  return new NextRequest("http://localhost/api/transcription", { method: "POST", body: form });
}
const audio = () => new Blob([new Uint8Array(2000)], { type: "audio/webm;codecs=opus" });
const upstream = (body: unknown, status = 200) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  Object.assign(process.env, ENV);
  vi.mocked(canParticipantAnswer).mockResolvedValue(true);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  process.env = { ...saved };
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/transcription", () => {
  it("returns 200 with the transcript and calls the provider with the configured model and key", async () => {
    const f = upstream({ text: "hello there" });
    vi.stubGlobal("fetch", f);
    const res = await POST(req({ token: "t", audio: audio() }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: "hello there" });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://api.groq.com/openai/v1/audio/transcriptions");
    expect(init.headers.Authorization).toBe("Bearer gsk_secret");
    expect((init.body as FormData).get("model")).toBe("whisper-large-v3-turbo");
  });

  it("uses a Groq-valid model even if the env var holds OpenAI's whisper-1 (regression)", async () => {
    process.env.TRANSCRIPTION_MODEL = "whisper-1";
    const f = upstream({ text: "ok" });
    vi.stubGlobal("fetch", f);
    await POST(req({ token: "t", audio: audio() }));
    expect((f.mock.calls[0][1].body as FormData).get("model")).toBe("whisper-large-v3-turbo");
  });

  it("tolerates whitespace/newline in the pasted API key (regression)", async () => {
    process.env.TRANSCRIPTION_API_KEY = "gsk_secret \n";
    const f = upstream({ text: "ok" });
    vi.stubGlobal("fetch", f);
    await POST(req({ token: "t", audio: audio() }));
    expect(f.mock.calls[0][1].headers.Authorization).toBe("Bearer gsk_secret");
  });

  it("returns 503 when transcription is not configured", async () => {
    delete process.env.TRANSCRIPTION_API_KEY;
    expect((await POST(req({ token: "t", audio: audio() }))).status).toBe(503);
  });

  it("returns 403 when the token may not answer", async () => {
    vi.mocked(canParticipantAnswer).mockResolvedValue(false);
    expect((await POST(req({ token: "t", audio: audio() }))).status).toBe(403);
  });

  it("returns 400 for missing token, missing audio, non-audio and empty audio", async () => {
    expect((await POST(req({ audio: audio() }))).status).toBe(400);
    expect((await POST(req({ token: "t" }))).status).toBe(400);
    expect((await POST(req({ token: "t", audio: new Blob(["x"], { type: "text/plain" }) }))).status).toBe(400);
    expect((await POST(req({ token: "t", audio: new Blob([], { type: "audio/webm" }) }))).status).toBe(400);
  });

  it("returns 413/400 for oversized audio", async () => {
    const big = new Blob([new Uint8Array(4 * 1024 * 1024 + 1)], { type: "audio/webm" });
    expect([400, 413]).toContain((await POST(req({ token: "t", audio: big }))).status);
  });

  it("returns a generic 502 on upstream failure, never leaking the upstream body or key, and logs only the status", async () => {
    vi.stubGlobal("fetch", upstream({ error: { message: "invalid api key gsk_secret" } }, 401));
    const res = await POST(req({ token: "t", audio: audio() }));
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).not.toContain("gsk_secret");
    expect(text).not.toContain("invalid api key");
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).toContain("401");
    expect(logged).not.toContain("gsk_secret");
  });

  it("rate limits repeated calls for the same token", async () => {
    vi.stubGlobal("fetch", upstream({ text: "ok" }));
    const statuses: number[] = [];
    for (let i = 0; i < 22; i++) statuses.push((await POST(req({ token: "rate-limited-token", audio: audio() }))).status);
    expect(statuses.at(-1)).toBe(429);
  });
});

describe("GET /api/transcription/health (admin only)", () => {
  it("rejects non-admins", async () => {
    vi.mocked(getAdminOrNull).mockResolvedValue(null);
    expect((await health()).status).toBe(401);
  });
  it("reports not configured", async () => {
    vi.mocked(getAdminOrNull).mockResolvedValue({ email: "a@b.c" });
    delete process.env.TRANSCRIPTION_BASE_URL;
    expect(await (await health()).json()).toMatchObject({ configured: false });
  });
  it("reports upstream status and model without exposing the key", async () => {
    vi.mocked(getAdminOrNull).mockResolvedValue({ email: "a@b.c" });
    vi.stubGlobal("fetch", upstream({ data: [] }, 401));
    const body = await (await health()).json();
    expect(body).toMatchObject({ configured: true, upstreamStatus: 401, ok: false, model: "whisper-large-v3-turbo" });
    expect(JSON.stringify(body)).not.toContain("gsk_secret");
  });
  it("reports ok when the provider accepts the key", async () => {
    vi.mocked(getAdminOrNull).mockResolvedValue({ email: "a@b.c" });
    vi.stubGlobal("fetch", upstream({ data: [] }, 200));
    expect(await (await health()).json()).toMatchObject({ ok: true, upstreamStatus: 200 });
  });
});
