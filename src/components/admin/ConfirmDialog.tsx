"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";

/**
 * The console's own confirmation dialog, in place of `window.confirm`.
 *
 * The native one has three problems here. It is unstyled, so the most
 * destructive moments in the console are the only ones that do not look like
 * the console. It collapses whitespace, so the detail explaining what a delete
 * would take with it arrived as one run-on line. And a browser lets a visitor
 * suppress it for the rest of the session — after which deletes would go
 * through with no question asked at all.
 *
 * Kept promise-shaped so call sites read the same way they did:
 *
 *   if (await confirm({ ... })) deleteVolume(id);
 */

export interface ConfirmRequest {
  title: string;
  /** Each entry is its own paragraph. */
  body?: string[];
  /** Label for the button that goes ahead; defaults to "Delete". */
  confirmLabel?: string;
  /** Set for anything irreversible — colours the action and adds the warning rule. */
  destructive?: boolean;
}

type Pending = ConfirmRequest & { resolve: (ok: boolean) => void };

/**
 * Provides `confirm`. Rendered once by the console; everything below it asks
 * through the hook rather than reaching for `window.confirm`.
 */
export function useConfirm() {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback(
    (request: ConfirmRequest) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...request, resolve });
      }),
    []
  );

  const settle = useCallback(
    (ok: boolean) => {
      setPending((current) => {
        current?.resolve(ok);
        return null;
      });
    },
    []
  );

  const dialog = pending ? <ConfirmDialog request={pending} onSettle={settle} /> : null;

  return { confirm, dialog };
}

function ConfirmDialog({ request, onSettle }: { request: Pending; onSettle: (ok: boolean) => void }) {
  useModalScrollLock(true);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Focus the action so the keyboard works the way the native dialog did, and
  // let Escape mean "no" — the safe answer when the question is a deletion.
  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onSettle(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSettle]);

  const destructive = request.destructive !== false;

  return (
    <div
      data-lenis-prevent
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-ink/85 backdrop-blur-md animate-in fade-in duration-150"
      onClick={(event) => {
        if (event.target === event.currentTarget) onSettle(false);
      }}
    >
      <div className="w-full max-w-md bg-ink border border-ink-border rounded-sm shadow-2xl overflow-hidden font-sans">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-ink-border bg-ink-surface/50">
          <div className="flex items-start gap-3 min-w-0">
            {destructive && <AlertTriangle className="w-4 h-4 text-vermilion shrink-0 mt-0.5" />}
            <h3
              id="confirm-title"
              className="font-cinzel text-base font-bold text-paper uppercase tracking-wider leading-snug"
            >
              {request.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onSettle(false)}
            aria-label="Cancel"
            className="text-text-muted hover:text-paper p-1 cursor-pointer transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {request.body && request.body.length > 0 && (
          <div className="px-6 py-5 space-y-2.5">
            {request.body.map((line, index) => (
              <p key={index} className="text-sm text-text-muted leading-relaxed">
                {line}
              </p>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-ink-border bg-ink-surface/30">
          <button
            type="button"
            onClick={() => onSettle(false)}
            className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-text-muted hover:text-paper cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => onSettle(true)}
            className={`px-5 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-xs cursor-pointer shadow-md transition-colors ${
              destructive
                ? "bg-vermilion hover:bg-vermilion-light text-paper"
                : "bg-gold hover:bg-gold-light text-ink"
            }`}
          >
            {request.confirmLabel || "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
