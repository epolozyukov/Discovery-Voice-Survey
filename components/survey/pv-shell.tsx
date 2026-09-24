/** Full-bleed animated backdrop + centered column shared by every participant screen. */
export function PvShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="pv">
      <div className="pv-aurora" aria-hidden="true"><i /><i /><i /></div>
      <div className="pv-vignette" aria-hidden="true" />
      <main className={`mx-auto flex min-h-dvh w-full flex-col justify-center gap-8 px-5 py-10 sm:py-14 ${wide ? "max-w-4xl" : "max-w-3xl"}`}>
        {children}
      </main>
    </div>
  );
}

export function Brand() {
  return (
    <div className="flex items-center gap-2.5 text-sm font-semibold tracking-wide">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#7c5cff] to-[#22d3ee]" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M12 3v11M8 7v4M16 7v4M4 9.5v1M20 9.5v1M12 18v3" /></svg>
      </span>
      Discovery
    </div>
  );
}

export function Icon({ name }: { name: "mic" | "stop" | "arrow" | "back" | "pencil" | "sparkle" }) {
  const p = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (name) {
    case "mic": return <svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>;
    case "stop": return <svg {...p} fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="3" /></svg>;
    case "arrow": return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
    case "back": return <svg {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>;
    case "pencil": return <svg {...p}><path d="M4 20h4L19 9l-4-4L4 16v4z" /></svg>;
    case "sparkle": return <svg {...p}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" /></svg>;
  }
}
