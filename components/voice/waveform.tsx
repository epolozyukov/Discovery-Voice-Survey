"use client";

import { useEffect, useRef } from "react";

/** Live microphone level bars (Web Audio analyser → canvas). Decorative: hidden from assistive tech. */
export function Waveform({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!stream || !canvas) return;
    const ctx2d = canvas.getContext("2d");
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!ctx2d || !AC) return;

    const audio = new AC();
    const analyser = audio.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.78;
    const source = audio.createMediaStreamSource(stream);
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const bars = 40;
    let raf = 0;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const { clientWidth: w, clientHeight: h } = canvas;
      if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx2d.clearRect(0, 0, w, h);
      analyser.getByteFrequencyData(data);
      const gap = 4;
      const bw = (w - gap * (bars - 1)) / bars;
      const grad = ctx2d.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "#ff4d78");
      grad.addColorStop(0.5, "#b08cff");
      grad.addColorStop(1, "#22d3ee");
      ctx2d.fillStyle = grad;
      for (let i = 0; i < bars; i++) {
        // mirror low→high frequencies from the centre outward for a symmetric look
        const idx = Math.floor((Math.abs(i - bars / 2) / (bars / 2)) * (data.length * 0.6));
        const level = data[idx] / 255;
        const bh = Math.max(4, level * h);
        const x = i * (bw + gap);
        ctx2d.beginPath();
        ctx2d.roundRect(x, (h - bh) / 2, bw, bh, bw / 2);
        ctx2d.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      void audio.close();
    };
  }, [stream]);

  return <canvas ref={ref} className="pv-wave" aria-hidden="true" />;
}
