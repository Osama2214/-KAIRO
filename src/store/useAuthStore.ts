import { create } from "zustand";
import {
  hashPassword,
  setSessionCookie,
  clearSessionCookie,
  getSessionCookie,
  validatePassword,
  validateEmail,
  sanitizeInput,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  verifyEmailAddress,
} from "@/lib/security";
import { useCartStore, CartItem } from "./useCartStore";
import { useWishlistStore } from "./useWishlistStore";
import { MangaVolume } from "@/data/manga";
import { INITIAL_ADMIN_ACCOUNTS, AUTHORIZED_ADMIN_EMAILS } from "@/config/adminConfig";

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
  timeline: string[];
  trackingNumber?: string;
  courier?: string;
  estimatedDelivery?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role?: "admin" | "customer";
  avatar?: string;
  provider?: "credentials" | "google";
  passwordHash?: string;
  password?: string; // Legacy fallback for backward-compatibility
  phone: string;
  governorate: string;
  address: string;
  tier: "Collector" | "Deluxe Patron" | "Archive Master";
  joinedDate: string;
  orders: SavedOrder[];
  cart?: CartItem[];
  wishlist?: MangaVolume[];
  welcomeOfferExpiresAt?: number;
  welcomeOfferClaimed?: boolean;
  welcomeDiscountCode?: string;
}

interface AuthState {
  currentUser: UserProfile | null;
  users: Record<string, UserProfile>;
  isLoading: boolean;

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
    email: string;
    name: string;
    avatar?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  resetPassword: (email: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<UserProfile>) => void;
  addOrderToUser: (order: SavedOrder) => void;
  updateOrderStatus: (orderId: string, updates: Partial<SavedOrder>) => void;
  loginDemo: () => void;
}

const MASTER_ADMIN: UserProfile = {
  id: "KRO-00001",
  name: INITIAL_ADMIN_ACCOUNTS[0]?.name || "Master Curator",
  email: (INITIAL_ADMIN_ACCOUNTS[0]?.email || "admin@kairo.archive").toLowerCase(),
  password: INITIAL_ADMIN_ACCOUNTS[0]?.password || "password123",
  role: "admin",
  phone: INITIAL_ADMIN_ACCOUNTS[0]?.phone || "+20 100 000 0000",
  governorate: INITIAL_ADMIN_ACCOUNTS[0]?.governorate || "Cairo",
  address: "KAIRO Archival Headquarters, Zamalek, Cairo, Egypt",
  tier: "Archive Master",
  joinedDate: "2026-01-01",
  orders: [],
};

const SECOND_ADMIN = INITIAL_ADMIN_ACCOUNTS[1] || INITIAL_ADMIN_ACCOUNTS[0];

const DEMO_USER: UserProfile = {
  id: "KRO-88219",
  name: SECOND_ADMIN.name,
  email: SECOND_ADMIN.email.toLowerCase(),
  password: SECOND_ADMIN.password,
  role: "admin",
  phone: SECOND_ADMIN.phone || "+20 100 234 5678",
  governorate: SECOND_ADMIN.governorate || "Giza",
  address: "Al Motamayez District, 6th of October City, Giza, Egypt",
  tier: "Collector",
  joinedDate: "2026-01-15",
  orders: [
    {
      id: "KRO-1582",
      date: "2026-09-06",
      trackingNumber: "EG-OCT-9842-CAI",
      courier: "Bosta Egypt Express — 6th of October Hub",
      estimatedDelivery: "Sep 08 – Sep 09, 2026 (All Egypt Delivery)",
      subtotal: 87.96,
      shippingCost: 0,
      total: 87.96,
      status: "In Transit",
      timeline: ["Order Confirmed", "Dispatched from 6th of October Hub", "Out for Delivery"],
      items: [
        {
          id: "csm-01",
          volumeId: "csm-01",
          title: "Dog & Chainsaw",
          seriesTitle: "Chainsaw Man",
          volumeNumber: 1,
          price: 11.99,
          coverImage: "https://dw9to29mmj727.cloudfront.net/products/1974709930.jpg",
          format: "Manga",
          quantity: 1,
        },
        {
          id: "op-02",
          volumeId: "op-02",
          title: "Buggy the Clown",
          seriesTitle: "One Piece",
          volumeNumber: 2,
          price: 12.99,
          coverImage: "https://dw9to29mmj727.cloudfront.net/products/159116057X.jpg",
          format: "Manga",
          quantity: 1,
        },
        {
          id: "berserk-01",
          volumeId: "berserk-01",
          title: "Deluxe Edition Vol. 01",
          seriesTitle: "Berserk",
          volumeNumber: 1,
          price: 49.99,
          coverImage: "https://images-na.ssl-images-amazon.com/images/P/1506711987.01._SX700_SCLZZZZZZZ_.jpg",
          format: "Deluxe Edition",
          quantity: 1,
        },
        {
          id: "op-01",
          volumeId: "op-01",
          title: "Romance Dawn",
          seriesTitle: "One Piece",
          volumeNumber: 1,
          price: 12.99,
          coverImage: "https://dw9to29mmj727.cloudfront.net/products/1569319014.jpg",
          format: "Manga",
          quantity: 1,
        },
      ],
    },
  ],
};

function getStoredUsers(): Record<string, UserProfile> {
  const initialAdminSet: Record<string, UserProfile> = {};

  INITIAL_ADMIN_ACCOUNTS.forEach((acc, idx) => {
    const email = acc.email.toLowerCase();
    if (email === DEMO_USER.email.toLowerCase()) {
      initialAdminSet[email] = DEMO_USER;
    } else {
      initialAdminSet[email] = {
        id: `KRO-ADM0${idx + 1}`,
        name: acc.name,
        email,
        password: acc.password,
        role: "admin",
        phone: acc.phone || "+20 100 000 0000",
        governorate: acc.governorate || "Cairo",
        address: "KAIRO Headquarters, Cairo, Egypt",
        tier: "Archive Master",
        joinedDate: "2026-01-01",
        orders: [],
      };
    }
  });

  if (typeof window === "undefined") return initialAdminSet;
  try {
    const raw = localStorage.getItem("kairo_users_db");
    if (!raw) {
      localStorage.setItem("kairo_users_db", JSON.stringify(initialAdminSet));
      return initialAdminSet;
    }
    const parsed = JSON.parse(raw);

    // Ensure all configured admin accounts exist with role="admin" and updated password
    INITIAL_ADMIN_ACCOUNTS.forEach((acc) => {
      const email = acc.email.toLowerCase();
      if (!parsed[email]) {
        parsed[email] = initialAdminSet[email] || {
          id: `KRO-${Math.floor(10000 + Math.random() * 90000)}`,
          name: acc.name,
          email,
          password: acc.password,
          role: "admin",
          phone: acc.phone || "+20 100 000 0000",
          governorate: acc.governorate || "Cairo",
          address: "KAIRO Headquarters, Cairo, Egypt",
          tier: "Archive Master",
          joinedDate: "2026-01-01",
          orders: [],
        };
      } else {
        parsed[email].role = "admin";
        parsed[email].name = acc.name;
        if (acc.password) {
          parsed[email].password = acc.password;
        }
      }
    });

    // Ensure all AUTHORIZED_ADMIN_EMAILS have role="admin"
    AUTHORIZED_ADMIN_EMAILS.forEach((admEmail) => {
      const norm = admEmail.trim().toLowerCase();
      if (parsed[norm]) {
        parsed[norm].role = "admin";
      }
    });

    return parsed;
  } catch (e) {
    console.error("Failed to load users db", e);
    return initialAdminSet;
  }
}

function getStoredActiveUser(users: Record<string, UserProfile>): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const activeEmail = localStorage.getItem("kairo_active_session");
    
    // Explicitly logged out: never fall back to DEMO_USER and purge leftover state
    if (activeEmail === "logged_out") {
      try {
        localStorage.removeItem("kairo_orders");
        localStorage.removeItem("kairo_cart_storage");
        localStorage.removeItem("kairo_wishlist_storage");
        useCartStore.getState().clearCart();
        useWishlistStore.getState().clearWishlist();
      } catch {
        // ignore
      }
      return null;
    }

    // Check secure session cookie
    const sessionCookie = getSessionCookie();
    if (sessionCookie && sessionCookie.email && users[sessionCookie.email.toLowerCase()]) {
      return ensureWelcomeOffer(users[sessionCookie.email.toLowerCase()]);
    }

    if (activeEmail && users[activeEmail.toLowerCase()]) {
      return ensureWelcomeOffer(users[activeEmail.toLowerCase()]);
    }

    // Default fallback to DEMO_USER only on initial brand new visit if never logged in or out
    if (activeEmail === null && !sessionCookie) {
      const demoUser = users[DEMO_USER.email.toLowerCase()] || DEMO_USER;
      return ensureWelcomeOffer(demoUser);
    }

    return null;
  } catch (e) {
    console.error("Failed to load active session", e);
    return null;
  }
}

export function ensureWelcomeOffer(user: UserProfile): UserProfile {
  // If already claimed or user has existing orders, mark claimed
  const hasOrders = Array.isArray(user.orders) && user.orders.length > 0;
  if (user.welcomeOfferClaimed || hasOrders) {
    if (!user.welcomeOfferClaimed && hasOrders) {
      return { ...user, welcomeOfferClaimed: true };
    }
    return user;
  }

  const cleanFirstName = (user.name ? user.name.trim().split(" ")[0] : "PATRON")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const code = user.welcomeDiscountCode || `${cleanFirstName || "PATRON"}-FIRST20`;
  const expiresAt = user.welcomeOfferExpiresAt || (Date.now() + 24 * 60 * 60 * 1000);

  return {
    ...user,
    welcomeDiscountCode: code,
    welcomeOfferExpiresAt: expiresAt,
    welcomeOfferClaimed: false,
  };
}

export const useAuthStore = create<AuthState>((set, get) => {
  const initialUsers = typeof window !== "undefined" ? getStoredUsers() : { [DEMO_USER.email.toLowerCase()]: DEMO_USER };
  const initialCurrentUser = typeof window !== "undefined" ? getStoredActiveUser(initialUsers) : null;

  return {
    currentUser: initialCurrentUser,
    users: initialUsers,
    isLoading: false,

    login: async (email: string, password?: string) => {
      const normalizedEmail = sanitizeInput(email).toLowerCase();

      // 1. Check rate limit
      const rateLimit = checkRateLimit(normalizedEmail);
      if (!rateLimit.allowed) {
        return {
          success: false,
          message: `Too many failed attempts. Account locked for security. Please try again in ${rateLimit.remainingSeconds} seconds.`,
        };
      }

      // 2. Validate email structure
      if (!validateEmail(normalizedEmail)) {
        return {
          success: false,
          message: "Please enter a valid email address.",
        };
      }

      const users = get().users;
      const user = users[normalizedEmail];

      if (!user) {
        const attempt = recordFailedAttempt(normalizedEmail);
        return {
          success: false,
          message: attempt.locked
            ? `Too many failed attempts. Account locked for ${attempt.remainingSeconds} seconds.`
            : `No patron account found with this email. (${attempt.remainingAttempts} attempts left)`,
        };
      }

      // 3. Verify password
      if (password) {
        const enteredHash = await hashPassword(password);
        const storedHash = user.passwordHash;
        const legacyPlain = user.password;

        let passwordValid = false;
        if (storedHash) {
          passwordValid = enteredHash === storedHash;
        } else if (legacyPlain) {
          passwordValid = password === legacyPlain;
          // Auto-upgrade legacy plain text password to hashed format
          if (passwordValid) {
            user.passwordHash = enteredHash;
            delete user.password;
            const updatedUsers = { ...users, [normalizedEmail]: user };
            try {
              localStorage.setItem("kairo_users_db", JSON.stringify(updatedUsers));
            } catch (e) {
              console.error(e);
            }
            set({ users: updatedUsers });
          }
        }

        if (!passwordValid) {
          const attempt = recordFailedAttempt(normalizedEmail);
          return {
            success: false,
            message: attempt.locked
              ? `Account locked due to consecutive failed attempts. Please wait ${attempt.remainingSeconds} seconds.`
              : `Incorrect password. ${attempt.remainingAttempts} attempt(s) remaining.`,
          };
        }
      }

      // Authentication successful: reset rate limiter
      resetRateLimit(normalizedEmail);

      // Establish secure session cookie and localStorage state
      setSessionCookie(user.id, normalizedEmail);

      try {
        localStorage.setItem("kairo_active_session", normalizedEmail);
        localStorage.setItem("kairo_orders", JSON.stringify(user.orders || []));
      } catch (e) {
        console.error(e);
      }

      // Restore user's cart & wishlist
      try {
        if (user.cart && Array.isArray(user.cart)) {
          useCartStore.setState({ items: user.cart });
        } else {
          useCartStore.getState().clearCart();
        }
        if (user.wishlist && Array.isArray(user.wishlist)) {
          useWishlistStore.setState({ items: user.wishlist });
        } else {
          useWishlistStore.getState().clearWishlist();
        }
      } catch (e) {
        console.error("Failed to restore cart/wishlist", e);
      }

      const userWithOffer = ensureWelcomeOffer(user);
      const usersWithOffer = {
        ...get().users,
        [normalizedEmail]: userWithOffer,
      };
      try {
        localStorage.setItem("kairo_users_db", JSON.stringify(usersWithOffer));
      } catch (e) {
        console.error(e);
      }

      set({ currentUser: userWithOffer, users: usersWithOffer });
      return { success: true };
    },

    register: async (data) => {
      const normalizedEmail = sanitizeInput(data.email).toLowerCase();

      // 1. Email format and real MX server check
      if (!validateEmail(normalizedEmail)) {
        return {
          success: false,
          message: "Please enter a valid email address (e.g., patron@domain.com).",
        };
      }

      const emailCheck = await verifyEmailAddress(normalizedEmail);
      if (!emailCheck.valid) {
        return {
          success: false,
          message: emailCheck.message || "Email address domain does not exist or has no active mail servers.",
        };
      }

      // 2. Password strength validation
      const passValidation = validatePassword(data.password || "");
      if (!passValidation.isValid) {
        return {
          success: false,
          message: passValidation.message || "Password must be at least 8 characters with letters & numbers.",
        };
      }

      const users = get().users;
      if (users[normalizedEmail]) {
        return { success: false, message: "An account already exists with this email. Please sign in." };
      }

      // 3. Sanitize profile inputs
      const cleanName = sanitizeInput(data.name);
      const cleanPhone = sanitizeInput(data.phone);
      const cleanGovernorate = sanitizeInput(data.governorate);
      const cleanAddress = sanitizeInput(data.address);

      if (!cleanName) {
        return { success: false, message: "Please provide your full name." };
      }
      if (!cleanAddress) {
        return { success: false, message: "Please provide your delivery address in Egypt." };
      }

      // 4. Compute cryptographic salted hash
      const passHash = await hashPassword(data.password || "");

      // Generate unique Japanese Archive Patron ID
      const randomDigits = Math.floor(10000 + Math.random() * 90000);
      const newId = `KRO-${randomDigits}`;
      const cleanFirstName = (cleanName.trim().split(" ")[0] || "PATRON")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

      const newUser: UserProfile = {
        id: newId,
        name: cleanName,
        email: normalizedEmail,
        role: "customer",
        passwordHash: passHash,
        phone: cleanPhone || "+20 100 000 0000",
        governorate: cleanGovernorate || "Cairo",
        address: cleanAddress,
        tier: "Collector",
        joinedDate: new Date().toISOString().split("T")[0],
        orders: [],
        cart: [],
        wishlist: [],
        welcomeOfferExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
        welcomeOfferClaimed: false,
        welcomeDiscountCode: `${cleanFirstName || "PATRON"}-FIRST20`,
      };

      const updatedUsers = {
        ...users,
        [normalizedEmail]: newUser,
      };

      try {
        localStorage.setItem("kairo_users_db", JSON.stringify(updatedUsers));
        localStorage.setItem("kairo_active_session", normalizedEmail);
        localStorage.setItem("kairo_orders", JSON.stringify([]));
        localStorage.removeItem("kairo_cart_storage");
        localStorage.removeItem("kairo_wishlist_storage");
        useCartStore.getState().clearCart();
        useWishlistStore.getState().clearWishlist();
      } catch (e) {
        console.error(e);
      }

      // Set session cookie
      setSessionCookie(newId, normalizedEmail);

      set({ users: updatedUsers, currentUser: newUser });
      return { success: true };
    },

    logout: () => {
      const currentUser = get().currentUser;
      if (currentUser) {
        // 1. Back up user's cart and wishlist to their profile in database
        try {
          const currentCart = useCartStore.getState().items;
          const currentWishlist = useWishlistStore.getState().items;
          const updatedUser: UserProfile = {
            ...currentUser,
            cart: currentCart,
            wishlist: currentWishlist,
          };
          const users = {
            ...get().users,
            [updatedUser.email.toLowerCase()]: updatedUser,
          };
          localStorage.setItem("kairo_users_db", JSON.stringify(users));
          set({ users });
        } catch (e) {
          console.error("Failed to save cart/wishlist to user profile", e);
        }
      }

      // 2. Thoroughly wipe session cookie
      clearSessionCookie();

      // 3. Clear sensitive session data and cart/wishlist from localStorage
      try {
        localStorage.setItem("kairo_active_session", "logged_out");
        localStorage.removeItem("kairo_orders");
        localStorage.removeItem("kairo_cart_storage");
        localStorage.removeItem("kairo_wishlist_storage");
      } catch (e) {
        console.error("Failed to clear local session", e);
      }

      // 4. Clear active in-memory cart and wishlist stores
      try {
        useCartStore.getState().clearCart();
        useWishlistStore.getState().clearWishlist();
      } catch (e) {
        console.error("Failed to clear cart/wishlist stores", e);
      }

      // 5. Reset in-memory authenticated state
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

      const updatedUser: UserProfile = {
        ...currentUser,
        ...cleanData,
      };

      const users = {
        ...get().users,
        [updatedUser.email.toLowerCase()]: updatedUser,
      };

      try {
        localStorage.setItem("kairo_users_db", JSON.stringify(users));
        localStorage.setItem("kairo_active_session", updatedUser.email.toLowerCase());
      } catch (e) {
        console.error(e);
      }

      set({ currentUser: updatedUser, users });
    },

    addOrderToUser: (order: SavedOrder) => {
      const currentUser = get().currentUser;
      if (!currentUser) return;

      const filteredExisting = (currentUser.orders || []).filter((o) => o.id !== order.id);
      const updatedOrders = [order, ...filteredExisting];
      const updatedUser: UserProfile = {
        ...currentUser,
        orders: updatedOrders,
        welcomeOfferClaimed: true,
      };

      const users = {
        ...get().users,
        [updatedUser.email.toLowerCase()]: updatedUser,
      };

      try {
        localStorage.setItem("kairo_users_db", JSON.stringify(users));
        localStorage.setItem("kairo_orders", JSON.stringify(updatedOrders));
      } catch (e) {
        console.error(e);
      }

      set({ currentUser: updatedUser, users });
    },

    updateOrderStatus: (orderId: string, updates: Partial<SavedOrder>) => {
      const state = get();

      // 1. Update in all users dictionary
      const updatedUsers = { ...state.users };
      for (const email of Object.keys(updatedUsers)) {
        const user = updatedUsers[email];
        if (user && Array.isArray(user.orders) && user.orders.some((o) => o.id === orderId)) {
          const newOrders = user.orders.map((o) => {
            if (o.id === orderId) {
              return { ...o, ...updates };
            }
            return o;
          });
          updatedUsers[email] = { ...user, orders: newOrders };
        }
      }

      // 2. Update in current user session if order belongs to them
      let updatedCurrentUser = state.currentUser;
      if (
        state.currentUser &&
        Array.isArray(state.currentUser.orders) &&
        state.currentUser.orders.some((o) => o.id === orderId)
      ) {
        const newOrders = state.currentUser.orders.map((o) =>
          o.id === orderId ? { ...o, ...updates } : o
        );
        updatedCurrentUser = { ...state.currentUser, orders: newOrders };
      }

      // 3. Update in global persistent storage
      try {
        const raw = localStorage.getItem("kairo_orders");
        if (raw) {
          const list: SavedOrder[] = JSON.parse(raw);
          if (Array.isArray(list)) {
            const updatedList = list.map((o) => (o.id === orderId ? { ...o, ...updates } : o));
            localStorage.setItem("kairo_orders", JSON.stringify(updatedList));
          }
        }
        localStorage.setItem("kairo_users_db", JSON.stringify(updatedUsers));
      } catch (e) {
        console.error("Failed to persist order updates:", e);
      }

      set({ users: updatedUsers, currentUser: updatedCurrentUser });
    },

    loginDemo: () => {
      const users = get().users;
      const rawDemo = users[DEMO_USER.email.toLowerCase()] || DEMO_USER;
      const demo = ensureWelcomeOffer(rawDemo);

      resetRateLimit(DEMO_USER.email);
      setSessionCookie(demo.id, DEMO_USER.email.toLowerCase());

      try {
        localStorage.setItem("kairo_active_session", DEMO_USER.email.toLowerCase());
        localStorage.setItem("kairo_orders", JSON.stringify(demo.orders || []));
      } catch (e) {
        console.error(e);
      }

      // Restore demo user's cart & wishlist
      try {
        if (demo.cart && Array.isArray(demo.cart)) {
          useCartStore.setState({ items: demo.cart });
        } else {
          useCartStore.getState().clearCart();
        }
        if (demo.wishlist && Array.isArray(demo.wishlist)) {
          useWishlistStore.setState({ items: demo.wishlist });
        } else {
          useWishlistStore.getState().clearWishlist();
        }
      } catch (e) {
        console.error(e);
      }

      set({ currentUser: demo });
    },

    loginWithGoogle: async (profile) => {
      const normalizedEmail = sanitizeInput(profile.email).toLowerCase();
      if (!validateEmail(normalizedEmail)) {
        return { success: false, message: "Invalid email from Google account." };
      }

      const users = get().users;
      let user = users[normalizedEmail];

      if (!user) {
        // Register new patron with Google profile
        const randomDigits = Math.floor(10000 + Math.random() * 90000);
        const newId = `KRO-${randomDigits}`;
        const name = sanitizeInput(profile.name) || "Google Patron";
        const cleanFirstName = (name.trim().split(" ")[0] || "PATRON")
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "");

        user = {
          id: newId,
          name,
          email: normalizedEmail,
          avatar: profile.avatar,
          provider: "google",
          phone: "+20 100 000 0000",
          governorate: "Cairo",
          address: "Central Archival Hub, Cairo",
          tier: "Collector",
          joinedDate: new Date().toISOString().split("T")[0],
          orders: [],
          cart: [],
          wishlist: [],
          welcomeOfferExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
          welcomeOfferClaimed: false,
          welcomeDiscountCode: `${cleanFirstName || "PATRON"}-FIRST20`,
        };

        const updatedUsers = {
          ...users,
          [normalizedEmail]: user,
        };

        try {
          localStorage.setItem("kairo_users_db", JSON.stringify(updatedUsers));
        } catch (e) {
          console.error(e);
        }

        set({ users: updatedUsers });
      } else {
        if (profile.avatar && !user.avatar) {
          user = { ...user, avatar: profile.avatar, provider: "google" };
        }
        user = ensureWelcomeOffer(user);
        const updatedUsers = {
          ...users,
          [normalizedEmail]: user,
        };
        try {
          localStorage.setItem("kairo_users_db", JSON.stringify(updatedUsers));
        } catch (e) {
          console.error(e);
        }
        set({ users: updatedUsers });
      }

      // Establish session
      resetRateLimit(normalizedEmail);
      setSessionCookie(user.id, normalizedEmail);

      try {
        localStorage.setItem("kairo_active_session", normalizedEmail);
        localStorage.setItem("kairo_orders", JSON.stringify(user.orders || []));
      } catch (e) {
        console.error(e);
      }

      // Restore user's cart & wishlist
      try {
        if (user.cart && Array.isArray(user.cart)) {
          useCartStore.setState({ items: user.cart });
        } else {
          useCartStore.getState().clearCart();
        }
        if (user.wishlist && Array.isArray(user.wishlist)) {
          useWishlistStore.setState({ items: user.wishlist });
        } else {
          useWishlistStore.getState().clearWishlist();
        }
      } catch (e) {
        console.error("Failed to restore cart/wishlist", e);
      }

      set({ currentUser: user });
      return { success: true };
    },

    resetPassword: async (email: string, newPassword: string) => {
      const normalizedEmail = sanitizeInput(email).toLowerCase();
      if (!validateEmail(normalizedEmail)) {
        return { success: false, message: "Please enter a valid email address." };
      }

      const users = get().users;
      const user = users[normalizedEmail];
      if (!user) {
        return { success: false, message: "No patron account found with this email." };
      }

      const passValidation = validatePassword(newPassword);
      if (!passValidation.isValid) {
        return {
          success: false,
          message: passValidation.message || "Password must be at least 8 characters with letters & numbers.",
        };
      }

      const newHash = await hashPassword(newPassword);
      const updatedUser: UserProfile = {
        ...user,
        passwordHash: newHash,
      };
      delete updatedUser.password;

      const updatedUsers = {
        ...users,
        [normalizedEmail]: updatedUser,
      };

      try {
        localStorage.setItem("kairo_users_db", JSON.stringify(updatedUsers));
      } catch (e) {
        console.error("Failed to save updated password", e);
      }

      resetRateLimit(normalizedEmail);
      set({ users: updatedUsers });
      return { success: true };
    },
  };
});
