/** Split layout: a deep-teal rail (brand, context, progress) beside a bright working pane. */
export function PvSplit({ rail, children, orb = "large" }: { rail: React.ReactNode; children: React.ReactNode; orb?: "large" | "small" }) {
  return (
    <div className="pv pv-split">
      <aside className="pv-rail">
        <div className={`pv-rail-orb ${orb === "small" ? "small" : ""}`} aria-hidden="true" />
        {rail}
      </aside>
      <main className="pv-pane">
        <div className="pv-pane-inner">{children}</div>
      </main>
    </div>
  );
}

/** Vertical progress tracker for the rail (decorative: the pane carries the accessible progress bar). */
export function RailTrack({ total, current }: { total: number; current: number }) {
  return (
    <ol className="pv-track" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <li key={i} className={i < current ? "done" : i === current ? "now" : ""}>
          <span className="dot">{i < current ? "✓" : i + 1}</span>
          {i === current ? "You are here" : i < current ? "Answered" : "Up next"}
        </li>
      ))}
    </ol>
  );
}

export function Brand({ onDark = false }: { onDark?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 text-sm font-bold tracking-wide ${onDark ? "text-white" : "text-[var(--pv-teal-dark)]"}`}>
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#5fc9bd] to-[#2b6f70]" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M12 3v11M8 7v4M16 7v4M4 9.5v1M20 9.5v1M12 18v3" /></svg>
      </span>
      Discovery
    </div>
  );
}

export function Icon({ name }: { name: "mic" | "stop" | "arrow" | "back" | "pencil" | "sparkle" | "keyboard" | "lock" }) {
  const p = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (name) {
    case "mic": return <svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>;
    case "stop": return <svg {...p} fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="3" /></svg>;
    case "arrow": return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
    case "back": return <svg {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>;
    case "pencil": return <svg {...p}><path d="M4 20h4L19 9l-4-4L4 16v4z" /></svg>;
    case "sparkle": return <svg {...p}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" /></svg>;
    case "keyboard": return <svg {...p}><rect x="3" y="6" width="18" height="12" rx="2.5" /><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" /></svg>;
    case "lock": return <svg {...p}><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
  }
}
