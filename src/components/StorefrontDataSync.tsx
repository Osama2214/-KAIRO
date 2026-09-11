"use client";

import { useEffect } from "react";
import { useStorefrontStore, wasSeededFromServer } from "@/store/useStorefrontStore";

import { useAuthStore } from "@/store/useAuthStore";
import { useCartStore } from "@/store/useCartStore";
import { useWishlistStore } from "@/store/useWishlistStore";
import { purgeLegacyGuestOrders } from "@/lib/guestOrders";

const DATA_KEYS = [
  "volumes", "series", "genres", "formats", "heroContent", "announcement", "shippingConfig",
  "editorialConfig", "featuredSeriesConfig", "genreBentoConfig", "trendingConfig", "boxSetsConfig", "tickerConfig",
  "newReleasesConfig", "mangaDiscoveryConfig", "heroArabicContent", "announcementArabic",
  "shippingArabicConfig", "editorialArabicConfig", "newReleasesArabicConfig", "mangaDiscoveryArabicConfig",
  "trendingArabicConfig", "boxSetsArabicConfig", "tickerArabicConfig", "genreBentoArabicConfig",
] as const;

function snapshot(state: Record<string, unknown>) {
  return Object.fromEntries(DATA_KEYS.map((key) => [key, state[key]]));
}

export function StorefrontDataSync() {
  useEffect(() => {
    // Remove the retired client-side CMS & users snapshots.
    try {
      localStorage.removeItem("kairo_storefront_cms_v3");
      localStorage.removeItem("kairo_users_db");
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
    let previous = "";

    const load = async () => {
      try {
        // The server already sent the catalogue with the page, so re-fetching it
        // would download the same ~70KB twice and could only ever tell us what
        // we were told a moment ago.
        if (!wasSeededFromServer()) {
          const response = await fetch("/api/storefront");
          const payload = await response.json().catch(() => null);
          if (active && payload?.success && payload.data && typeof payload.data === "object") {
            useStorefrontStore.setState(payload.data);
          }
        }
      } finally {
        // Only the live run may finish. A cancelled one — React's double-mount
        // in development, or a real unmount — had its own fetch result thrown
        // away by the `active` check above, so letting it fall through here
        // announced a catalogue that was never actually applied: pages then
        // resolved products against the defaults bundled at build time and
        // 404'd everything added since.
        if (active) {
          // Cart and wishlist persist ids only, so fill in titles, art and
          // prices here — unconditionally. Doing it only on a successful fetch
          // meant a storefront API outage left every restored cart line blank
          // at zero.
          const volumes = useStorefrontStore.getState().volumes;
          useCartStore.getState().hydrateFromCatalog(volumes);
          useWishlistStore.getState().hydrateFromCatalog(volumes);
          hydrated = true;
          // Pages that resolve a product by id wait on this before deciding it
          // is missing; it is set even on a failed fetch so an API outage shows
          // the bundled catalogue rather than hanging on a spinner.
          useStorefrontStore.setState({ catalogLoaded: true });
          previous = JSON.stringify(snapshot(useStorefrontStore.getState() as unknown as Record<string, unknown>));
        }
      }
    };

    void load();
    const unsubscribe = useStorefrontStore.subscribe((state) => {
      if (!hydrated || !state.isAdminAuthenticated) return;
      const data = snapshot(state as unknown as Record<string, unknown>);
      const next = JSON.stringify(data);
      if (next === previous) return;
      previous = next;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        fetch("/api/storefront", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        }).catch(() => {});
      }, 600);
    });

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  return null;
}
