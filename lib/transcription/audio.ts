const CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

export function pickRecorderMimeType(isSupported: (type: string) => boolean): string | undefined {
  return CANDIDATES.find(isSupported);
}

export function extensionForMime(mime: string): string {
  if (mime.startsWith("audio/mp4")) return "mp4";
  if (mime.startsWith("audio/ogg")) return "ogg";
  return "webm";
}

/** ~32 kbps keeps a 5-minute recording (~1.2 MB) under Vercel's request body limit. */
export const AUDIO_BITS_PER_SECOND = 32_000;
export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

/** Whisper returns "" or "." for silence; treat transcripts without any letter/digit as "nothing heard". */
export const hasSpeech = (text: string) => /[\p{L}\p{N}]/u.test(text);
