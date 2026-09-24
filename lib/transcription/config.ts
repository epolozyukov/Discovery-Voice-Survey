export interface TranscriptionConfig { baseUrl: string; apiKey: string; model: string }

type Env = Record<string, string | undefined>;

const GROQ_MODEL = "whisper-large-v3-turbo";
const OPENAI_MODEL = "whisper-1";

/** Removes whitespace and one layer of wrapping quotes (common when pasting into dashboards). */
const clean = (v: string | undefined) => (v ?? "").trim().replace(/^(["'])([\s\S]*)\1$/, "$2").trim();

/** Reads and normalises transcription settings; returns null when unusable. */
export function getTranscriptionConfig(env: Env = process.env): TranscriptionConfig | null {
  let baseUrl = clean(env.TRANSCRIPTION_BASE_URL).replace(/\/+$/, "").replace(/\/audio\/transcriptions$/, "");
  const apiKey = clean(env.TRANSCRIPTION_API_KEY).replace(/^Bearer\s+/i, "");
  if (!baseUrl || !apiKey) return null;

  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return null;
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return null;

  const isGroq = url.hostname.endsWith("groq.com");
  if (isGroq && (url.pathname === "" || url.pathname === "/")) baseUrl = `${url.origin}/openai/v1`;
  let model = clean(env.TRANSCRIPTION_MODEL) || (isGroq ? GROQ_MODEL : OPENAI_MODEL);
  // "whisper-1" is OpenAI-only (and was the .env.example default); Groq answers 4xx for it.
  if (isGroq && model === OPENAI_MODEL) model = GROQ_MODEL;
  return { baseUrl, apiKey, model };
}
