"use client";

import React from "react";
import { Check, Save } from "lucide-react";

/**
 * The save control for one panel of the content tab.
 *
 * Those panels work differently from the rest of the console: edits go into a
 * local draft and only reach the storefront when this is pressed, while the
 * catalogue saves the moment it changes. Two behaviours in one screen is
 * already a lot to remember, and the button gave no sign which state it was in
 * — it looked identical whether there was something to save or not, so the
 * usual way to find out was to leave the tab and notice the work had gone.
 *
 * So the button says so: inert and quiet with nothing pending, lit with a count
 * of what is waiting when there is.
 */
export function SectionSaveButton({
  label,
  dirty,
  onSave,
}: {
  /** What this saves, e.g. "Announcement". */
  label: string;
  /** Whether the draft differs from what the storefront is showing. */
  dirty: boolean;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      {dirty ? (
        <span className="text-[11px] font-mono text-gold/90 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          Unsaved changes
        </span>
      ) : (
        <span className="text-[11px] font-mono text-text-muted flex items-center gap-1.5">
          <Check className="w-3 h-3" />
          Up to date
        </span>
      )}

      <button
        type="button"
        onClick={onSave}
        disabled={!dirty}
        className={`flex items-center gap-1.5 px-5 py-2.5 font-bold text-xs uppercase tracking-wider rounded-sm transition-colors ${
          dirty
            ? "bg-gold hover:bg-gold-muted text-ink cursor-pointer"
            : "bg-ink-elevated text-text-muted border border-ink-border cursor-not-allowed"
        }`}
      >
        <Save className="w-3.5 h-3.5" />
        <span>Save {label}</span>
      </button>
    </div>
  );
}
