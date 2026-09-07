"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useMounted } from "@/store/useWishlistStore";

export function useWelcomeOffer() {
  const mounted = useMounted();
  const currentUser = useAuthStore((state) => state.currentUser);

  const expiresAt = currentUser?.welcomeOfferExpiresAt;
  const isClaimed = currentUser?.welcomeOfferClaimed;
  const voucherCode = currentUser?.welcomeDiscountCode || "WELCOME-FIRST20";
  const firstName = currentUser?.name ? currentUser.name.trim().split(" ")[0] : "PATRON";

  const [isExpired, setIsExpired] = useState(() => {
    if (!expiresAt) return false;
    return expiresAt <= Date.now();
  });

  useEffect(() => {
    if (!expiresAt) return;
    const remainingMs = expiresAt - Date.now();
    if (remainingMs <= 0) {
      return;
    }
    const timer = setTimeout(() => {
      setIsExpired(true);
    }, remainingMs);
    return () => clearTimeout(timer);
  }, [expiresAt]);

  const hasOffer = Boolean(
    mounted &&
    currentUser &&
    !isClaimed &&
    expiresAt &&
    !isExpired
  );

  return {
    hasOffer,
    voucherCode,
    expiresAt,
    isClaimed,
    currentUser,
    firstName,
    mounted,
  };
}
