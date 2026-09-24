"use client";

import { useEffect, useRef } from "react";

export type OrbState = "idle" | "recording" | "working";

/**
 * The focal point of the experience: breathes when idle, swells with the speaker's real
 * voice level while recording (Web Audio analyser → CSS variable, no React re-renders).
 */
export function Orb({ state = "idle", stream = null, size = 120 }: { state?: OrbState; stream?: MediaStream | null; size?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!stream || !el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;

    const audio = new AC();
    const analyser = audio.createAnalyser();
    analyser.fftSize = 256;
    const source = audio.createMediaStreamSource(stream);
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let smoothed = 0;
    let raf = 0;

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += ((v - 128) / 128) ** 2;
      const rms = Math.sqrt(sum / data.length); // 0..~1
      smoothed = smoothed * 0.8 + Math.min(1, rms * 3.2) * 0.2;
      el.style.setProperty("--lvl", smoothed.toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      el.style.setProperty("--lvl", "0");
      source.disconnect();
      void audio.close();
    };
  }, [stream]);

  return (
    <div ref={ref} className="pv-orb" data-state={state} style={{ "--s": `${size}px` } as React.CSSProperties} aria-hidden="true">
      <div className="pv-orb-core" />
    </div>
  );
}
