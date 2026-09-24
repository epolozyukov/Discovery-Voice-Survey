import type { SpeechToTextProvider } from "./types";

/** Deterministic provider for tests: yields queued transcripts (or throws queued errors). */
export class MockTranscriptionProvider implements SpeechToTextProvider {
  constructor(private queue: (string | Error)[] = ["This is a mock transcript."]) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature matches SpeechToTextProvider
  async transcribe(_audio?: Blob): Promise<string> {
    const next = this.queue.length > 1 ? this.queue.shift()! : this.queue[0];
    if (next instanceof Error) throw next;
    return next;
  }
}
