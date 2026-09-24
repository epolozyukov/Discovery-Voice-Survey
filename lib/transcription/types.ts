/** Replaceable speech-to-text backend. Audio is transient and never stored. */
export interface SpeechToTextProvider {
  transcribe(audio: Blob): Promise<string>;
}
