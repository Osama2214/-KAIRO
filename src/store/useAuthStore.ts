import { create } from "zustand";
import {
  clearSessionCookie,
  sanitizeInput,
  validatePassword,
  validateEmail,
  verifyEmailAddress,
} from "@/lib/security";
import { useCartStore, CartItem } from "./useCartStore";
import { useWishlistStore } from "./useWishlistStore";
import { MangaVolume } from "@/data/manga";

export interface SavedOrderItem {
  id?: string;
  volumeId?: string;
  title?: string;
  seriesTitle?: string;
  volumeNumber?: number | string;
  coverImage?: string;
  format?: string;
  price?: number;
  quantity?: number;
  [key: string]: unknown;
}

export interface SavedOrder {
  id: string;
  date: string;
  items: SavedOrderItem[];
  subtotal: number;
  shippingCost: number;
  discountAmount?: number;
  appliedCoupon?: string;
  total: number;
  status: string;
  paymentMethod?: "cash" | "wallet" | "instapay" | string;
  paymentStatus?: "Pending Collection" | "Pending Verification" | "Verified & Paid" | string;
  paymentSenderDetail?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerGovernorate?: string;
  customerCity?: string;
  deliveryNotes?: string;
  timeline: string[];
  trackingNumber?: string;
  trackingUrl?: string;
  courier?: string;
  estimatedDelivery?: string;
  createdAt?: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role?: "admin" | "customer";
  avatar?: string;
  provider?: "credentials" | "google";
  phone: string;
  governorate: string;
  city?: string;
  address: string;
  deliveryNotes?: string;
  preferredPaymentMethod?: "cash" | "wallet" | "instapay";
  paymentSenderDetail?: string;
  tier: "Collector" | "Deluxe Patron" | "Archive Master";
  joinedDate: string;
  orders: SavedOrder[];
  cart?: CartItem[];
  wishlist?: MangaVolume[];
}

interface AuthState {
  currentUser: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Auth actions
  login: (email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: {
    name: string;
    email: string;
    password?: string;
    phone: string;
    governorate: string;
    address: string;
  }) => Promise<{ success: boolean; message?: string }>;
  loginWithGoogle: (profile: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    role?: "admin" | "customer";
    phone?: string;
    governorate?: string;
    city?: string;
    address?: string;
    deliveryNotes?: string;
    joinedDate?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => void;
  addOrderToUser: (order: SavedOrder) => void;
  updateOrderStatus: (orderId: string, updates: Partial<SavedOrder>) => void;
  initSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  isLoading: false,
  isInitialized: false,

  initSession: async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });

      // 401 is still honoured for older deployments; the route now answers 200
      // with authenticated:false, since "not signed in" is not a client error.
      if (res.status === 401) {
        set({ currentUser: null, isInitialized: true });
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (data.authenticated === false) {
          set({ currentUser: null, isInitialized: true });
          return;
        }
        if (data.authenticated && data.user) {
          const userWithOffer: UserProfile = {
            ...data.user,
            tier: data.user.role === "admin" ? "Archive Master" : "Collector",
            orders: [],
          };
          set({ currentUser: userWithOffer, isInitialized: true });

          // Fetch user's authentic orders from server
          try {
            const ordersRes = await fetch("/api/orders/mine", { cache: "no-store" });
            if (ordersRes.ok) {
              const ordersData = await ordersRes.json();
              if (ordersData.success && Array.isArray(ordersData.orders)) {
                set((state) => ({
                  currentUser: state.currentUser ? { ...state.currentUser, orders: ordersData.orders } : null,
                }));
              }
            }
          } catch {}
          return;
        }
      }

      // Non-401 unexpected response — don't touch currentUser, just mark initialized
      set((state) => ({ ...state, isInitialized: true }));
    } catch {
      // Network/fetch error — don't log the user out, just mark initialized
      set((state) => ({ ...state, isInitialized: true }));
    }
  },

  login: async (email: string, password?: string) => {
    const normalizedEmail = sanitizeInput(email).toLowerCase();

    if (!validateEmail(normalizedEmail)) {
      return { success: false, message: "Please enter a valid email address." };
    }
    if (!password) {
      return { success: false, message: "Password is required." };
    }

    set({ isLoading: true });
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        set({ isLoading: false });
        return { success: false, message: data.message || "Failed to sign in." };
      }

      const rawUser = data.user;
      const userProfile: UserProfile = {
        id: rawUser.id,
        name: rawUser.name,
        email: rawUser.email,
        role: rawUser.role,
        phone: rawUser.phone,
        governorate: rawUser.governorate,
        city: rawUser.city,
        address: rawUser.address,
        deliveryNotes: rawUser.deliveryNotes,
        tier: rawUser.role === "admin" ? "Archive Master" : "Collector",
        joinedDate: rawUser.joinedDate || new Date().toISOString().split("T")[0],
        orders: [],
      };

      set({ currentUser: userProfile, isLoading: false });

      // Fetch authentic orders
      try {
        const ordersRes = await fetch("/api/orders/mine", { cache: "no-store" });
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          if (ordersData.success && Array.isArray(ordersData.orders)) {
            set((state) => ({
              currentUser: state.currentUser ? { ...state.currentUser, orders: ordersData.orders } : null,
            }));
          }
        }
      } catch {}

      return { success: true };
    } catch {
      set({ isLoading: false });
      return { success: false, message: "Network error connecting to security server." };
    }
  },

  register: async (data) => {
    const normalizedEmail = sanitizeInput(data.email).toLowerCase();

    if (!validateEmail(normalizedEmail)) {
      return { success: false, message: "Please enter a valid email address (e.g. name@domain.com)." };
    }

    const emailCheck = await verifyEmailAddress(normalizedEmail);
    if (!emailCheck.valid) {
      return { success: false, message: emailCheck.message || "Email address domain is unreachable." };
    }

    const passValidation = validatePassword(data.password || "");
    if (!passValidation.isValid) {
      return { success: false, message: passValidation.message || "Password must be at least 8 characters with letters & numbers." };
    }

    const cleanName = sanitizeInput(data.name);
    const cleanPhone = sanitizeInput(data.phone);
    const cleanGovernorate = sanitizeInput(data.governorate);
    const cleanAddress = sanitizeInput(data.address);

    if (!cleanName || !cleanAddress) {
      return { success: false, message: "Full name and delivery address are required." };
    }

    set({ isLoading: true });
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          password: data.password,
          name: cleanName,
          phone: cleanPhone,
          governorate: cleanGovernorate,
          address: cleanAddress,
        }),
      });
      const resData = await res.json().catch(() => ({}));

      if (!res.ok || !resData.success) {
        set({ isLoading: false });
        return { success: false, message: resData.message || "Registration failed." };
      }

      const rawUser = resData.user;
      const newUser: UserProfile = {
        id: rawUser.id,
        name: rawUser.name,
        email: rawUser.email,
        role: rawUser.role || "customer",
        phone: rawUser.phone,
        governorate: rawUser.governorate,
        city: rawUser.city,
        address: rawUser.address,
        deliveryNotes: rawUser.deliveryNotes,
        tier: "Collector",
        joinedDate: rawUser.joinedDate || new Date().toISOString().split("T")[0],
        orders: [],
      };

      set({ currentUser: newUser, isLoading: false });
      return { success: true };
    } catch {
      set({ isLoading: false });
      return { success: false, message: "Network error connecting to registration server." };
    }
  },

  // `profile` must come from /api/auth/google, which persists the patron and
  // sets the HttpOnly session cookie. Never synthesise an identity here — a
  // client-only profile disappears on the next refresh.
  loginWithGoogle: async (profile) => {
    const normalizedEmail = sanitizeInput(profile.email).toLowerCase();
    if (!profile.id || !validateEmail(normalizedEmail)) {
      return { success: false, message: "Invalid email from Google account." };
    }

    const user: UserProfile = {
      id: profile.id,
      name: sanitizeInput(profile.name) || "Google Patron",
      email: normalizedEmail,
      role: profile.role || "customer",
      avatar: profile.avatar,
      provider: "google",
      phone: profile.phone || "",
      governorate: profile.governorate || "Cairo",
      city: profile.city,
      address: profile.address || "",
      deliveryNotes: profile.deliveryNotes,
      tier: profile.role === "admin" ? "Archive Master" : "Collector",
      joinedDate: profile.joinedDate || new Date().toISOString().split("T")[0],
      orders: [],
    };

    set({ currentUser: user });

    // Pull authentic orders now that a real server session exists.
    try {
      const ordersRes = await fetch("/api/orders/mine", { cache: "no-store" });
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        if (ordersData.success && Array.isArray(ordersData.orders)) {
          set((state) => ({
            currentUser: state.currentUser ? { ...state.currentUser, orders: ordersData.orders } : null,
          }));
        }
      }
    } catch {}

    return { success: true };
  },

  logout: async () => {
    clearSessionCookie();
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      await fetch("/api/admin/verify-session", { method: "DELETE" });
    } catch {}

    try {
      useCartStore.getState().clearCart();
      useWishlistStore.getState().clearWishlist();
    } catch {}

    set({ currentUser: null });
  },

  updateProfile: (data) => {
    const currentUser = get().currentUser;
    if (!currentUser) return;

    const cleanData: Partial<UserProfile> = {};
    if (data.name !== undefined) cleanData.name = sanitizeInput(data.name);
    if (data.phone !== undefined) cleanData.phone = sanitizeInput(data.phone);
    if (data.address !== undefined) cleanData.address = sanitizeInput(data.address);
    if (data.governorate !== undefined) cleanData.governorate = sanitizeInput(data.governorate);
    if (data.city !== undefined) cleanData.city = sanitizeInput(data.city);
    if (data.deliveryNotes !== undefined) cleanData.deliveryNotes = sanitizeInput(data.deliveryNotes);
    if (data.preferredPaymentMethod !== undefined) cleanData.preferredPaymentMethod = data.preferredPaymentMethod;
    if (data.paymentSenderDetail !== undefined) cleanData.paymentSenderDetail = sanitizeInput(data.paymentSenderDetail);

    set({ currentUser: { ...currentUser, ...cleanData } });
  },

  addOrderToUser: (order: SavedOrder) => {
    const currentUser = get().currentUser;
    if (!currentUser) return;

    const filtered = (currentUser.orders || []).filter((o) => o.id !== order.id);
    set({
      currentUser: {
        ...currentUser,
        orders: [order, ...filtered],
      },
    });
  },

  updateOrderStatus: (orderId: string, updates: Partial<SavedOrder>) => {
    const currentUser = get().currentUser;
    if (!currentUser || !Array.isArray(currentUser.orders)) return;

    const newOrders = currentUser.orders.map((o) =>
      o.id === orderId ? { ...o, ...updates } : o
    );
    set({ currentUser: { ...currentUser, orders: newOrders } });
  },
}));
