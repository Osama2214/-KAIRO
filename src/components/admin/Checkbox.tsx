"use client";

import React from "react";
import { Check } from "lucide-react";

/**
 * One checkbox for the whole console.
 *
 * There were three: a native box tinted with `accent-gold`, which the operating
 * system still draws its own way; a hidden input with a hand-built square; and
 * a square containing `CheckCircle2`, an icon that draws its own circle, so it
 * read as a circle inside a square. Sitting a few rows apart they plainly did
 * not belong to the same screen.
 *
 * The input stays a real checkbox — the label, keyboard and screen readers all
 * keep working — and is hidden behind a square that is drawn, so it looks the
 * same on every browser.
 */
export function Checkbox({
  checked,
  onChange,
  label,
  hint,
  className = "",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  /** Optional second line, for the ones that need a word of explanation. */
  hint?: string;
  className?: string;
}) {
  return (
    <label
      className={`group flex items-start gap-2.5 cursor-pointer select-none text-[11px] text-text-muted hover:text-paper transition-colors ${className}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <span
        aria-hidden="true"
        className={`w-4 h-4 mt-px rounded-xs border flex items-center justify-center shrink-0 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-gold/50 ${
          checked ? "bg-gold border-gold text-ink" : "border-ink-border group-hover:border-paper/60"
        }`}
      >
        {checked && <Check strokeWidth={3} className="w-3 h-3" />}
      </span>

      <span className="min-w-0">
        <span className={checked ? "text-paper" : ""}>{label}</span>
        {hint && <span className="block text-[10px] text-text-muted/70 mt-0.5">{hint}</span>}
      </span>
    </label>
  );
}
