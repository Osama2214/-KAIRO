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
  discountPercent: number;
  freeShippingGranted: boolean;
  addItem: (volume: MangaVolume, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  applyCoupon: (code: string, percent?: number, freeShipping?: boolean) => { success: boolean; message: string };
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
        set({ items: [], appliedCoupon: null, discountPercent: 0, freeShippingGranted: false });
      },
      applyCoupon: (code: string, _percent = 20, freeShipping = true) => {
        void _percent;
        const cleanCode = code.trim().toUpperCase();
        if (!cleanCode) {
          return { success: false, message: "Please enter a valid voucher code." };
        }

        // The browser can only stage a server-issued code. The API redeems it
        // atomically against Neon when the order is created.
        if (!/^KAIRO-[A-F0-9]{10}$/.test(cleanCode)) {
          return {
            success: false,
            message: "Use the private coupon shown on your account.",
          };
        }

        set({
          appliedCoupon: cleanCode,
          discountPercent: 20,
          freeShippingGranted: freeShipping,
        });
        return {
          success: true,
          message: `Voucher ${cleanCode} is ready for server verification.`,
        };
      },
      removeCoupon: () => {
        set({ appliedCoupon: null, discountPercent: 0, freeShippingGranted: false });
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
        if (percent <= 0) return 0;
        return (subtotal * percent) / 100;
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
    }
  )
);
