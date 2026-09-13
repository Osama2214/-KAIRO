/** A high-contrast diagonal release ribbon that stays legible on every cover. */
export function ComingSoonRibbon({ isArabic = false }: { isArabic?: boolean }) {
  return (
    <span className="pointer-events-none absolute z-20 top-[12%] -start-[30%] w-[135%] -rotate-[38deg] border-y border-gold/80 bg-ink/90 py-1 sm:py-1.5 text-center font-mono text-[9px] sm:text-xs font-bold tracking-[0.22em] text-gold shadow-lg shadow-black/60">
      {isArabic ? "قريبًا" : "COMING SOON"}
    </span>
  );
}
