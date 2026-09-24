export function AdminBrand({ size = "md" }: { size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-11 w-11 rounded-2xl" : "h-9 w-9 rounded-xl";
  return (
    <span className="flex items-center gap-3">
      <span className={`grid ${box} place-items-center bg-gradient-to-br from-[#6d4aff] to-[#22b8e8] shadow-md`} aria-hidden="true">
        <svg viewBox="0 0 24 24" width={size === "lg" ? 22 : 18} height={size === "lg" ? 22 : 18} fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M12 3v11M8 7v4M16 7v4M4 9.5v1M20 9.5v1M12 18v3" /></svg>
      </span>
      <span className={`font-semibold tracking-tight ${size === "lg" ? "text-xl" : "text-base"}`}>Discovery Voice Survey</span>
    </span>
  );
}
