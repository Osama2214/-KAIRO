"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * A scrolling list of numbers, drawn rather than delegated.
 *
 * A native `<select>` renders its options through the operating system, so the
 * dropdown arrives white with a blue highlight no matter what the page looks
 * like — the same reason the date picker beside it had to be drawn. This keeps
 * the console's own colours and, unlike the native list, opens with the current
 * value already in view instead of at the top.
 */
export function TimeUnitPicker({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: number;
  options: number[];
  onChange: (value: number) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Twenty-four hours do not fit on screen, so start at the current value
    // rather than making the curator scroll to find it.
    listRef.current?.querySelector<HTMLElement>("[data-selected='true']")?.scrollIntoView({ block: "center" });

    const onPointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div ref={containerRef} className="relative flex-1">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`w-full h-9 flex items-center justify-between gap-1 bg-ink-surface border px-2.5 rounded-xs text-paper transition-colors cursor-pointer ${
          open ? "border-gold" : "border-ink-border hover:border-gold/50"
        }`}
      >
        <span>{pad(value)}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute z-[130] mt-1 w-full max-h-48 overflow-y-auto overscroll-contain bg-ink border border-gold/40 rounded-xs shadow-2xl"
          data-lenis-prevent
        >
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={option === value}
              data-selected={option === value}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`w-full px-2.5 py-1.5 text-left transition-colors cursor-pointer ${
                option === value
                  ? "bg-gold text-ink font-bold"
                  : "text-paper-muted hover:bg-ink-elevated hover:text-paper"
              }`}
            >
              {pad(option)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
