"use client";

import { useEffect } from "react";
import { useStorefrontStore } from "@/store/useStorefrontStore";

import { useAuthStore } from "@/store/useAuthStore";

const DATA_KEYS = [
  "volumes", "series", "genres", "formats", "heroContent", "announcement", "shippingConfig",
  "editorialConfig", "featuredSeriesConfig", "collectionConfig", "genreBentoConfig", "trendingConfig",
  "newReleasesConfig", "mangaDiscoveryConfig", "heroArabicContent", "announcementArabic",
  "shippingArabicConfig", "editorialArabicConfig", "newReleasesArabicConfig", "mangaDiscoveryArabicConfig",
  "trendingArabicConfig", "genreBentoArabicConfig", "arabicLanguageEnabled",
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

    // Initialize authentic patron session from server HttpOnly cookie
    void useAuthStore.getState().initSession();

    let active = true;
    let hydrated = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let previous = "";

    const load = async () => {
      try {
        const response = await fetch("/api/storefront", { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (active && payload?.success && payload.data && typeof payload.data === "object") {
          useStorefrontStore.setState(payload.data);
        }
      } finally {
        hydrated = true;
        previous = JSON.stringify(snapshot(useStorefrontStore.getState() as unknown as Record<string, unknown>));
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
