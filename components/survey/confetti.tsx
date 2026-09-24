const COLORS = ["#3a8b8b", "#5fc9bd", "#9be3d9", "#ffd166", "#ef6a72", "#a9c8ff"];

/** Deterministic pseudo-random in [0,1) so server and client render identical markup. */
const rnd = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const PIECES = Array.from({ length: 70 }, (_, i) => ({
  id: i,
  left: `${(rnd(i, 1) * 100).toFixed(2)}%`,
  color: COLORS[i % COLORS.length],
  dur: `${(2.6 + rnd(i, 2) * 2).toFixed(2)}s`,
  delay: `${(rnd(i, 3) * 0.9).toFixed(2)}s`,
  x: `${((rnd(i, 4) - 0.5) * 240).toFixed(0)}px`,
  r: `${(360 + rnd(i, 5) * 720).toFixed(0)}deg`,
}));

/** One-shot celebratory burst (pure CSS animation, hidden for reduced-motion users). */
export function Confetti() {
  return (
    <div className="pv-confetti" aria-hidden="true">
      {PIECES.map((p) => (
        <i key={p.id} style={{ left: p.left, background: p.color, "--dur": p.dur, "--delay": p.delay, "--x": p.x, "--r": p.r } as React.CSSProperties} />
      ))}
    </div>
  );
}
