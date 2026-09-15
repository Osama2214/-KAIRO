"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { PLACEHOLDER_COVER } from "@/config/mediaDefaults";

/**
 * Backoff between re-requests. A cover that failed on a cold optimizer miss is
 * usually there a moment later, so the first retry is quick and the last one
 * is far enough out to clear a slow origin fetch.
 */
const RETRY_DELAYS_MS = [400, 1400, 3500];

/**
 * Retries carry a nonce so the optimizer treats each one as a new request.
 *
 * Not on the site's own files (`/images/...`): next/image throws on a local
 * path with a query string unless `images.localPatterns` allows it, so one
 * failed load of a bundled image crashed the component. Those files come from
 * this deployment, so they are retried by remounting (see `key`) instead.
 */
function withRetryNonce(src: string, nonce: number): string {
  if (nonce === 0 || src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("/")) return src;
  return `${src}${src.includes("?") ? "&" : "?"}avr=${nonce}`;
}

/**
 * next/image has no recovery of its own. When a request fails — a dropped
 * connection, or the optimizer timing out while it pulls the original out of
 * storage — the <img> stays blank for the life of the page, which is why a
 * missing cover only came back on a manual reload.
 *
 * This re-requests a failed image a few times with backoff, and once more
 * whenever the tab is brought back or the network returns, so a transient
 * failure heals without the visitor doing anything.
 */
export function useImageRetry(src: string) {
  // One object so a new `src` resets the attempt count with it. Adjusting
  // state during render is React's own answer to "reset when a prop changes",
  // and it keeps the canonical URL — the one already in the browser and CDN
  // caches — as the first thing tried for every new image.
  const [state, setState] = useState({ src, nonce: 0, failures: 0 });
  if (state.src !== src) setState({ src, nonce: 0, failures: 0 });

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // A card can be reused for a different product while a retry is pending.
  // Cancel the old timer when its source changes so it cannot bump the new
  // image's nonce after the component has been recycled during fast scrolling.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = undefined;
  }, [src]);

  const exhausted = state.failures > RETRY_DELAYS_MS.length;

  const onError = useCallback(() => {
    setState((current) => {
      const delay = RETRY_DELAYS_MS[current.failures];
      if (delay !== undefined) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(
          () => setState((latest) => ({ ...latest, nonce: latest.nonce + 1 })),
          delay
        );
      }
      return { ...current, failures: current.failures + 1 };
    });
  }, []);

  const onLoad = useCallback(() => {
    setState((current) => (current.failures === 0 ? current : { ...current, failures: 0 }));
  }, []);

  // Images very often fail because the connection was asleep or gone. Both of
  // those announce themselves, so an image that gave up gets one more chance
  // at the moment it is most likely to succeed.
  useEffect(() => {
    if (!exhausted) return;
    const revive = () => {
      if (document.visibilityState === "hidden") return;
      setState((current) => ({ ...current, failures: 0, nonce: current.nonce + 1 }));
    };
    window.addEventListener("online", revive);
    document.addEventListener("visibilitychange", revive);
    return () => {
      window.removeEventListener("online", revive);
      document.removeEventListener("visibilitychange", revive);
    };
  }, [exhausted]);

  return {
    src: withRetryNonce(src, state.nonce),
    // Changes on every attempt, so the <Image> remounts even when `src` cannot.
    key: `${src}#${state.nonce}`,
    exhausted,
    onError,
    onLoad,
  };
}

type AnimeVerseImageProps = {
  src: string;
  alt: string;
  className?: string;
  sizes: string;
  preload?: boolean;
  quality?: number;
};

/**
 * Product/editorial imagery served through Next's optimizer and cache.
 *
 * Cards are deliberately served at Next's 75 quality. At their small rendered
 * size it preserves the cover artwork while keeping the dozens of images in a
 * catalogue visit meaningfully lighter on a mobile connection. The few large,
 * above-the-fold images opt into 90 explicitly at their call sites.
 */
export function AnimeVerseImage({ src, alt, className, sizes, preload = false, quality = 75 }: AnimeVerseImageProps) {
  // A failed optimizer request should not leave a card blank until the
  // shopper opens the product page (where the hero image is preloaded). Fall
  // back to the original bucket URL immediately; it is still lazy and keeps
  // the failure isolated to this image instead of blocking the grid.
  const source = src || PLACEHOLDER_COVER;
  const retry = useImageRetry(source);
  const [directFallbackSource, setDirectFallbackSource] = useState<string | null>(null);
  const directFallback = directFallbackSource === source;
  const { src: retrySrc, key: retryKey, onError, onLoad } = retry;

  const handleError = useCallback(() => {
    setDirectFallbackSource(source);
    onError();
  }, [onError, source]);

  return (
    <>
      <Image
        key={`${retryKey}:${directFallback ? "direct" : "optimized"}`}
        src={directFallback ? source : retrySrc}
        alt={alt}
        fill
        sizes={sizes}
        quality={quality}
        preload={preload}
        unoptimized={directFallback}
        loading={preload ? undefined : "lazy"}
        decoding="async"
        draggable={false}
        onError={handleError}
        onLoad={onLoad}
        className={`${className || ""} ${retry.exhausted ? "opacity-0" : ""}`}
      />
      {/* After every attempt has failed, a quiet placeholder rather than the
          browser's broken-image glyph. It clears itself the moment a later
          attempt succeeds. */}
      {retry.exhausted && (
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center bg-ink-elevated/70 text-text-muted/40 font-serif text-2xl select-none pointer-events-none"
        >
          巻
        </span>
      )}
    </>
  );
}
