"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Warms the covers of the page a shopper is about to turn to.
 *
 * Paginated grids only render the page you are on, so turning to the next one
 * starts every download from scratch and the grid fills in one cover at a time.
 * Fetching them quietly while the current page is being read means the next one
 * is already in the browser cache by the time it is asked for.
 *
 * When Next's image transformer is enabled, the optimizer URL has to match what
 * `next/image` will ask for. This project serves images directly because the
 * deployment may return 402 when its transformer quota is exhausted. In that
 * mode the original source URL is the cache key and is prefetched as-is.
 *
 * Nothing is warmed on a metered or slow connection: someone on 2G is better
 * served by the page in front of them than by one they may never open.
 */

const MAX_PREFETCH = 6;

type Connection = {
  saveData?: boolean;
  effectiveType?: string;
  type?: string;
};

function connectionAllowsPrefetch(): boolean {
  if (typeof navigator === "undefined") return false;
  const connection = (navigator as Navigator & { connection?: Connection }).connection;
  if (!connection) return !window.matchMedia("(pointer: coarse)").matches && window.innerWidth >= 1024;
  if (connection.saveData) return false;
  // A next-page warmup is a convenience, never content the shopper asked
  // for. The Network Information API is mainly exposed by mobile Chromium;
  // unless it positively identifies Wi-Fi/Ethernet, save the bytes for the
  // product the shopper actually opens. Browsers without this API retain the
  // existing, best-effort desktop behaviour.
  return connection.type === "wifi" || connection.type === "ethernet";
}

/**
 * @param sources Image URLs for the next page, in the order they will appear.
 * @param gridRef Kept for the stable hook API used by catalogue grids.
 */
export function useImagePrefetch(
  sources: readonly string[],
  gridRef: React.RefObject<HTMLElement | null>
): void {
  // Warmed URLs survive re-renders and page turns, so a shopper paging back and
  // forth does not re-request what is already in hand.
  const warmed = useRef(new Set<string>());

  useEffect(() => {
    if (sources.length === 0) return;
    if (!connectionAllowsPrefetch()) return;

    let cancelled = false;
    const idle = (callback: () => void) => {
      const schedule = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
      // Behind the current page's own images either way — an idle callback when
      // the browser offers one, a short delay when it does not.
      if (schedule) return schedule(callback, { timeout: 3000 });
      return window.setTimeout(callback, 1200);
    };

    const warm = (): boolean => {
      for (const source of sources.slice(0, MAX_PREFETCH)) {
        if (!source || warmed.current.has(source)) continue;
        warmed.current.add(source);
        const image = new Image();
        // Explicitly the lowest priority: this must never compete with what the
        // shopper is looking at right now.
        image.fetchPriority = "low";
        image.decoding = "async";
        image.src = source;
      }
      return true;
    };

    const handle = idle(() => {
      if (!cancelled) warm();
    });

    return () => {
      cancelled = true;
      const cancel = (window as Window & { cancelIdleCallback?: (handle: number) => void }).cancelIdleCallback;
      if (cancel) cancel(handle as number);
      else window.clearTimeout(handle as number);
    };
  }, [sources, gridRef]);
}

/**
 * The page-turning wrapper around {@link useImagePrefetch}.
 *
 * Warming the page *after* the current one is only right while a shopper is
 * moving forward. Someone who jumps to the end and reads backwards was being
 * handed the page they had just left — already in the browser cache — while the
 * page they were about to open started from nothing. So the direction of the
 * last move decides which neighbour gets warmed, and the count of warmed images
 * is unchanged either way.
 *
 * At the ends of the range the remaining neighbour is used instead, unless that
 * is the page just came from, in which case nothing is warmed: there is no
 * point spending the effort on something already in hand.
 */
export function usePaginatedImagePrefetch(
  covers: readonly string[],
  page: number,
  perPage: number,
  gridRef: React.RefObject<HTMLElement | null>
): void {
  // Adjusted during render rather than held in a ref, so the direction is
  // settled before the memo below reads it on this same pass.
  const [nav, setNav] = useState({ page, direction: 1, from: 0 });
  if (nav.page !== page) {
    setNav({ page, direction: page > nav.page ? 1 : -1, from: nav.page });
  }

  const target = useMemo(() => {
    const lastPage = Math.max(1, Math.ceil(covers.length / perPage));
    const inRange = (candidate: number) => candidate >= 1 && candidate <= lastPage;

    const ahead = page + nav.direction;
    if (inRange(ahead)) return ahead;

    // The end of the line in the direction of travel; the other neighbour is
    // the only thing left worth warming, and only if it is somewhere new.
    const behind = page - nav.direction;
    return inRange(behind) && behind !== nav.from ? behind : 0;
  }, [covers.length, page, perPage, nav.direction, nav.from]);

  const sources = useMemo(
    () => (target === 0 ? [] : covers.slice((target - 1) * perPage, target * perPage).filter(Boolean)),
    [covers, target, perPage]
  );

  useImagePrefetch(sources, gridRef);
}
