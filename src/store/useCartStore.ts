import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MangaVolume } from "@/data/manga";

export interface CartItem {
  id: string;
  volumeId: string;
  title: string;
  seriesTitle: string;
  volumeNumber: number;
  price: number;
  coverImage: string;
  format: string;
  quantity: number;
  maxStock?: number;
}

interface CartState {
  items: CartItem[];
  appliedCoupon: string | null;
  hydrateFromCatalog: (volumes: MangaVolume[]) => void;
  discountPercent: number;
  /** Fixed amount off in EGP, alongside or instead of a percentage. */
  discountAmountOff: number;
  freeShippingGranted: boolean;
  addItem: (volume: MangaVolume, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  /** Asks the server whether the code is usable, then stages it. */
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getGrandTotal: (baseShipping?: number) => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      appliedCoupon: null,
      discountPercent: 0,
      discountAmountOff: 0,
      freeShippingGranted: false,
      addItem: (volume: MangaVolume, quantity = 1) => {
        const availableStock = typeof volume.stock === "number" ? volume.stock : 9999;
        if (availableStock <= 0) {
          return;
        }

        const currentItems = get().items;
        const existingIndex = currentItems.findIndex((item) => item.volumeId === volume.id);

        if (existingIndex > -1) {
          const currentQty = currentItems[existingIndex].quantity;
          const newQty = Math.min(currentQty + quantity, availableStock);
          const updated = [...currentItems];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: newQty,
            maxStock: availableStock,
            price: volume.price,
          };
          set({ items: updated });
        } else {
          const initialQty = Math.min(quantity, availableStock);
          const newItem: CartItem = {
            id: `${volume.id}-${Date.now()}`,
            volumeId: volume.id,
            title: volume.title,
            seriesTitle: volume.seriesTitle,
            volumeNumber: volume.volumeNumber,
            price: volume.price,
            coverImage: volume.coverImage,
            format: volume.format,
            quantity: initialQty,
            maxStock: availableStock,
          };
          set({ items: [...currentItems, newItem] });
        }
      },
      removeItem: (id: string) => {
        set({ items: get().items.filter((item) => item.id !== id) });
      },
      updateQuantity: (id: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        set({
          items: get().items.map((item) => {
            if (item.id !== id) return item;
            const max = typeof item.maxStock === "number" ? item.maxStock : 9999;
            const clampedQty = Math.min(quantity, max);
            return { ...item, quantity: clampedQty };
          }),
        });
      },
      clearCart: () => {
        set({ items: [], appliedCoupon: null, discountPercent: 0, discountAmountOff: 0, freeShippingGranted: false });
      },
      /**
       * Rebuilds the display fields of every cart line from the live catalogue.
       * Only the volume id and quantity survive a reload, so titles, cover art
       * and — importantly — prices are always the server's current values
       * rather than whatever was cached in this browser.
       */
      hydrateFromCatalog: (volumes: MangaVolume[]) => {
        if (!Array.isArray(volumes) || volumes.length === 0) return;
        const byId = new Map(volumes.map((volume) => [volume.id, volume]));
        set({
          items: get().items.flatMap((item) => {
            const volume = byId.get(item.volumeId);
            // A line whose product left the catalogue cannot be ordered.
            if (!volume) return [];
            const availableStock = typeof volume.stock === "number" ? volume.stock : 9999;
            return [{
              ...item,
              title: volume.title,
              seriesTitle: volume.seriesTitle,
              volumeNumber: volume.volumeNumber,
              price: volume.price,
              coverImage: volume.coverImage,
              format: volume.format,
              maxStock: availableStock,
              quantity: Math.max(1, Math.min(item.quantity, availableStock)),
            }];
          }),
        });
      },
      /**
       * Stages a code after the server agrees it is usable.
       *
       * The shape of the code no longer decides anything. It used to have to
       * match the one private format the welcome coupon issued, which is why a
       * curator could not create a code of their own — and the percentage was
       * pinned at 20 regardless of what was passed in. What a coupon is worth
       * now comes back from the server, and is confirmed again at checkout.
       */
      applyCoupon: async (code: string) => {
        const cleanCode = code.trim().toUpperCase();
        if (!cleanCode) {
          return { success: false, message: "Please enter a voucher code." };
        }

        try {
          const response = await fetch("/api/coupons/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: cleanCode }),
          });
          const payload = await response.json().catch(() => null);

          if (!payload?.success || !payload.coupon) {
            return {
              success: false,
              message: payload?.message || "That voucher code could not be used.",
            };
          }

          const { code: accepted, percentOff, amountOff, freeShipping } = payload.coupon;
          set({
            appliedCoupon: accepted,
            discountPercent: Number(percentOff) || 0,
            discountAmountOff: Number(amountOff) || 0,
            freeShippingGranted: Boolean(freeShipping),
          });
          return { success: true, message: `Voucher ${accepted} applied.` };
        } catch {
          return {
            success: false,
            message: "Could not reach the server to check that code.",
          };
        }
      },
      removeCoupon: () => {
        set({ appliedCoupon: null, discountPercent: 0, discountAmountOff: 0, freeShippingGranted: false });
      },
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      getSubtotal: () => {
        return get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
      },
      getDiscountAmount: () => {
        const subtotal = get().getSubtotal();
        const percent = get().discountPercent;
        const flat = get().discountAmountOff;
        const off = (percent > 0 ? (subtotal * percent) / 100 : 0) + (flat > 0 ? flat : 0);
        // Never more than the goods are worth; the server caps it the same way.
        return Math.min(subtotal, Math.round(off * 100) / 100);
      },
      getGrandTotal: (baseShipping = 0) => {
        const subtotal = get().getSubtotal();
        const discount = get().getDiscountAmount();
        const net = Math.max(0, subtotal - discount);
        const shipping = (get().freeShippingGranted || net >= 500) ? 0 : baseShipping;
        return Math.max(0, net + shipping);
      },
    }),
    {
      name: "kairo_cart_storage",
      // Persist the bare minimum: which product, how many. Titles, cover art
      // and prices are re-read from the catalogue on load, so a stale browser
      // can never show — or check out against — an out-of-date price.
      partialize: (state) => ({
        items: state.items.map((item) => ({
          id: item.id,
          volumeId: item.volumeId,
          quantity: item.quantity,
        })),
      }),
      merge: (persisted, current) => {
        const stored = (persisted as { items?: Array<Partial<CartItem>> } | undefined)?.items;
        if (!Array.isArray(stored)) return current;
        return {
          ...current,
          items: stored
            .filter((item): item is Partial<CartItem> & { volumeId: string } => Boolean(item?.volumeId))
            .map((item) => ({
              id: item.id || `${item.volumeId}-restored`,
              volumeId: item.volumeId,
              quantity: Math.max(1, Number(item.quantity) || 1),
              // Placeholders until hydrateFromCatalog runs with live data.
              title: "",
              seriesTitle: "",
              volumeNumber: 0,
              price: 0,
              coverImage: "",
              format: "",
            })),
        };
      },
    }
  )
);
