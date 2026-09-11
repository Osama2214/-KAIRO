"use client";

import React from "react";

/**
 * The console's on/off switch.
 *
 * Four sections each need one, and each had built it from the same 400-odd
 * characters of utility classes pasted in place — except two of them, which had
 * quietly settled for a plain checkbox instead, so the same kind of setting
 * looked like two different controls a few rows apart.
 *
 * The state word beside it is part of the control: a switch alone leaves you
 * guessing which side is on.
 */
export function Toggle({
  checked,
  onChange,
  onLabel = "ACTIVE",
  offLabel = "PAUSED",
  ariaLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  onLabel?: string;
  offLabel?: string;
  ariaLabel?: string;
}) {
  return (
    <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={ariaLabel}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-ink border border-ink-border rounded-full peer peer-checked:bg-gold peer-checked:border-gold peer-focus-visible:ring-2 peer-focus-visible:ring-gold/50 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-paper after:border after:border-ink-border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-gold" />
      <span
        className={`ml-2.5 text-[11px] font-mono font-bold tracking-wider uppercase transition-colors ${
          checked ? "text-gold" : "text-text-muted"
        }`}
      >
        {checked ? onLabel : offLabel}
      </span>
    </label>
  );
}
