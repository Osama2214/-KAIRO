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
 * The optimizer URL has to match what `next/image` will ask for, or the browser
 * caches one file and requests another. Rather than recompute the chosen width
 * from the `sizes` attribute and the viewport — which would quietly disagree the
 * moment either changes — it is read back off an image the grid has already
 * rendered, so the warmed URL is by construction the one that will be used.
 *
 * Nothing is warmed on a metered or slow connection: someone on 2G is better
 * served by the page in front of them than by one they may never open.
 */

const MAX_PREFETCH = 24;

type Connection = {
  saveData?: boolean;
  effectiveType?: string;
};

function connectionAllowsPrefetch(): boolean {
  if (typeof navigator === "undefined") return false;
  const connection = (navigator as Navigator & { connection?: Connection }).connection;
  if (!connection) return true;
  if (connection.saveData) return false;
  return !/(^|-)(slow-)?2g$/.test(connection.effectiveType || "");
}

/**
 * The width and quality the optimizer was actually asked for, read from images
 * the grid has already fetched.
 *
 * Only `currentSrc` will do. The `src` attribute `next/image` writes is the
 * largest candidate in the set — 3840px here — and is what the browser falls
 * back to, not what it picks; copying that would warm a full-size file for
 * every card when the grid displays them at 256px.
 *
 * The most common width across the grid wins rather than the first one found,
 * so a single card that happens to be laid out differently cannot decide it.
 */
function optimizerShape(root: HTMLElement | null): { width: string; quality: string } | null {
  if (!root) return null;
  const tally = new Map<string, number>();
  let quality: string | null = null;

  for (const image of root.querySelectorAll("img")) {
    const source = image.currentSrc;
    if (!source || !source.includes("/_next/image")) continue;
    const params = new URLSearchParams(source.slice(source.indexOf("?") + 1));
    const width = params.get("w");
    const q = params.get("q");
    if (!width || !q) continue;
    tally.set(width, (tally.get(width) ?? 0) + 1);
    quality ??= q;
  }

  if (!quality || tally.size === 0) return null;
  let width = "";
  let best = -1;
  for (const [candidate, count] of tally) {
    if (count > best) {
      best = count;
      width = candidate;
    }
  }
  return { width, quality };
}

/**
 * @param sources Image URLs for the next page, in the order they will appear.
 * @param gridRef The element holding the current page's cards, read to learn
 *   which optimizer variant this layout asks for.
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
      // `currentSrc` is only filled in once a variant has actually been chosen
      // and fetched, so until the grid has drawn something there is nothing to
      // copy the width from and warming has to wait.
      const shape = optimizerShape(gridRef.current);
      if (!shape) return false;

      for (const source of sources.slice(0, MAX_PREFETCH)) {
        if (!source || warmed.current.has(source)) continue;
        warmed.current.add(source);
        const url = `/_next/image?url=${encodeURIComponent(source)}&w=${shape.width}&q=${shape.quality}`;
        const image = new Image();
        // Explicitly the lowest priority: this must never compete with what the
        // shopper is looking at right now.
        image.fetchPriority = "low";
        image.decoding = "async";
        image.src = url;
      }
      return true;
    };

    let onLoad: ((event: Event) => void) | undefined;
    const grid = gridRef.current;

    const handle = idle(() => {
      if (cancelled || warm()) return;
      // Nothing had loaded yet. Rather than give up for the life of the page,
      // wait for the grid's first cover and take the measurement from that.
      // `load` does not bubble, hence the capture phase.
      onLoad = () => {
        if (cancelled) return;
        if (warm() && grid && onLoad) grid.removeEventListener("load", onLoad, true);
      };
      grid?.addEventListener("load", onLoad, true);
    });

    return () => {
      cancelled = true;
      if (grid && onLoad) grid.removeEventListener("load", onLoad, true);
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
