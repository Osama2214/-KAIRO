"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * A group of console panels that starts closed.
 *
 * The content tab had eleven panels open at once, all the same size and weight,
 * so the handful edited regularly — the promo bar, delivery rates, the ticker,
 * the two carousels — were buried among the ones set once and left alone. This
 * puts the rest behind a heading that says how many are inside, without taking
 * anything away: everything still edits exactly as it did.
 */
export function CollapsibleSection({
  title,
  subtitle,
  count,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Shown beside the title so a closed group still says what it holds. */
  count?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-ink-border rounded-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 px-4 sm:px-6 py-4 bg-ink-surface hover:bg-ink-elevated transition-colors cursor-pointer text-left"
      >
        <div className="min-w-0">
          <h2 className="text-paper-muted text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <span>{title}</span>
            {typeof count === "number" && (
              <span className="text-[10px] font-mono text-text-muted bg-ink border border-ink-border rounded-xs px-1.5 py-0.5">
                {count}
              </span>
            )}
          </h2>
          {subtitle && <p className="text-[11px] text-text-muted mt-1 truncate">{subtitle}</p>}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-text-muted shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Unmounted while closed rather than hidden. The panels keep their draft
          values in the console's own state, not here, so nothing a curator has
          typed is lost by collapsing the group. */}
      {open && <div className="p-3 sm:p-4 bg-ink/40 border-t border-ink-border space-y-6">{children}</div>}
    </div>
  );
}
