"use client";

import { useSyncExternalStore } from "react";

/**
 * The current time, as an external store.
 *
 * A timed offer has to be re-evaluated as the clock moves, but reading
 * `Date.now()` while rendering makes a component's output depend on when it
 * happened to render, and setting it from an effect costs a second render on
 * every mount. Subscribing to a clock the way React subscribes to any other
 * outside source avoids both.
 *
 * The server has no time to report — it would be a different instant from the
 * browser's and the two renders would disagree — so it reports `null` and the
 * caller simply treats the offer as not yet evaluated until hydration.
 */

const TICK_MS = 30_000;

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let snapshot = 0;

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  if (!timer) {
    snapshot = Date.now();
    timer = setInterval(() => {
      snapshot = Date.now();
      for (const listener of listeners) listener();
    }, TICK_MS);
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

// Read, never computed: React calls this on every render and compares the
// result, so it has to hand back the same value until the tick moves it.
const getSnapshot = () => snapshot;
const getServerSnapshot = () => null;

export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
