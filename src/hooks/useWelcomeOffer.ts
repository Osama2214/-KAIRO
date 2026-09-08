"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useMounted } from "@/store/useWishlistStore";

type ServerCoupon = { code: string; expiresAt: number; used: boolean; discountPercent: number };

export function useWelcomeOffer() {
  const mounted = useMounted();
  const currentUser = useAuthStore((state) => state.currentUser);
  const [coupon, setCoupon] = useState<ServerCoupon | null>(null);

  useEffect(() => {
    if (!mounted || !currentUser) {
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const load = async () => {
      const response = await fetch("/api/coupons/welcome", { cache: "no-store" }).catch(() => null);
      const data = response ? await response.json().catch(() => null) : null;
      if (!cancelled && data?.success && data.coupon) {
        setCoupon(data.coupon);
      } else if (!cancelled && attempts++ < 3) {
        window.setTimeout(load, 500);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [mounted, currentUser]);

  return {
    hasOffer: Boolean(mounted && currentUser && coupon && !coupon.used),
    voucherCode: coupon?.code || "",
    expiresAt: coupon?.expiresAt,
    isClaimed: coupon?.used ?? false,
    discountPercent: coupon?.discountPercent ?? 0,
    currentUser,
    firstName: currentUser?.name ? currentUser.name.trim().split(" ")[0] : "PATRON",
    mounted,
  };
}
