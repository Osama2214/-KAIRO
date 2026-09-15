"use client";

import { useEffect } from "react";
import {
  ensureCatalogDetails,
  isMergingCatalogDetails,
  useStorefrontStore,
  wasSeededFromServer,
} from "@/store/useStorefrontStore";

import { useAuthStore } from "@/store/useAuthStore";
import { useCartStore } from "@/store/useCartStore";
import { useWishlistStore } from "@/store/useWishlistStore";
import { purgeLegacyGuestOrders } from "@/lib/guestOrders";
import type { MangaVolume, Series } from "@/data/manga";
import { withDerivedSeriesVolumes, withoutSeriesVolumes } from "@/lib/seriesVolumes";
import { hasUnsavedCuratorWork, useCuratorSaveStore } from "@/store/useCuratorSaveStore";
import { STOREFRONT_DATA_KEYS } from "@/lib/storefrontKeys";
import { requestCatalogIndex } from "@/lib/catalogRequests";
import { useTranslation } from "@/hooks/useTranslation";

function snapshot(state: Record<string, unknown>) {
  const data = Object.fromEntries(STOREFRONT_DATA_KEYS.map((key) => [key, state[key]]));
  // Series volumes are derived from the catalogue, so uploading them again
  // would send the whole catalogue twice and re-store a copy that can drift.
  return { ...data, series: withoutSeriesVolumes(data.series) };
}

export function StorefrontDataSync() {
  const catalogError = useStorefrontStore((state) => state.catalogError);
  const { locale } = useTranslation();
  const isArabic = locale === "ar";
  useEffect(() => {
    // Remove the retired client-side CMS & users snapshots.
    try {
      localStorage.removeItem("kairo_storefront_cms_v3");
      localStorage.removeItem("kairo_users_db");
      // The personal recommendations section was removed; its local view
      // history is no longer used and should not linger on the device.
      localStorage.removeItem("kairo_browsing_history");
    } catch {}

    // Older builds kept complete guest orders — name, phone, delivery address —
    // in localStorage. Carry the references forward and delete the rest.
    purgeLegacyGuestOrders();

    const bundledVolumes = useStorefrontStore.getState().volumes;
    useCartStore.getState().hydrateFromCatalog(bundledVolumes);
    useWishlistStore.getState().hydrateFromCatalog(bundledVolumes);

    // Initialize authentic patron session from server HttpOnly cookie
    void useAuthStore.getState().initSession();

    let active = true;
    let hydrated = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let previous = "";

    const load = async () => {
      try {
        // The server index is complete regardless of its size. Never download
        // the catalogue again merely because the shop has fewer than 100 items.
        if (!wasSeededFromServer()) {
          const data = await requestCatalogIndex();
          if (active) {
            useStorefrontStore.setState({
              ...data,
              series: withDerivedSeriesVolumes(
                data.series as Series[],
                data.volumes as MangaVolume[]
              ),
            });
          }
        }
        if (!active) return;
        useStorefrontStore.setState({ catalogLoaded: true, catalogError: null });
      } catch {
        if (active) useStorefrontStore.setState({ catalogError: "The catalogue could not be loaded. Please try again." });
        return;
      } finally {
        // Only the live run may finish. A cancelled one — React's double-mount
        // in development, or a real unmount — had its own fetch result thrown
        // away by the `active` check above, so letting it fall through here
        // announced a catalogue that was never actually applied: pages then
        // resolved products against the defaults bundled at build time and
        // 404'd everything added since.
        if (active && useStorefrontStore.getState().catalogLoaded) {
          // Cart and wishlist persist ids only, so fill in titles, art and
          // prices here — unconditionally. Doing it only on a successful fetch
          // meant a storefront API outage left every restored cart line blank
          // at zero.
          const volumes = useStorefrontStore.getState().volumes;
          useCartStore.getState().hydrateFromCatalog(volumes);
          useWishlistStore.getState().hydrateFromCatalog(volumes);
          hydrated = true;
          previous = JSON.stringify(snapshot(useStorefrontStore.getState() as unknown as Record<string, unknown>));
        }
      }
    };

    void load();
    const retryLoad = () => { if (!useStorefrontStore.getState().catalogLoaded) void load(); };
    window.addEventListener("online", retryLoad);
    window.addEventListener("kairo:retry-catalog", retryLoad);

    // The most recent edit, held so a failed save can be retried with the
    // latest state rather than whatever was in flight when it broke.
    let queued: string | null = null;
    let attempt = 0;
    const report = useCuratorSaveStore.getState().report;

    const describe = (status: number, body: { message?: string } | null): string => {
      if (status === 403) return "Your curator session expired. Sign in again to keep editing.";
      if (status === 413) return "This change is too large to store. Try removing some preview pages or artwork.";
      // The server explains what it rejected (a figure without variants, a box
      // set containing a poster…); show that rather than a generic line.
      if (status === 400) return body?.message || "The server rejected this change as malformed.";
      return body?.message || `The server refused the change (${status}).`;
    };

    const push = async (): Promise<void> => {
      if (!queued || !active) return;
      const body = queued;
      report("saving");
      try {
        const response = await fetch("/api/storefront", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body,
        });
        const payload = await response.json().catch(() => null);
        if (!active) return;

        if (response.ok && payload?.success) {
          attempt = 0;
          // Another edit may have landed while this request was in flight; only
          // clear the queue if it is still the one we just sent.
          if (queued === body) queued = null;
          report(queued ? "pending" : "saved");
          if (queued) void push();
          return;
        }

        // A rejected payload is not worth repeating — it will be rejected
        // again — so those surface at once. A transport failure might be a
        // blip, and is retried below.
        report("error", describe(response.status, payload));
      } catch {
        if (!active) return;
        attempt += 1;
        if (attempt <= 2) {
          report("pending");
          retryTimer = setTimeout(() => void push(), attempt * 1500);
          return;
        }
        report("error", "Could not reach the server. Your change is still here — check your connection and retry.");
      }
    };

    // Exposed so the console's own retry control pushes the same queued state.
    useCuratorSaveStore.getState().setRetry(() => {
      attempt = 0;
      void push();
    });

    // The curator console edits and saves whole products, so it needs their
    // long text, which pages otherwise load without (lib/catalogDetails.ts).
    const loadDetailsForCurator = () => {
      if (useStorefrontStore.getState().isAdminAuthenticated) void ensureCatalogDetails().catch(() => {});
    };
    loadDetailsForCurator();

    const unsubscribe = useStorefrontStore.subscribe((state) => {
      if (state.isAdminAuthenticated) loadDetailsForCurator();
      if (!hydrated || !state.isAdminAuthenticated) return;
      const data = snapshot(state as unknown as Record<string, unknown>);
      const next = JSON.stringify(data);
      // Details arriving from the server are not an edit: take them as the new
      // baseline instead of saving the catalogue back.
      if (isMergingCatalogDetails()) {
        previous = next;
        return;
      }
      if (next === previous) return;
      previous = next;
      queued = JSON.stringify({ data });
      report("pending");
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void push(), 600);
    });

    return () => {
      active = false;
      window.removeEventListener("online", retryLoad);
      window.removeEventListener("kairo:retry-catalog", retryLoad);
      if (timer) clearTimeout(timer);
      if (retryTimer) clearTimeout(retryTimer);
      useCuratorSaveStore.getState().setRetry(null);
      unsubscribe();
    };
  }, []);

  // A change sits in a 600ms debounce before it is sent, and a failed one sits
  // in the queue until it is retried. Closing the tab in either window used to
  // discard the work without a word.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      const { status } = useCuratorSaveStore.getState();
      if (!useStorefrontStore.getState().isAdminAuthenticated) return;
      if (!hasUnsavedCuratorWork(status)) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  if (!catalogError) return null;
  return <div role="alert" dir={isArabic ? "rtl" : "ltr"} className="fixed bottom-4 inset-x-4 z-[250] bg-ink border border-gold p-4 text-center text-paper">
    <p>{isArabic ? "تعذّر تحميل المنتجات" : "Couldn’t load the catalogue"}</p>
    <button className="mt-2 underline text-gold" onClick={() => window.dispatchEvent(new Event("kairo:retry-catalog"))}>{isArabic ? "حاول مرة أخرى" : "Try again"}</button>
  </div>;
}
