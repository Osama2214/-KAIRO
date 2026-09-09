"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useMounted } from "@/store/useWishlistStore";

type ServerCoupon = { code: string; expiresAt: number; used: boolean; discountPercent: number };

/**
 * Resolves the signed-in patron's welcome coupon.
 *
 * Eligibility is decided in one place so every surface agrees. Previously
 * `hasOffer` ignored expiry: the banner and header bar ran their own countdown
 * and hid themselves, while the cart, checkout and product prompts trusted
 * `hasOffer` alone — so an expired-but-unused coupon disappeared from some
 * places and lingered in others.
 */
export function useWelcomeOffer() {
  const mounted = useMounted();
  const currentUser = useAuthStore((state) => state.currentUser);
  // Tagged with the owner's e-mail so a coupon fetched for one patron is never
  // shown to the next one to sign in on the same device.
  const [entry, setEntry] = useState<{ email: string; coupon: ServerCoupon } | null>(null);

  useEffect(() => {
    if (!mounted || !currentUser) return;
    const owner = currentUser.email;
    let cancelled = false;
    let attempts = 0;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      const response = await fetch("/api/coupons/welcome", { cache: "no-store" }).catch(() => null);
      const data = response ? await response.json().catch(() => null) : null;
      if (cancelled) return;

      if (data?.success) {
        // A successful response with no coupon is a real answer: this patron is
        // not eligible. Retrying it three times only delayed the same result.
        const offered: ServerCoupon | null = data.coupon ?? null;
        const msLeft = offered ? offered.expiresAt - Date.now() : 0;
        const usable = Boolean(offered && !offered.used && msLeft > 0);
        setEntry(usable && offered ? { email: owner, coupon: offered } : null);

        // Drop it the moment it lapses, so a page left open stops offering it.
        if (usable && msLeft < 24 * 60 * 60 * 1000) {
          expiryTimer = setTimeout(() => {
            if (!cancelled) setEntry(null);
          }, msLeft);
        }
        return;
      }

      if (attempts++ < 3) window.setTimeout(load, 500);
    };

    load();
    return () => {
      cancelled = true;
      if (expiryTimer) clearTimeout(expiryTimer);
    };
  }, [mounted, currentUser]);

  const coupon = entry && entry.email === currentUser?.email ? entry.coupon : null;

  return {
    // `coupon` is only ever set to a coupon that is unused and unexpired.
    hasOffer: Boolean(mounted && currentUser && coupon),
    voucherCode: coupon?.code || "",
    expiresAt: coupon?.expiresAt,
    discountPercent: coupon?.discountPercent ?? 0,
    currentUser,
    firstName: currentUser?.name ? currentUser.name.trim().split(" ")[0] : "PATRON",
    mounted,
  };
}
