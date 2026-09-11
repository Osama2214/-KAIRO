"use client";

import React from "react";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { useCuratorSaveStore } from "@/store/useCuratorSaveStore";
import { useNow } from "@/hooks/useNow";

/**
 * Says whether the console's last change actually reached the server.
 *
 * Editing is the save here — there is no form to submit — so without this the
 * curator has no way to tell a stored change from one the server rejected. A
 * failure is not a toast that scrolls away either: it stays on screen with a
 * retry, because the work is still in the browser and can still be saved.
 */
export function SaveStatusBadge() {
  const status = useCuratorSaveStore((state) => state.status);
  const message = useCuratorSaveStore((state) => state.message);
  const savedAt = useCuratorSaveStore((state) => state.savedAt);
  const retry = useCuratorSaveStore((state) => state.retry);
  const now = useNow();

  if (status === "idle" && !savedAt) return null;

  if (status === "error") {
    return (
      <div
        role="alert"
        className="flex items-center gap-2 px-2.5 py-1.5 bg-vermilion/15 border border-vermilion/50 rounded-sm text-vermilion max-w-[min(22rem,60vw)]"
      >
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span className="text-[11px] leading-tight font-sans">{message || "Your last change was not saved."}</span>
        {retry && (
          <button
            type="button"
            onClick={retry}
            className="shrink-0 px-2 py-0.5 bg-vermilion text-paper rounded-xs text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:bg-vermilion-light transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (status === "saving" || status === "pending") {
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-text-muted">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span className="hidden sm:inline">Saving…</span>
      </span>
    );
  }

  // status === "saved", or idle with a previous save to report.
  const secondsAgo = savedAt && now ? Math.max(0, Math.round((now - savedAt) / 1000)) : null;
  const when =
    secondsAgo === null ? "" : secondsAgo < 45 ? "just now" : `${Math.round(secondsAgo / 60)} min ago`;

  return (
    <span className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-emerald-400/80">
      <Check className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Saved {when}</span>
    </span>
  );
}
