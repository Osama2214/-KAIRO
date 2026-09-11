import { create } from "zustand";

/**
 * Whether the curator's last change reached the server.
 *
 * The console has no save button: editing the store is the save, and
 * `StorefrontDataSync` pushes the result a moment later. That is a good way to
 * work right up until a push fails — the request's outcome used to be dropped
 * on the floor (`.catch(() => {})`), so a rejected save, an expired session or
 * a payload over the server's limit all looked exactly like a successful one,
 * and the curator would carry on editing work that was never stored.
 *
 * This holds what actually happened so the console can say so, and so the tab
 * can refuse to close quietly on unsaved work.
 */
export type CuratorSaveStatus =
  /** Nothing changed since the last confirmed save. */
  | "idle"
  /** Edited, waiting for the debounce before the request goes out. */
  | "pending"
  /** A request is in flight. */
  | "saving"
  /** The server confirmed the most recent change. */
  | "saved"
  /** The change did not reach the server; `message` says why. */
  | "error";

interface CuratorSaveState {
  status: CuratorSaveStatus;
  /** Why the last save failed, phrased for the curator rather than the console. */
  message: string;
  /** When the last successful save landed, for "saved a moment ago". */
  savedAt: number | null;
  /** Set by the sync component; the console only reads these. */
  report: (status: CuratorSaveStatus, message?: string) => void;
  /** Asks the sync component to push again after a failure. */
  retry: (() => void) | null;
  setRetry: (retry: (() => void) | null) => void;
}

export const useCuratorSaveStore = create<CuratorSaveState>((set) => ({
  status: "idle",
  message: "",
  savedAt: null,
  report: (status, message = "") =>
    // A failed save must not erase the time of the last good one: "saved at
    // 14:02, then failed" is the useful thing to show.
    set((state) => ({
      status,
      message,
      savedAt: status === "saved" ? Date.now() : state.savedAt,
    })),
  retry: null,
  setRetry: (retry) => set({ retry }),
}));

/** True while a change has not yet been confirmed by the server. */
export function hasUnsavedCuratorWork(status: CuratorSaveStatus): boolean {
  return status === "pending" || status === "saving" || status === "error";
}
