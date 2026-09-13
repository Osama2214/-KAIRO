"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  FileText,
  ShoppingBag,
  Settings,
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  LogOut,
  Download,
  Upload,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Sparkles,
  Award,
  Package,
  Shield,
  UserCheck,
  Printer,
  Truck,
  Filter,
  RefreshCw,
  Clock,
  Cloud,
  Megaphone,
  TrendingUp,
  LayoutTemplate,
  ShieldCheck,
  Star,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useStorefrontStore, TICKER_SLOTS, type ShippingConfig } from "@/store/useStorefrontStore";
import { useAuthStore, SavedOrder, UserProfile } from "@/store/useAuthStore";
import { MangaVolume, Series, GenreInfo } from "@/data/manga";
import { formatPrice } from "@/lib/utils";
import { AdminLoginOverlay } from "@/components/admin/AdminLoginOverlay";
import { VolumeFormModal } from "@/components/admin/VolumeFormModal";
import { isMerch, productTypeOf } from "@/lib/variants";
import { SeriesFormModal } from "@/components/admin/SeriesFormModal";
import { GenreFormModal } from "@/components/admin/GenreFormModal";
import { OrderDetailsModal } from "@/components/admin/OrderDetailsModal";
import { CustomSelect } from "@/components/CustomSelect";
import { CustomNumberInput } from "@/components/ui/CustomNumberInput";
import { ImageUploadInput } from "@/components/ImageUploadInput";
import { useMounted } from "@/store/useWishlistStore";
import { changeAdminPinWithServer } from "@/lib/security";
import { EGYPT_GOVERNORATES, DEFAULT_GOVERNORATE_RATES, EgyptGovernorate } from "@/data/governorates";
import { printCustomerInvoice } from "@/lib/invoicePrint";
import { SaveStatusBadge } from "@/components/admin/SaveStatusBadge";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { CollapsibleSection } from "@/components/admin/CollapsibleSection";
import { SectionSaveButton } from "@/components/admin/SectionSaveButton";
import { CouponManager } from "@/components/admin/CouponManager";
import { Toggle } from "@/components/admin/Toggle";
import { Checkbox } from "@/components/admin/Checkbox";

type AdminTab = "overview" | "volumes" | "series" | "cms" | "orders" | "settings";

/**
 * Whether a panel's draft still differs from what the storefront is showing.
 *
 * Compared by value rather than by serialised text. `JSON.stringify` preserves
 * insertion order, and the shipping draft is built by spreading the baseline
 * rates before the stored ones — so its governorate map came out alphabetically
 * from the defaults while the stored map kept whatever order it was saved in.
 * Identical rates, different strings, and the panel claimed unsaved changes
 * from the moment it opened.
 */
function isDirty(draft: unknown, live: unknown): boolean {
  return !deepEqual(draft, live);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    // An absent key and an explicit `undefined` mean the same thing here: a
    // draft seeded from a config that never had the field is not a change.
    if (left[key] === undefined && right[key] === undefined) continue;
    if (!deepEqual(left[key], right[key])) return false;
  }
  return true;
}

export default function AdminPage() {
  const mounted = useMounted();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [ordersRange, setOrdersRange] = useState<"today" | "week" | "month" | "all">("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "book" | "figure" | "poster">("all");
  const [volumePage, setVolumePage] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [serverOrders, setServerOrders] = useState<SavedOrder[]>([]);

  // Orders Tab Filter & Search States
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderPaymentFilter, setOrderPaymentFilter] = useState("all");
  const [orderGovFilter, setOrderGovFilter] = useState("all");
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);

  const handleRefreshOrders = async () => {
    setIsRefreshingOrders(true);
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setServerOrders(data.orders);
        showToast("Live orders synchronized successfully.");
      }
    } catch (err) {
      console.error("Order sync error:", err);
    } finally {
      setIsRefreshingOrders(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      fetch("/api/orders")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.orders)) {
            setServerOrders(data.orders);
          }
        })
        .catch(() => {});
    }
  }, [mounted, activeTab]);

  // Modals state
  const [isVolumeModalOpen, setIsVolumeModalOpen] = useState(false);
  const [editingVolume, setEditingVolume] = useState<MangaVolume | null>(null);

  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SavedOrder | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [flatRateInput, setFlatRateInput] = useState("");


  const [selectedCustomer, setSelectedCustomer] = useState<UserProfile | null>(null);

  const [isGenreModalOpen, setIsGenreModalOpen] = useState(false);
  const [editingGenreForModal, setEditingGenreForModal] = useState<GenreInfo | null>(null);

  // Storefront CMS State & Actions
  const {
    volumes,
    series,
    heroContent,
    shippingConfig,
    editorialConfig,
    featuredSeriesConfig,
    genreBentoConfig,
    boxSetsConfig,
    tickerConfig,
    tickerArabicConfig,
    trendingConfig,
    mangaDiscoveryConfig,
    heroArabicContent,
    shippingArabicConfig,
    editorialArabicConfig,
    mangaDiscoveryArabicConfig,
    genres,
    formats,
    isAdminAuthenticated,
    addVolume,
    updateVolume,
    deleteVolume,
    duplicateVolume,
    addSeries,
    updateSeries,
    deleteSeries,
    updateHeroContent,
    updateShippingConfig,
    updateEditorialConfig,
    updateFeaturedSeriesConfig,
    updateGenreBentoConfig,
    updateBoxSetsConfig,
    updateTickerConfig,
    updateTickerArabicConfig,
    updateTrendingConfig,
    updateMangaDiscoveryConfig,
    updateHeroArabicContent,
    updateShippingArabicConfig,
    updateEditorialArabicConfig,
    updateMangaDiscoveryArabicConfig,
    trendingArabicConfig,
    updateTrendingArabicConfig,
    addGenre,
    updateGenre,
    deleteGenre,
    logoutAdmin,
    adminEmails,
    addAdminEmail,
    removeAdminEmail,
    exportData,
    importData,
    resetToDefaults,
    syncToNeon,
  } = useStorefrontStore();

  // Auth & Orders State
  const currentUser = useAuthStore((state) => state.currentUser);
  const updateOrderStatus = useAuthStore((state) => state.updateOrderStatus);

  // Local CMS Form States for smooth editing
  const [cmsLanguage, setCmsLanguage] = useState<"en" | "ar">("en");
  const [heroForm, setHeroForm] = useState(heroContent);
  /**
   * Fills in what the stored config leaves out, so the form always has a full
   * list of zones and a rate for each to render.
   *
   * The comparison that decides whether there is anything to save runs both
   * sides through this. Without that the draft was compared against the raw
   * stored value, and since this adds the 27 baseline rates and the default
   * zone list, a shop that had never set them looked permanently unsaved — the
   * button offered to save changes nobody had made.
   */
  const withShippingDefaults = (config: ShippingConfig) => ({
    ...config,
    governoratesList: config.governoratesList || EGYPT_GOVERNORATES,
    governorateRates: {
      ...DEFAULT_GOVERNORATE_RATES,
      ...(config.governorateRates || {}),
    },
  });

  const [shippingForm, setShippingForm] = useState(() => withShippingDefaults(shippingConfig));
  const [editorialForm, setEditorialForm] = useState(editorialConfig);
  const [featuredSeriesForm, setFeaturedSeriesForm] = useState(featuredSeriesConfig);
  const [genreBentoForm, setGenreBentoForm] = useState(genreBentoConfig);
  const [boxSetsForm, setBoxSetsForm] = useState(boxSetsConfig);
  const [tickerForm, setTickerForm] = useState(tickerConfig);
  const [tickerArabicForm, setTickerArabicForm] = useState(tickerArabicConfig);
  const [trendingForm, setTrendingForm] = useState(trendingConfig);
  const [mangaDiscoveryForm, setMangaDiscoveryForm] = useState(mangaDiscoveryConfig);

  // Arabic CMS Form States
  const [heroArabicForm, setHeroArabicForm] = useState(heroArabicContent);
  const [shippingArabicForm, setShippingArabicForm] = useState(shippingArabicConfig);
  const [editorialArabicForm, setEditorialArabicForm] = useState(editorialArabicConfig);
  const [mangaDiscoveryArabicForm, setMangaDiscoveryArabicForm] = useState(mangaDiscoveryArabicConfig);
  const [trendingArabicForm, setTrendingArabicForm] = useState(trendingArabicConfig);
  const [selectedGenreId, setSelectedGenreId] = useState<string>(genres?.[0]?.id || "action");
  const [genreDrafts, setGenreDrafts] = useState<Record<string, GenreInfo>>({});
  const [currentPinInput, setCurrentPinInput] = useState("");
  const [newPinInput, setNewPinInput] = useState("");
  const [confirmPinInput, setConfirmPinInput] = useState("");
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [newAdminEmailInput, setNewAdminEmailInput] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAdminSignOut = async () => {
    // Revoke the HttpOnly cookie before navigating so the fresh /admin load is
    // always the login screen, never a stale client-side dashboard.
    try {
      await fetch("/api/admin/verify-session", { method: "DELETE", cache: "no-store" });
    } finally {
      logoutAdmin();
      window.location.replace("/admin");
    }
  };

  // Cryptographic server-side session guard.
  //
  // This runs on every load, not only when the client flag is already set.
  // `isAdminAuthenticated` is deliberately not persisted, so it starts false on
  // each page load — and because the check used to be skipped in that state,
  // the curator cookie (valid for 24h) was never consulted and every refresh
  // dropped back to the PIN screen.
  const [sessionProbed, setSessionProbed] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/admin/verify-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (!data.valid) {
          // Only tear down a session the client believed it had; a plain
          // "not signed in" must not fire the logout side effects.
          if (useStorefrontStore.getState().isAdminAuthenticated) logoutAdmin();
          return;
        }
        useStorefrontStore.setState({
          isAdminAuthenticated: true,
          ...(Array.isArray(data.adminEmails) ? { adminEmails: data.adminEmails } : {}),
        });
      })
      .catch(() => {
        // Keep any active session during transient network drops
      })
      .finally(() => {
        if (active) setSessionProbed(true);
      });
    return () => {
      active = false;
    };
  }, [logoutAdmin]);

  const [prevShipping, setPrevShipping] = useState(shippingConfig);
  if (shippingConfig !== prevShipping) {
    setPrevShipping(shippingConfig);
    if (shippingConfig) {
      setShippingForm({
        ...shippingConfig,
        freeShippingEnabled: shippingConfig.freeShippingEnabled ?? true,
        freeShippingThreshold: shippingConfig.freeShippingThreshold ?? 500,
        governoratesList:
          shippingConfig.governoratesList && shippingConfig.governoratesList.length > 0
            ? shippingConfig.governoratesList
            : EGYPT_GOVERNORATES,
        governorateRates: {
          ...DEFAULT_GOVERNORATE_RATES,
          ...(shippingConfig.governorateRates || {}),
        },
      });
    }
  }

  const [prevTicker, setPrevTicker] = useState(tickerConfig);
  if (tickerConfig !== prevTicker) {
    setPrevTicker(tickerConfig);
    if (tickerConfig) setTickerForm(tickerConfig);
  }

  const [prevTickerArabic, setPrevTickerArabic] = useState(tickerArabicConfig);
  if (tickerArabicConfig !== prevTickerArabic) {
    setPrevTickerArabic(tickerArabicConfig);
    if (tickerArabicConfig) setTickerArabicForm(tickerArabicConfig);
  }

  const [prevBoxSets, setPrevBoxSets] = useState(boxSetsConfig);
  if (boxSetsConfig !== prevBoxSets) {
    setPrevBoxSets(boxSetsConfig);
    if (boxSetsConfig) {
      setBoxSetsForm(boxSetsConfig);
    }
  }

  const [prevTrending, setPrevTrending] = useState(trendingConfig);
  if (trendingConfig !== prevTrending) {
    setPrevTrending(trendingConfig);
    if (trendingConfig) {
      setTrendingForm(trendingConfig);
    }
  }


  const [prevGenreBento, setPrevGenreBento] = useState(genreBentoConfig);
  if (genreBentoConfig !== prevGenreBento) {
    setPrevGenreBento(genreBentoConfig);
    if (genreBentoConfig) {
      setGenreBentoForm(genreBentoConfig);
    }
  }

  const [prevMangaDiscovery, setPrevMangaDiscovery] = useState(mangaDiscoveryConfig);
  if (mangaDiscoveryConfig !== prevMangaDiscovery) {
    setPrevMangaDiscovery(mangaDiscoveryConfig);
    if (mangaDiscoveryConfig) {
      setMangaDiscoveryForm(mangaDiscoveryConfig);
    }
  }

  const handleGovRateChange = (govValue: string, price: number) => {
    setShippingForm((prev) => ({
      ...prev,
      governorateRates: {
        ...DEFAULT_GOVERNORATE_RATES,
        ...(prev.governorateRates || {}),
        [govValue]: Math.max(0, isNaN(price) ? 0 : price),
      },
    }));
  };

  const handleGovNameChange = (index: number, field: "label" | "labelAr" | "badge", value: string) => {
    setShippingForm((prev) => {
      const activeList = [...(prev.governoratesList || EGYPT_GOVERNORATES)];
      if (!activeList[index]) return prev;
      const current = activeList[index];
      const oldVal = current.value;
      const newVal = field === "label" && (!current.value || current.value === current.label) ? value : current.value;
      const updated: EgyptGovernorate = {
        ...current,
        [field]: value,
        value: newVal,
      };
      activeList[index] = updated;

      const rates = { ...(prev.governorateRates || {}) };
      if (oldVal !== newVal && rates[oldVal] !== undefined) {
        rates[newVal] = rates[oldVal];
        delete rates[oldVal];
      }

      return {
        ...prev,
        governoratesList: activeList,
        governorateRates: rates,
      };
    });
  };

  /**
   * Puts every governorate on the same rate.
   *
   * Twenty-seven fields is a long way to say "flat 60 EGP everywhere", and it
   * is the change most often wanted in one go — a courier's prices move
   * together far more often than one zone moves alone. Individual rates can
   * still be edited afterwards; this only sets them all at once.
   */
  const handleApplyRateToAll = (rate: number) => {
    const value = Math.max(0, Math.round(rate));
    setShippingForm((prev) => {
      const list = prev.governoratesList || EGYPT_GOVERNORATES;
      return {
        ...prev,
        governorateRates: Object.fromEntries(list.map((gov) => [gov.value, value])),
      };
    });
  };

  const handleAddCustomGov = () => {
    const activeList = shippingForm.governoratesList || EGYPT_GOVERNORATES;
    const newCount = activeList.length + 1;
    const newGov: EgyptGovernorate = {
      value: `Custom Zone ${newCount}`,
      label: `Custom Zone ${newCount}`,
      labelAr: `منطقة مخصصة ${newCount}`,
      defaultRate: shippingForm.standardShippingCost || 65,
    };
    const updatedList = [...activeList, newGov];
    setShippingForm((prev) => ({
      ...prev,
      governoratesList: updatedList,
      governorateRates: {
        ...(prev.governorateRates || {}),
        [newGov.value]: newGov.defaultRate,
      },
    }));
    showToast("New custom delivery zone added. You can now edit its name and rate.");
  };

  const handleDeleteGov = (index: number) => {
    setShippingForm((prev) => {
      const activeList = [...(prev.governoratesList || EGYPT_GOVERNORATES)];
      const removed = activeList.splice(index, 1)[0];
      const rates = { ...(prev.governorateRates || {}) };
      if (removed) {
        delete rates[removed.value];
      }
      return {
        ...prev,
        governoratesList: activeList,
        governorateRates: rates,
      };
    });
    showToast("Governorate / delivery zone removed.");
  };

  const handleResetGovernorates = () => {
    setShippingForm((prev) => ({
      ...prev,
      governoratesList: EGYPT_GOVERNORATES,
      governorateRates: { ...DEFAULT_GOVERNORATE_RATES },
    }));
    showToast("Reset all governorates to 27 official Egyptian governorates.");
  };

  const currentGenre = useMemo(() => {
    const base = genres.find((g) => g.id === selectedGenreId) || genres[0];
    return genreDrafts[selectedGenreId] || base;
  }, [genres, selectedGenreId, genreDrafts]);

  const updateCurrentGenreDraft = (updates: Partial<GenreInfo>) => {
    if (!currentGenre) return;
    setGenreDrafts((prev) => ({
      ...prev,
      [currentGenre.id]: { ...currentGenre, ...updates },
    }));
  };

  // Compile all customer orders from authoritative serverOrders
  const allOrders = useMemo(() => {
    const list: { order: SavedOrder; customer: UserProfile }[] = [];
    const seenIds = new Set<string>();

    (serverOrders || []).forEach((o) => {
      if (!seenIds.has(o.id)) {
        seenIds.add(o.id);
        list.push({
          order: o,
          customer: {
            id: `PATRON-${o.id}`,
            name: o.customerName || "Collector",
            email: o.customerEmail || "guest@animeversebooks.com",
            phone: o.customerPhone || "+20 100 000 0000",
            governorate: o.customerGovernorate || "Cairo",
            address: o.customerAddress || "Cairo, Egypt",
            tier: "Collector",
            joinedDate: o.date || new Date().toISOString().split("T")[0],
            orders: [o],
          },
        });
      }
    });

    // Guest orders arrive with everything else from /api/orders. This used to
    // also merge the curator's OWN browser localStorage, which surfaced their
    // personal purchases as if they were store records.

    // Merge central server orders across all devices and customers
    serverOrders.forEach((o) => {
      if (o && o.id && !seenIds.has(o.id)) {
        seenIds.add(o.id);
        list.push({
          order: o,
          customer: {
            id: `PATRON-${o.id}`,
            name: o.customerName || "Collector",
            email: o.customerEmail || "guest@animeversebooks.com",
            phone: o.customerPhone || "+20 100 000 0000",
            governorate: o.customerGovernorate || "Cairo",
            address: o.customerAddress || "Cairo, Egypt",
            tier: "Collector",
            joinedDate: o.date,
            orders: [o],
          },
        });
      }
    });

    return list.sort((a, b) => {
      const timeA = a.order.createdAt || (a.order.date ? new Date(a.order.date).getTime() : 0);
      const timeB = b.order.createdAt || (b.order.date ? new Date(b.order.date).getTime() : 0);
      return timeB - timeA;
    });
  }, [serverOrders]);

  // When an order was placed: createdAt is authoritative, date is the fallback.
  const orderPlacedAt = (order: SavedOrder) => {
    const ms = Number.isFinite(order.createdAt) ? (order.createdAt as number) : Date.parse(order.date);
    return Number.isFinite(ms) ? ms : 0;
  };

  // Orders grouped by how recently they were placed — drives the ORDERS KPI card
  const ordersByRange = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const dayMs = 24 * 60 * 60 * 1000;
    const todayMs = startOfToday.getTime();

    const since = (fromMs: number) => allOrders.filter(({ order }) => orderPlacedAt(order) >= fromMs);

    return {
      today: since(todayMs),
      week: since(todayMs - 6 * dayMs),
      month: since(todayMs - 29 * dayMs),
      all: allOrders,
    };
  }, [allOrders]);

  const todayOrders = ordersByRange.today;
  const rangedOrders = ordersByRange[ordersRange];

  const rangedRevenue = useMemo(
    () => rangedOrders.reduce((sum, { order }) => sum + (order.total || 0), 0),
    [rangedOrders]
  );

  const todayRevenue = useMemo(
    () => todayOrders.reduce((sum, { order }) => sum + (order.total || 0), 0),
    [todayOrders]
  );

  // Orders still waiting on the curator (payment not settled / not yet processed)
  const pendingOrders = useMemo(
    () => allOrders.filter(({ order }) => (order.status || "").toLowerCase().includes("pending")),
    [allOrders]
  );

  const ORDER_RANGE_LABELS = {
    today: "Today",
    week: "Last 7 days",
    month: "Last 30 days",
    all: "All time",
  } as const;

  // Top recent orders preview (latest 4 orders)
  const recentOrders = useMemo(() => {
    return allOrders.slice(0, 4);
  }, [allOrders]);

  // Filtered Orders List based on search, status, payment, and governorate
  const filteredOrders = useMemo(() => {
    return allOrders.filter(({ order, customer }) => {
      // 1. Search Query filter (matches order ID, customer name, phone, email, tracking number, item titles)
      if (orderSearch.trim()) {
        const query = orderSearch.trim().toLowerCase();
        const matchesId = order.id.toLowerCase().includes(query);
        const matchesCustomer = (customer.name || "").toLowerCase().includes(query);
        const matchesEmail = (customer.email || order.customerEmail || "").toLowerCase().includes(query);
        const matchesPhone = (customer.phone || order.customerPhone || "").toLowerCase().includes(query);
        const matchesTracking = (order.trackingNumber || "").toLowerCase().includes(query);
        const matchesItems = order.items.some((it) => (it.title || "").toLowerCase().includes(query));
        if (!matchesId && !matchesCustomer && !matchesEmail && !matchesPhone && !matchesTracking && !matchesItems) {
          return false;
        }
      }

      // 2. Status Filter
      if (orderStatusFilter !== "all") {
        if (orderStatusFilter === "pending") {
          if (!order.status.toLowerCase().includes("pending")) return false;
        } else if (orderStatusFilter === "confirmed") {
          if (order.status.toLowerCase() !== "confirmed") return false;
        } else if (orderStatusFilter === "processing") {
          if (order.status.toLowerCase() !== "processing") return false;
        } else if (orderStatusFilter === "shipped") {
          if (order.status.toLowerCase() !== "shipped") return false;
        } else if (orderStatusFilter === "delivered") {
          if (order.status.toLowerCase() !== "delivered") return false;
        } else if (orderStatusFilter === "cancelled") {
          if (!order.status.toLowerCase().includes("cancelled")) return false;
        }
      }

      // 3. Payment Filter
      if (orderPaymentFilter !== "all") {
        const method = (order.paymentMethod || "cash").toLowerCase();
        if (orderPaymentFilter === "cash" && method !== "cash") return false;
        if (orderPaymentFilter === "wallet" && method !== "wallet") return false;
        if (orderPaymentFilter === "instapay" && method !== "instapay") return false;
        if (orderPaymentFilter === "unverified" && order.paymentStatus !== "Pending Verification") return false;
        if (orderPaymentFilter === "paid" && order.paymentStatus !== "Verified & Paid") return false;
      }

      // 4. Governorate Filter
      if (orderGovFilter !== "all") {
        const gov = (customer.governorate || order.customerGovernorate || "").toLowerCase();
        if (!gov.includes(orderGovFilter.toLowerCase())) return false;
      }

      return true;
    });
  }, [allOrders, orderSearch, orderStatusFilter, orderPaymentFilter, orderGovFilter]);

  // Order Counts by Status
  const orderStats = useMemo(() => {
    let pendingCount = 0;
    let processingCount = 0;
    let shippedCount = 0;
    let deliveredCount = 0;
    let cancelledCount = 0;

    allOrders.forEach(({ order }) => {
      const s = (order.status || "").toLowerCase();
      if (s.includes("pending")) pendingCount++;
      else if (s === "processing" || s === "confirmed") processingCount++;
      else if (s === "shipped") shippedCount++;
      else if (s === "delivered") deliveredCount++;
      else if (s.includes("cancelled")) cancelledCount++;
    });

    return {
      total: allOrders.length,
      pending: pendingCount,
      processing: processingCount,
      shipped: shippedCount,
      delivered: deliveredCount,
      cancelled: cancelledCount,
    };
  }, [allOrders]);

  // Key performance indicators
  const totalStockUnits = useMemo(() => {
    return volumes.reduce((sum, v) => sum + (v.stock || 0), 0);
  }, [volumes]);

  // Books alert on their own stock; a figure or poster alerts per variant, so a
  // sold-out A2 shows up even while the A3 is plentiful.
  const lowStockVolumes = useMemo(() => {
    const rows: { key: string; vol: MangaVolume; title: string; group: string; format: string; price: number; stock: number }[] = [];
    for (const v of volumes) {
      if (isMerch(v)) {
        for (const variant of v.variants || []) {
          if ((variant.stock || 0) <= 5) {
            rows.push({ key: `${v.id}~${variant.sku}`, vol: v, title: `${v.title} — ${variant.label}`, group: v.merch?.franchise || "", format: v.format, price: variant.price, stock: variant.stock || 0 });
          }
        }
      } else if ((v.stock || 0) <= 5) {
        rows.push({ key: v.id, vol: v, title: v.title, group: v.seriesTitle, format: v.format, price: v.price, stock: v.stock || 0 });
      }
    }
    return rows;
  }, [volumes]);

  /**
   * Removing a volume that a box set is built from silently zeroes that box:
   * `describeBundle` returns stock 0 the moment a member id no longer resolves,
   * so the box stops selling with nothing on screen to explain why. The
   * confirmation names the boxes that would break.
   */
  const confirmDeleteVolume = (volume: MangaVolume): Promise<boolean> => {
    const inBoxes = volumes.filter(
      (v) => Array.isArray(v.bundleOf) && v.bundleOf.includes(volume.id)
    );
    const body = ["This cannot be undone."];
    if (inBoxes.length) {
      body.unshift(
        `It is part of ${inBoxes.map((b) => `"${b.title}"`).join(", ")}, which will drop out of stock without it.`
      );
    }
    return confirm({ title: `Delete "${volume.title}"?`, body, destructive: true });
  };

  // Filtered Volumes List
  const filteredVolumes = useMemo(() => {
    return volumes.filter((v) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        v.title.toLowerCase().includes(q) ||
        v.seriesTitle.toLowerCase().includes(q) ||
        v.author.toLowerCase().includes(q) ||
        (v.merch?.franchise || "").toLowerCase().includes(q) ||
        (v.merch?.character || "").toLowerCase().includes(q) ||
        (v.isbn && v.isbn.includes(searchQuery));
      const matchesSeries = seriesFilter === "all" || v.seriesSlug === seriesFilter;
      const matchesFormat = formatFilter === "all" || v.format === formatFilter;
      const matchesType = typeFilter === "all" || productTypeOf(v) === typeFilter;
      return matchesSearch && matchesSeries && matchesFormat && matchesType;
    });
  }, [volumes, searchQuery, seriesFilter, formatFilter, typeFilter]);

  // Catalog pagination (mirrors the storefront manga catalog)
  const VOLUMES_PER_PAGE = 20;
  const volumePageCount = Math.max(1, Math.ceil(filteredVolumes.length / VOLUMES_PER_PAGE));
  // Filters (or a deletion) can shrink the list below the page we are on, so the
  // page in state is clamped while rendering rather than corrected afterwards.
  const currentVolumePage = Math.min(volumePage, volumePageCount);
  const volumePageStart = (currentVolumePage - 1) * VOLUMES_PER_PAGE;
  const pagedVolumes = filteredVolumes.slice(volumePageStart, volumePageStart + VOLUMES_PER_PAGE);

  const goToVolumePage = (page: number) => {
    setVolumePage(Math.min(Math.max(1, page), volumePageCount));
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  };

  const availableFormats = useMemo(() => {
    const base = formats && formats.length > 0
      ? formats
      : ["Manga", "Deluxe Edition", "Box Set", "Light Novel"];
    const volumeFormats = volumes.map((v) => v.format).filter(Boolean);
    return Array.from(new Set([...base, ...volumeFormats]));
  }, [formats, volumes]);

  // Prevent hydration mismatch between server render (localStorage empty) and client (persisted session)
  // Hold the loading state until the cookie has been checked, so a returning
  // curator never sees the PIN screen flash before their session is restored.
  if (!mounted || !sessionProbed) {
    return (
      <div className="min-h-screen w-full bg-ink flex flex-col items-center justify-center p-6 text-center font-mono select-none">
        <div className="w-12 h-12 mx-auto rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold mb-3 animate-pulse">
          <Shield className="w-5 h-5" />
        </div>
        <div className="text-xs font-bold text-gold tracking-widest uppercase">
          ANIMEVERSE ARCHIVE — CURATOR CONSOLE
        </div>
        <div className="text-[10px] text-text-muted mt-1 tracking-wider uppercase">
          Initializing secure environment...
        </div>
      </div>
    );
  }

  if (!isAdminAuthenticated) {
    return <AdminLoginOverlay />;
  }

  // Handle Save Volume
  const handleSaveVolume = async (vol: MangaVolume) => {
    if (editingVolume) {
      updateVolume(vol.id, vol);
      showToast(`Updated volume "${vol.title}". Syncing with Neon DB...`);
    } else {
      addVolume(vol);
      showToast(`Added new volume "${vol.title}". Syncing with Neon DB...`);
    }
    setEditingVolume(null);
    const syncRes = await syncToNeon();
    if (syncRes.success) {
      showToast(`Volume changes safely committed to Neon DB.`);
    } else {
      showToast(`Saved locally. Background cloud sync pending.`);
    }
  };

  // Handle Save Series
  const handleSaveSeries = async (s: Series) => {
    if (editingSeries) {
      updateSeries(s.slug, s);
      showToast(`Updated series "${s.title}". Syncing with Neon DB...`);
    } else {
      addSeries(s);
      showToast(`Created series franchise "${s.title}". Syncing with Neon DB...`);
    }
    setEditingSeries(null);
    const syncRes = await syncToNeon();
    if (syncRes.success) {
      showToast(`Series changes safely committed to Neon DB.`);
    } else {
      showToast(`Saved locally. Background cloud sync pending.`);
    }
  };

  // Handle Export
  const handleExport = () => {
    const jsonStr = exportData();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `animeverse-archive-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Archival catalog JSON backup exported.");
  };

  // Handle Import
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importData(content);
        if (success) {
          showToast("Data backup restored and synchronized successfully.");
        } else {
          showToast("Failed to parse backup JSON file. Invalid format.");
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-ink text-paper flex flex-col selection:bg-vermilion selection:text-white">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gold text-ink font-mono text-xs font-bold px-5 py-3 rounded-sm shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar */}
      <header className="h-12 sm:h-16 bg-ink-surface border-b border-ink-border px-3 sm:px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/" className="flex items-center gap-1.5 group shrink-0">
            {/* One mark, not two: the serif and cinzel spans both read
                "ANIMEVERSE", so the console header said the name twice. */}
            <span className="font-cinzel text-sm sm:text-base font-bold text-paper tracking-wider whitespace-nowrap group-hover:text-gold transition-colors">
              ANIMEVERSE
            </span>
          </Link>
          <span className="hidden xs:inline-block text-[9px] sm:text-[11px] font-mono text-gold bg-gold/10 px-2 py-0.5 rounded uppercase tracking-wider border border-gold/30 whitespace-nowrap">
            Console
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 font-mono text-xs">
          {currentUser && (
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-ink/70 border border-gold/30 rounded-sm">
              <div className="w-4 h-4 rounded-full bg-gold/20 text-gold font-bold flex items-center justify-center text-[9px]">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "A"}
              </div>
              <span className="text-paper text-[11px] font-medium truncate max-w-[100px]">{currentUser.name}</span>
            </div>
          )}

          <SaveStatusBadge />

          <button
            onClick={async () => {
              showToast("Saving all catalog & CMS settings to Neon DB...");
              const res = await syncToNeon();
              if (res.success) {
                showToast("All changes safely committed to Neon DB.");
              } else {
                showToast("Error saving to Neon DB. Check internet connection.");
              }
            }}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-ink border border-gold/40 hover:bg-gold/20 text-gold rounded-sm transition-all font-semibold text-[11px] sm:text-xs cursor-pointer"
            title="Force immediate save of all changes to Neon Cloud Database"
          >
            <Cloud className="w-3.5 h-3.5 text-gold" />
            <span className="hidden sm:inline">Sync</span>
          </button>

          <Link
            href="/"
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-gold/10 hover:bg-gold text-gold hover:text-ink border border-gold/40 hover:border-gold rounded-sm transition-all font-semibold text-[11px] sm:text-xs whitespace-nowrap"
            title="Browse storefront in Live Mode"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Store</span>
          </Link>
          <button
            onClick={() => void handleAdminSignOut()}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-ink-elevated hover:bg-vermilion/20 hover:text-vermilion border border-ink-border rounded-sm text-text-muted transition-colors cursor-pointer text-[11px] sm:text-xs whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Exit</span>
          </button>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar Nav with smooth mobile horizontal scrolling */}
        <aside className="w-full md:w-64 bg-ink-surface/50 border-b md:border-b-0 md:border-r border-ink-border p-2 sm:p-4 shrink-0 flex flex-row md:flex-col gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar scroll-smooth md:sticky md:top-16 md:self-start md:h-[calc(100vh-4rem)] md:overflow-x-hidden md:overflow-y-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 rounded-sm text-xs font-mono tracking-wider text-left transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "overview"
                ? "bg-gold text-ink font-bold shadow-md shadow-gold/10"
                : "text-text-muted hover:text-paper hover:bg-ink-elevated"
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Overview &amp; KPIs</span>
            <span className="sm:hidden">Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 rounded-sm text-xs font-mono tracking-wider text-left transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "orders"
                ? "bg-gold text-ink font-bold shadow-md shadow-gold/10"
                : "text-text-muted hover:text-paper hover:bg-ink-elevated"
            }`}
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Orders &amp; CRM ({allOrders.length})</span>
            <span className="sm:hidden">Orders ({allOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("volumes")}
            className={`flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 rounded-sm text-xs font-mono tracking-wider text-left transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "volumes"
                ? "bg-gold text-ink font-bold shadow-md shadow-gold/10"
                : "text-text-muted hover:text-paper hover:bg-ink-elevated"
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Books &amp; Volumes ({volumes.length})</span>
            <span className="sm:hidden">Books ({volumes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("series")}
            className={`flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 rounded-sm text-xs font-mono tracking-wider text-left transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "series"
                ? "bg-gold text-ink font-bold shadow-md shadow-gold/10"
                : "text-text-muted hover:text-paper hover:bg-ink-elevated"
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Series Franchises ({series.length})</span>
            <span className="sm:hidden">Series ({series.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("cms")}
            className={`flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 rounded-sm text-xs font-mono tracking-wider text-left transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "cms"
                ? "bg-gold text-ink font-bold shadow-md shadow-gold/10"
                : "text-text-muted hover:text-paper hover:bg-ink-elevated"
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Site Content CMS</span>
            <span className="sm:hidden">CMS</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 rounded-sm text-xs font-mono tracking-wider text-left transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "settings"
                ? "bg-gold text-ink font-bold shadow-md shadow-gold/10"
                : "text-text-muted hover:text-paper hover:bg-ink-elevated"
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Backup &amp; Settings</span>
            <span className="sm:hidden">Settings</span>
          </button>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-3 sm:p-6 md:p-8 max-w-7xl overflow-x-hidden">
          {/* ======================================================== */}
          {/* TAB 1: OVERVIEW & KPIS                                   */}
          {/* ======================================================== */}
          {activeTab === "overview" && (
            <div className="space-y-6 sm:space-y-8">
              <div>
                <h1 className="font-cinzel text-xl sm:text-2xl font-bold text-paper">Executive Overview</h1>
                <p className="text-xs font-mono text-text-muted mt-1">
                  Live store performance, stock levels, and revenue metrics.
                </p>
              </div>

              {/* KPI Cards: 2-col on mobile, 4-col on desktop */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 font-mono">
                <div className="p-3.5 sm:p-5 bg-ink-surface border border-ink-border rounded-sm">
                  <div className="flex items-center justify-between text-text-muted mb-1 sm:mb-2 text-[10px] sm:text-xs">
                    <span>VOLUMES</span>
                    <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-paper">{volumes.length}</div>
                  <div className="text-[10px] sm:text-[11px] text-text-muted mt-1 truncate">{series.length} series</div>
                </div>

                <div className="p-3.5 sm:p-5 bg-ink-surface border border-ink-border rounded-sm">
                  <div className="flex items-center justify-between text-text-muted mb-1 sm:mb-2 text-[10px] sm:text-xs">
                    <span>STOCK UNITS</span>
                    <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-paper">{totalStockUnits}</div>
                  <div className="text-[10px] sm:text-[11px] text-text-muted mt-1 truncate">Hub inventory</div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setOrdersRange((prev) =>
                      prev === "today" ? "week" : prev === "week" ? "month" : prev === "month" ? "all" : "today"
                    )
                  }
                  title="Click to switch between today, last 7 days, last 30 days and all time"
                  className="p-3.5 sm:p-5 bg-ink-surface border border-ink-border hover:border-gold/60 rounded-sm text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between text-text-muted mb-1 sm:mb-2 text-[10px] sm:text-xs">
                    <span>ORDERS</span>
                    <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-paper">{rangedOrders.length}</div>
                  <div className="text-[10px] sm:text-[11px] text-text-muted mt-1 flex items-center justify-between gap-2">
                    <strong className="text-gold truncate">{formatPrice(rangedRevenue)}</strong>
                    <span className="uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded-xs border border-ink-border bg-ink text-text-muted whitespace-nowrap">
                      {ORDER_RANGE_LABELS[ordersRange]}
                    </span>
                  </div>
                </button>

                <div className="p-3.5 sm:p-5 bg-ink-surface border border-ink-border rounded-sm">
                  <div className="flex items-center justify-between text-text-muted mb-1 sm:mb-2 text-[10px] sm:text-xs">
                    <span>LOW STOCK</span>
                    <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-vermilion" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-vermilion">{lowStockVolumes.length}</div>
                  <div className="text-[10px] sm:text-[11px] text-text-muted mt-1 truncate">≤ 5 units left</div>
                </div>
              </div>

              {/* Quick Navigation Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 font-mono text-xs">
                <button
                  onClick={() => {
                    setEditingVolume(null);
                    setIsVolumeModalOpen(true);
                  }}
                  className="p-3.5 sm:p-5 bg-ink-surface border border-ink-border hover:border-gold/60 rounded-sm text-left transition-colors flex items-center justify-between cursor-pointer group shadow-xs"
                >
                  <div>
                    <span className="text-gold font-bold block mb-0.5 sm:mb-1">+ Add Book</span>
                    <span className="text-text-muted text-[11px]">Add volume to catalog</span>
                  </div>
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-gold group-hover:scale-110 transition-transform shrink-0" />
                </button>

                <button
                  onClick={() => setActiveTab("cms")}
                  className="p-3.5 sm:p-5 bg-ink-surface border border-ink-border hover:border-gold/60 rounded-sm text-left transition-colors flex items-center justify-between cursor-pointer group shadow-xs"
                >
                  <div>
                    <span className="text-gold font-bold block mb-0.5 sm:mb-1">Edit Site Content</span>
                    <span className="text-text-muted text-[11px]">Headlines, banners &amp; shipping</span>
                  </div>
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gold group-hover:scale-110 transition-transform shrink-0" />
                </button>

                <button
                  onClick={handleExport}
                  className="p-3.5 sm:p-5 bg-ink-surface border border-ink-border hover:border-gold/60 rounded-sm text-left transition-colors flex items-center justify-between cursor-pointer group shadow-xs"
                >
                  <div>
                    <span className="text-gold font-bold block mb-0.5 sm:mb-1">Export Backup</span>
                    <span className="text-text-muted text-[11px]">Download store snapshot</span>
                  </div>
                  <Download className="w-4 h-4 sm:w-5 sm:h-5 text-gold group-hover:scale-110 transition-transform shrink-0" />
                </button>
              </div>

              {/* Today's Orders */}
              <div className="space-y-2.5 sm:space-y-3 font-mono">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xs uppercase tracking-wider text-paper font-bold flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-gold/70" />
                    <span>Today&apos;s Orders</span>
                    <span className="text-text-muted font-normal">({todayOrders.length})</span>
                  </h3>
                  {todayOrders.length > 0 && (
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-text-muted">
                        Revenue <span className="text-gold font-bold">{formatPrice(todayRevenue)}</span>
                      </span>
                      <button
                        onClick={() => setActiveTab("orders")}
                        className="text-text-muted hover:text-gold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        View all
                      </button>
                    </div>
                  )}
                </div>

                {todayOrders.length === 0 ? (
                  <div className="border border-ink-border rounded-sm bg-ink-surface px-4 py-6 text-center text-xs text-text-muted">
                    No orders placed today yet.
                  </div>
                ) : (
                  <div className="border border-ink-border rounded-sm overflow-x-auto bg-ink-surface">
                    <table className="w-full text-left text-xs min-w-[620px]">
                      <thead className="bg-ink text-text-muted text-[10px] uppercase border-b border-ink-border">
                        <tr>
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3">Order</th>
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3">Customer</th>
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center">Items</th>
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3">Payment</th>
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3">Status</th>
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-border/50">
                        {todayOrders.slice(0, 8).map(({ order, customer }) => (
                          <tr
                            key={`today-${order.id}`}
                            onClick={() => {
                              setSelectedOrder(order);
                              setSelectedCustomer(customer);
                              setIsOrderModalOpen(true);
                            }}
                            className="hover:bg-ink-elevated/40 cursor-pointer"
                          >
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-gold font-bold whitespace-nowrap">
                              #{order.id}
                            </td>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-paper truncate max-w-[180px]">
                              {customer.name || "Collector"}
                            </td>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center text-text-muted">
                              {order.items.length}
                            </td>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-text-muted whitespace-nowrap">
                              {order.paymentMethod === "wallet"
                                ? "Wallet"
                                : order.paymentMethod === "instapay"
                                ? "InstaPay"
                                : "COD"}
                            </td>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded-xs font-semibold whitespace-nowrap ${
                                  order.status === "Delivered"
                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                    : order.status === "Shipped"
                                    ? "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                                    : order.status === "Processing" || order.status === "Confirmed"
                                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                    : order.status.includes("Pending")
                                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                    : "bg-ink border border-ink-border text-paper"
                                }`}
                              >
                                {order.status}
                              </span>
                            </td>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right text-gold font-bold whitespace-nowrap">
                              {formatPrice(order.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Orders still awaiting action */}
              {pendingOrders.length > 0 && (
                <div className="space-y-2.5 sm:space-y-3 font-mono">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xs uppercase tracking-wider text-paper font-bold flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-rose-400" />
                      <span>Awaiting Action</span>
                      <span className="text-text-muted font-normal">({pendingOrders.length})</span>
                    </h3>
                    <button
                      onClick={() => {
                        setOrderStatusFilter("pending");
                        setActiveTab("orders");
                      }}
                      className="text-[11px] text-text-muted hover:text-gold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      View all
                    </button>
                  </div>

                  <div className="border border-ink-border rounded-sm overflow-x-auto bg-ink-surface">
                    <table className="w-full text-left text-xs min-w-[620px]">
                      <thead className="bg-ink text-text-muted text-[10px] uppercase border-b border-ink-border">
                        <tr>
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3">Order</th>
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3">Customer</th>
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3">Placed</th>
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3">Payment</th>
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3">Status</th>
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-border/50">
                        {pendingOrders.slice(0, 8).map(({ order, customer }) => (
                          <tr
                            key={`pending-${order.id}`}
                            onClick={() => {
                              setSelectedOrder(order);
                              setSelectedCustomer(customer);
                              setIsOrderModalOpen(true);
                            }}
                            className="hover:bg-ink-elevated/40 cursor-pointer"
                          >
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-gold font-bold whitespace-nowrap">
                              #{order.id}
                            </td>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-paper truncate max-w-[180px]">
                              {customer.name || "Collector"}
                            </td>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-text-muted whitespace-nowrap">
                              {order.date}
                            </td>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-text-muted whitespace-nowrap">
                              {order.paymentMethod === "wallet"
                                ? "Wallet"
                                : order.paymentMethod === "instapay"
                                ? "InstaPay"
                                : "COD"}
                            </td>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                              <span className="text-[9px] px-1.5 py-0.5 rounded-xs font-semibold whitespace-nowrap bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                {order.status}
                              </span>
                            </td>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right text-gold font-bold whitespace-nowrap">
                              {formatPrice(order.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Low Stock Table */}
              {lowStockVolumes.length > 0 && (
                <div className="space-y-2.5 sm:space-y-3 font-mono">
                  <h3 className="text-xs uppercase tracking-wider text-vermilion font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Low Stock Alerts</span>
                  </h3>
                  <div className="border border-ink-border rounded-sm overflow-x-auto bg-ink-surface">
                    <table className="w-full text-left text-xs min-w-[550px]">
                      <thead className="bg-ink text-text-muted text-[10px] uppercase border-b border-ink-border">
                        <tr>
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3">Book Title</th>
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3">Series</th>
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3">Format</th>
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-right">Price</th>
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center">Remaining</th>
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-border/50">
                        {lowStockVolumes.slice(0, 5).map((row) => (
                          <tr key={row.key} className="hover:bg-ink-elevated/40">
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-paper">{row.title}</td>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-text-muted">{row.group}</td>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-text-muted">{row.format}</td>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right text-gold font-bold">{formatPrice(row.price)}</td>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center">
                              <span className="px-2 py-0.5 bg-vermilion/20 text-vermilion font-bold rounded-xs">
                                {row.stock} units
                              </span>
                            </td>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right">
                              <button
                                onClick={() => {
                                  setEditingVolume(row.vol);
                                  setIsVolumeModalOpen(true);
                                }}
                                className="text-gold hover:underline cursor-pointer"
                              >
                                Restock
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: BOOKS & VOLUMES CATALOG                           */}
          {/* ======================================================== */}
          {activeTab === "volumes" && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                  <h1 className="font-cinzel text-xl sm:text-2xl font-bold text-paper">Products Catalog</h1>
                  <p className="text-xs font-mono text-text-muted mt-0.5 sm:mt-1">
                    Manage books, figures and posters — pricing, stock and details.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingVolume(null);
                    setIsVolumeModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 bg-gold hover:bg-gold-muted text-ink font-mono text-xs font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer shadow-lg shadow-gold/15 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product</span>
                </button>
              </div>

              {/* Filters & Search Toolbar */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-3 font-mono text-xs">
                <div className="md:col-span-3">
                  <CustomSelect
                    fullWidth
                    value={typeFilter}
                    onChange={(v) => { setTypeFilter(v as typeof typeFilter); setVolumePage(1); }}
                    options={[
                      { value: "all", label: "All Products" },
                      { value: "book", label: "Books" },
                      { value: "figure", label: "Figures" },
                      { value: "poster", label: "Posters" },
                    ]}
                    buttonClassName="bg-ink-surface border-ink-border py-2 px-3 text-xs"
                  />
                </div>

                <div className="md:col-span-3 relative">
                  <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setVolumePage(1); }}
                    placeholder="Search title, series, franchise, ISBN..."
                    className="w-full bg-ink-surface border border-ink-border pl-9 pr-3 py-2 text-paper rounded-sm outline-none focus:border-gold"
                  />
                </div>

                <div className="md:col-span-3">
                  <CustomSelect
                    fullWidth
                    value={seriesFilter}
                    onChange={(v) => { setSeriesFilter(v); setVolumePage(1); }}
                    options={[
                      { value: "all", label: "All Series" },
                      ...series.map((s) => ({ value: s.slug, label: s.title })),
                    ]}
                    buttonClassName="bg-ink-surface border-ink-border py-2 px-3 text-xs"
                  />
                </div>

                <div className="md:col-span-3">
                  <CustomSelect
                    fullWidth
                    value={formatFilter}
                    onChange={(v) => { setFormatFilter(v); setVolumePage(1); }}
                    options={[
                      { value: "all", label: "All Formats" },
                      ...availableFormats.map((f) => ({ value: f, label: f })),
                    ]}
                    buttonClassName="bg-ink-surface border-ink-border py-2 px-3 text-xs"
                  />
                </div>
              </div>

              {/* Mobile Volumes Card View (Visible on mobile screens) */}
              <div className="grid grid-cols-1 gap-2.5 md:hidden font-mono text-xs">
                {filteredVolumes.length === 0 ? (
                  <div className="p-8 text-center text-text-muted bg-ink-surface border border-ink-border rounded-sm">
                    No manga volumes match your search.
                  </div>
                ) : (
                  pagedVolumes.map((vol) => (
                    <div
                      key={`mob-${vol.id}`}
                      className="p-3 bg-ink-surface border border-ink-border rounded-sm flex gap-3 items-start shadow-xs"
                    >
                      <div className="w-13 h-18 border border-ink-border overflow-hidden rounded-xs shrink-0 bg-ink">
                        <img src={vol.coverImage} alt={vol.title} className="w-full h-full object-cover" />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <h4 className="font-bold text-paper text-xs truncate">{vol.title}</h4>
                            <span className="text-[10px] text-gold">
                              {isMerch(vol) ? `${vol.format} · ${(vol.variants || []).length} options` : `Vol. ${vol.volumeNumber}`}
                            </span>
                          </div>
                          <span className="font-bold text-gold shrink-0">{formatPrice(vol.price)}</span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-text-muted">
                          <span className="truncate max-w-[120px]">{isMerch(vol) ? vol.merch?.franchise || "—" : vol.seriesTitle}</span>
                          <span>•</span>
                          <span>{vol.format}</span>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-ink-border/40">
                          <span
                            className={`px-1.5 py-0.2 rounded-xs font-bold text-[10px] ${
                              vol.stock <= 5
                                ? "bg-vermilion/20 text-vermilion border border-vermilion/30"
                                : "bg-ink border border-ink-border text-paper"
                            }`}
                          >
                            {vol.stock} in stock
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingVolume(vol);
                                setIsVolumeModalOpen(true);
                              }}
                              title="Edit"
                              className="p-1.5 text-text-muted hover:text-paper bg-ink border border-ink-border rounded-xs"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => {
                                const dup = duplicateVolume(vol.id);
                                if (dup) showToast(`Duplicated "${dup.title}"`);
                              }}
                              title="Duplicate"
                              className="p-1.5 text-text-muted hover:text-gold bg-ink border border-ink-border rounded-xs"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button
                              onClick={async () => {
                                if (await confirmDeleteVolume(vol)) {
                                  deleteVolume(vol.id);
                                  showToast(`Deleted "${vol.title}"`);
                                }
                              }}
                              title="Delete"
                              className="p-1.5 text-text-muted hover:text-vermilion bg-ink border border-ink-border rounded-xs"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Volumes Table (Hidden on mobile) */}
              <div className="hidden md:block border border-ink-border rounded-sm overflow-x-auto bg-ink-surface font-mono">
                <table className="w-full text-left text-xs min-w-[800px]">
                  <thead className="bg-ink text-text-muted text-[10px] uppercase border-b border-ink-border">
                    <tr>
                      <th className="px-4 py-3 min-w-[200px]">Book Title &amp; Vol</th>
                      <th className="px-4 py-3 min-w-[130px]">Series</th>
                      <th className="px-4 py-3 whitespace-nowrap">Format</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">Price</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap">Stock</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap">Merchandising</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-border/50">
                    {filteredVolumes.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
                          No manga volumes matched your search filters.
                        </td>
                      </tr>
                    ) : (
                      pagedVolumes.map((vol) => (
                        <tr key={vol.id} className="hover:bg-ink-elevated/40 transition-colors">
                          <td className="px-4 py-3 flex items-center gap-3">
                            <div className="w-9 h-13 border border-ink-border overflow-hidden rounded-xs shrink-0 bg-ink">
                              <img src={vol.coverImage} alt={vol.title} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <div className="text-paper font-bold flex items-center gap-1.5">
                                <span>{vol.title}</span>
                                {!isMerch(vol) && <span className="text-[10px] text-gold font-normal">Vol. {vol.volumeNumber}</span>}
                              </div>
                              <div className="text-[11px] text-text-muted">
                                {isMerch(vol)
                                  ? (vol.variants || []).map((variant) => `${variant.label}: ${variant.stock}`).join(" · ")
                                  : vol.japaneseTitle || vol.author}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-text-muted whitespace-nowrap">{isMerch(vol) ? vol.merch?.franchise || "—" : vol.seriesTitle}</td>

                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-xs text-[10px] font-mono uppercase tracking-wider whitespace-nowrap border ${
                                vol.format === "Deluxe Edition"
                                  ? "bg-gold/15 text-gold border-gold/40 font-bold"
                                  : vol.format === "Box Set"
                                  ? "bg-vermilion/15 text-vermilion border-vermilion/40 font-semibold"
                                  : "bg-ink text-paper-muted border-ink-border hover:border-gold/40 hover:text-paper transition-colors"
                              }`}
                            >
                              {vol.format}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right font-bold text-gold whitespace-nowrap">
                            {formatPrice(vol.price)}
                            {vol.originalPrice && (
                              <span className="block text-[10px] text-text-muted line-through font-normal">
                                {formatPrice(vol.originalPrice)}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-xs font-bold text-[11px] inline-block ${
                                vol.stock <= 5
                                  ? "bg-vermilion/20 text-vermilion border border-vermilion/30"
                                  : "bg-ink border border-ink-border text-paper"
                              }`}
                            >
                              {vol.stock}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {vol.isTrending && (
                                <span title="Trending Carousel">
                                  <Flame className="w-3.5 h-3.5 text-vermilion" />
                                </span>
                              )}
                              {vol.isNewRelease && (
                                <span title="New Release">
                                  <Sparkles className="w-3.5 h-3.5 text-gold" />
                                </span>
                              )}
                              {vol.isFeatured && (
                                <span title="Featured">
                                  <Award className="w-3.5 h-3.5 text-paper" />
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingVolume(vol);
                                  setIsVolumeModalOpen(true);
                                }}
                                title="Edit Volume"
                                className="p-1.5 text-text-muted hover:text-paper hover:bg-ink-elevated rounded transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  const dup = duplicateVolume(vol.id);
                                  if (dup) showToast(`Duplicated volume "${dup.title}"`);
                                }}
                                title="Duplicate Volume"
                                className="p-1.5 text-text-muted hover:text-gold hover:bg-ink-elevated rounded transition-colors cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={async () => {
                                  if (await confirmDeleteVolume(vol)) {
                                    deleteVolume(vol.id);
                                    showToast(`Deleted volume "${vol.title}"`);
                                  }
                                }}
                                title="Delete Volume"
                                className="p-1.5 text-text-muted hover:text-vermilion hover:bg-ink-elevated rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Catalog Pagination */}
              {filteredVolumes.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs pt-1">
                  <p className="text-text-muted text-[11px] uppercase tracking-wider">
                    Showing {volumePageStart + 1}&ndash;
                    {Math.min(volumePageStart + VOLUMES_PER_PAGE, filteredVolumes.length)} of{" "}
                    {filteredVolumes.length}
                  </p>

                  {volumePageCount > 1 && (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => goToVolumePage(currentVolumePage - 1)}
                        disabled={currentVolumePage === 1}
                        className="flex items-center gap-1 px-3 py-2 text-xs font-bold uppercase tracking-wider border border-ink-border text-text-muted hover:text-paper hover:border-gold/50 rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Prev</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: volumePageCount }, (_, i) => i + 1).map((page) => {
                          const showPage =
                            page === 1 ||
                            page === volumePageCount ||
                            Math.abs(page - currentVolumePage) <= 1;
                          const showEllipsisBefore = page === currentVolumePage - 2 && currentVolumePage > 3;
                          const showEllipsisAfter =
                            page === currentVolumePage + 2 && currentVolumePage < volumePageCount - 2;

                          if (showEllipsisBefore || showEllipsisAfter) {
                            return (
                              <span key={page} className="w-8 text-center text-text-muted text-xs">
                                &hellip;
                              </span>
                            );
                          }
                          if (!showPage) return null;

                          return (
                            <button
                              key={page}
                              type="button"
                              onClick={() => goToVolumePage(page)}
                              className={`w-9 h-9 text-xs font-bold rounded-sm transition-colors cursor-pointer ${
                                page === currentVolumePage
                                  ? "bg-gold text-ink border border-gold"
                                  : "border border-ink-border text-text-muted hover:text-paper hover:border-gold/50"
                              }`}
                            >
                              {page}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => goToVolumePage(currentVolumePage + 1)}
                        disabled={currentVolumePage === volumePageCount}
                        className="flex items-center gap-1 px-3 py-2 text-xs font-bold uppercase tracking-wider border border-ink-border text-text-muted hover:text-paper hover:border-gold/50 rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: SERIES MANAGEMENT                                 */}
          {/* ======================================================== */}
          {activeTab === "series" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-cinzel text-2xl font-bold text-paper">Series Franchises</h1>
                  <p className="text-xs font-mono text-text-muted mt-1">
                    Manage series storylines, banner artworks, total volumes, and franchise metadata.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingSeries(null);
                    setIsSeriesModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gold hover:bg-gold-muted text-ink font-mono text-xs font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer shadow-lg shadow-gold/15 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Series</span>
                </button>
              </div>

              {/* Series Grid Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 font-mono">
                {series.map((s) => (
                  <div
                    key={s.slug}
                    className="bg-ink-surface border border-ink-border rounded-sm overflow-hidden flex flex-col group hover:border-gold/50 transition-colors"
                  >
                    <div className="h-32 w-full bg-ink relative overflow-hidden">
                      {s.bannerImage && (
                        <img
                          src={s.bannerImage}
                          alt={s.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-ink-surface via-ink-surface/40 to-transparent" />
                      <div className="absolute top-3 right-3 bg-ink/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-gold border border-gold/30">
                        {s.status}
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-xs text-text-muted mb-0.5">{s.japaneseTitle}</div>
                        <h3 className="font-bold text-base text-paper mb-1">{s.title}</h3>
                        <p className="text-xs text-text-muted line-clamp-2 mb-3">
                          {s.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-ink-border/60 flex items-center justify-between text-xs">
                        <span className="text-text-muted">
                          {s.volumes.length} Volumes Cataloged
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingSeries(s);
                              setIsSeriesModalOpen(true);
                            }}
                            className="p-1.5 text-text-muted hover:text-paper rounded transition-colors cursor-pointer"
                            title="Edit Series"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={async () => {
                              // The store removes every volume carrying this
                              // slug, so the count belongs in the question.
                              const owned = volumes.filter((v) => v.seriesSlug === s.slug);
                              const boxes = owned.filter((v) => Array.isArray(v.bundleOf) && v.bundleOf.length);
                              const detail = [
                                `${owned.length} volume${owned.length === 1 ? "" : "s"}`,
                                boxes.length ? `${boxes.length} box set${boxes.length === 1 ? "" : "s"}` : "",
                              ]
                                .filter(Boolean)
                                .join(" and ");
                              if (
                                await confirm({
                                  title: `Delete "${s.title}"?`,
                                  body: [
                                    `This also removes ${detail} from the catalogue.`,
                                    "This cannot be undone.",
                                  ],
                                  destructive: true,
                                })
                              ) {
                                deleteSeries(s.slug);
                                showToast(`Deleted "${s.title}" and ${owned.length} product(s)`);
                              }
                            }}
                            className="p-1.5 text-text-muted hover:text-vermilion rounded transition-colors cursor-pointer"
                            title="Delete Series"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: SITE CONTENT & EDITORIAL CMS                      */}
          {/* ======================================================== */}
          {activeTab === "cms" && (
            <div className="space-y-8 font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-cinzel text-2xl font-bold text-paper">Site Content CMS</h1>
                  <p className="text-xs text-text-muted mt-1">
                    Edit storefront text, banners &amp; shipping.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  {/* CMS Language Switcher */}
                  <div className="flex items-center gap-1 bg-ink border border-ink-border p-1 rounded-sm">
                    <button
                      type="button"
                      onClick={() => setCmsLanguage("en")}
                      className={`px-3.5 py-1.5 rounded-xs text-xs font-bold transition-all cursor-pointer ${
                        cmsLanguage === "en"
                          ? "bg-gold text-ink shadow-sm font-sans"
                          : "text-text-muted hover:text-paper"
                      }`}
                    >
                      English Content
                    </button>
                    <button
                      type="button"
                      onClick={() => setCmsLanguage("ar")}
                      className={`px-3.5 py-1.5 rounded-xs text-xs font-bold transition-all cursor-pointer ${
                        cmsLanguage === "ar"
                          ? "bg-gold text-ink shadow-sm font-sans"
                          : "text-text-muted hover:text-paper"
                      }`}
                    >
                      المحتوى العربي
                    </button>
                  </div>
                </div>
              </div>

              {cmsLanguage === "en" ? (
                <>

              <CouponManager onToast={showToast} />

              {/* 02. DELIVERY & SHIPPING RATES */}
              <div className="p-4 sm:p-6 bg-ink-surface border border-ink-border rounded-sm space-y-6">
                <div className="flex items-center justify-between border-b border-ink-border/50 pb-2">
                  <h2 className="text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Truck className="w-4 h-4 text-gold" />
                    <span>02. Delivery &amp; Shipping Rates</span>
                  </h2>
                </div>

                {/* Fulfillment Hub Core Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-text-muted mb-1">Hub Name</label>
                    <input
                      type="text"
                      value={shippingForm.hubName}
                      onChange={(e) => setShippingForm({ ...shippingForm, hubName: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">Estimated Delivery Window</label>
                    <input
                      type="text"
                      value={shippingForm.deliveryEstimate}
                      onChange={(e) => setShippingForm({ ...shippingForm, deliveryEstimate: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">
                      Dispatch Badge Text
                    </label>
                    <input
                      type="text"
                      value={shippingForm.dispatchBadgeText}
                      onChange={(e) => setShippingForm({ ...shippingForm, dispatchBadgeText: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">Authenticity Badge Text</label>
                    <input
                      type="text"
                      value={shippingForm.guaranteeBadgeText}
                      onChange={(e) => setShippingForm({ ...shippingForm, guaranteeBadgeText: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>
                </div>

                {/* Free Delivery Policy & Minimum Order Threshold */}
                <div className="p-4 bg-ink/70 border border-gold/30 rounded-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ink-border/60">
                    <div className="flex items-center gap-2.5">
                      <Truck className="w-5 h-5 text-gold" />
                      <div>
                        <h3 className="text-xs font-bold text-gold uppercase tracking-wider">
                          Free Delivery Threshold
                        </h3>
                        <p className="text-[11px] text-text-muted">
                          Apply free delivery when order meets the minimum amount.
                        </p>
                      </div>
                    </div>

                    <Toggle
                      checked={shippingForm.freeShippingEnabled ?? true}
                      onChange={(value) => setShippingForm({ ...shippingForm, freeShippingEnabled: value })}
                      onLabel="ACTIVE"
                      offLabel="DISABLED"
                    />
                  </div>

                  {(shippingForm.freeShippingEnabled ?? true) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                      <div>
                        <label className="block text-text-muted mb-1.5 font-bold uppercase tracking-wider">
                          Min. Subtotal (EGP)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100000"
                            step="25"
                            value={shippingForm.freeShippingThreshold ?? 500}
                            onChange={(e) =>
                              setShippingForm({
                                ...shippingForm,
                                freeShippingThreshold: Math.max(0, parseFloat(e.target.value) || 0),
                              })
                            }
                            className="w-full bg-ink border border-ink-border text-gold font-bold px-3 py-2 text-sm rounded-sm focus:border-gold outline-none"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                            EGP
                          </span>
                        </div>
                        <p className="text-[10px] text-text-muted mt-1">
                          Orders ≥ {shippingForm.freeShippingThreshold ?? 500} EGP get free delivery.
                        </p>
                      </div>

                      <div className="p-3 bg-ink-surface/60 border border-ink-border rounded-xs text-[11px] text-text-muted space-y-1.5 flex flex-col justify-center">
                        <div className="text-paper font-semibold">Live Preview:</div>
                        <div>
                          • Cart: <span className="text-gold font-bold">Add {formatPrice(shippingForm.freeShippingThreshold ?? 500)} for Free Shipping</span>
                        </div>
                        <div>
                          • Checkout: <span className="text-emerald-400 font-bold">0 EGP shipping</span> applied automatically.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Governorate Shipping Rates Table */}
                <div className="pt-4 border-t border-ink-border/60 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-paper uppercase tracking-wider">
                          Governorate Rates (EGP)
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-gold/10 text-gold border border-gold/30 rounded-xs font-bold">
                          {(shippingForm.governoratesList || EGYPT_GOVERNORATES).length} ZONES
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        Set delivery prices per governorate, edit names (EN / AR), or add zones.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleAddCustomGov}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-paper text-ink hover:bg-gold font-mono font-bold text-[10px] uppercase tracking-wider rounded-xs transition-colors cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Custom Zone</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleResetGovernorates}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono text-text-muted hover:text-gold border border-ink-border hover:border-gold/40 rounded-xs transition-colors cursor-pointer"
                        title="Reset to 27 official Egyptian governorates"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset 27 Baseline</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 p-3 bg-ink/60 border border-ink-border rounded-xs">
                    <span className="text-[11px] text-text-muted">Same rate everywhere:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        value={flatRateInput}
                        onChange={(e) => setFlatRateInput(e.target.value)}
                        placeholder="60"
                        className="w-24 h-9 bg-ink border border-ink-border text-paper px-2.5 rounded-xs focus:border-gold outline-none text-center"
                      />
                      <span className="text-[11px] text-text-muted">EGP</span>
                    </div>
                    <button
                      type="button"
                      disabled={!flatRateInput.trim()}
                      onClick={async () => {
                        const rate = Number(flatRateInput);
                        if (!Number.isFinite(rate) || rate < 0) return;
                        const count = (shippingForm.governoratesList || EGYPT_GOVERNORATES).length;
                        if (
                          await confirm({
                            title: `Set every zone to EGP ${Math.round(rate)}?`,
                            body: [
                              `This overwrites the rate on all ${count} governorates, including any you have set individually.`,
                            ],
                            confirmLabel: "Apply to all",
                            destructive: false,
                          })
                        ) {
                          handleApplyRateToAll(rate);
                          setFlatRateInput("");
                          showToast(`All ${count} zones set to EGP ${Math.round(rate)}.`);
                        }
                      }}
                      className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-xs transition-colors ${
                        flatRateInput.trim()
                          ? "bg-gold hover:bg-gold-muted text-ink cursor-pointer"
                          : "bg-ink-elevated text-text-muted border border-ink-border cursor-not-allowed"
                      }`}
                    >
                      Apply to all
                    </button>
                    <span className="text-[10px] text-text-muted/70">
                      You can still change any single zone afterwards.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pt-1">
                    {(shippingForm.governoratesList || EGYPT_GOVERNORATES).map((gov, idx) => {
                      const currentRate =
                        shippingForm.governorateRates?.[gov.value] ??
                        DEFAULT_GOVERNORATE_RATES[gov.value] ??
                        gov.defaultRate ??
                        65;
                      const isHqHub = gov.value.toLowerCase().includes("giza") || gov.badge === "HQ HUB";

                      return (
                        <div
                          key={`${gov.value}-${idx}`}
                          className="p-3 bg-ink border border-ink-border rounded-xs space-y-2.5 hover:border-ink-border/90 transition-colors shadow-xs"
                        >
                          {/* Name inputs (English & Arabic) */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="text-[9px] font-mono text-text-muted uppercase">Name (EN / AR)</span>
                              {gov.badge && (
                                <span className="text-[8px] font-mono px-1.5 py-0.2 bg-gold/15 text-gold border border-gold/30 rounded-xs uppercase">
                                  {gov.badge}
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-1.5">
                              <input
                                type="text"
                                value={gov.label}
                                onChange={(e) => handleGovNameChange(idx, "label", e.target.value)}
                                placeholder="English Name"
                                className="w-full bg-ink-surface/80 border border-ink-border px-2 py-1 text-xs text-paper rounded-xs focus:border-gold outline-none font-bold"
                              />
                              <input
                                type="text"
                                value={gov.labelAr || ""}
                                onChange={(e) => handleGovNameChange(idx, "labelAr", e.target.value)}
                                placeholder="الاسم بالعربي"
                                className="w-full bg-ink-surface/80 border border-ink-border px-2 py-1 text-xs text-gold/90 rounded-xs focus:border-gold outline-none font-sans text-right"
                              />
                            </div>
                          </div>

                          {/* Rate and Delete Row */}
                          <div className="flex items-center justify-between pt-1 border-t border-ink-border/40 gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono text-text-muted">Rate:</span>
                              <input
                                type="number"
                                min="0"
                                max="1000"
                                step="5"
                                value={currentRate}
                                onChange={(e) => handleGovRateChange(gov.value, parseFloat(e.target.value))}
                                className="w-20 bg-ink-surface border border-ink-border text-gold font-mono font-bold text-right px-2 py-1 rounded-xs focus:border-gold outline-none text-xs"
                              />
                              <span className="text-[10px] font-mono text-text-muted">EGP</span>
                            </div>

                            <div className="flex items-center gap-1">
                              {!isHqHub && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteGov(idx)}
                                  title="Remove delivery zone"
                                  className="p-1 text-text-muted hover:text-vermilion hover:bg-vermilion/10 rounded-xs transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-ink-border/50">
                  <SectionSaveButton
                    label="Logistics & Shipping Rates"
                    dirty={isDirty(shippingForm, withShippingDefaults(shippingConfig))}
                    onSave={() => {
                      updateShippingConfig(shippingForm);
                      showToast("Logistics and governorate shipping rates saved successfully.");
                    }}
                  />
                </div>
              </div>

              {/* 03. SCROLLING ANNOUNCEMENT TICKER */}
              <div className="p-6 bg-ink-surface border border-vermilion/40 rounded-sm space-y-5">
                <div className="flex items-center justify-between border-b border-ink-border/50 pb-3 gap-3 flex-wrap">
                  <h2 className="text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-vermilion" />
                    <span>03. Scrolling Announcement Ticker</span>
                  </h2>
                  <Toggle
                    checked={tickerForm.enabled}
                    onChange={(value) => setTickerForm({ ...tickerForm, enabled: value })}
                    onLabel="LIVE ON EVERY PAGE"
                    offLabel="HIDDEN"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-mono text-xs">
                  <div className="flex flex-col">
                    <label className="block text-text-muted mb-1.5">Messages (English) — one per line</label>
                    <textarea
                      rows={5}
                      value={tickerForm.messages.join("\n")}
                      onChange={(e) => setTickerForm({ ...tickerForm, messages: e.target.value.split("\n") })}
                      placeholder={"FREE SHIPPING OVER EGP 500\nCASH ON DELIVERY"}
                      className="w-full bg-ink border border-ink-border text-paper p-3 rounded-sm focus:border-gold outline-none text-[11px] leading-relaxed"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="block text-text-muted mb-1.5">الرسائل (بالعربية) — كل رسالة في سطر</label>
                    <textarea
                      rows={5}
                      dir="rtl"
                      value={tickerArabicForm.messages.join("\n")}
                      onChange={(e) => setTickerArabicForm({ ...tickerArabicForm, messages: e.target.value.split("\n") })}
                      placeholder={"شحن مجاني فوق ٥٠٠ جنيه\nالدفع عند الاستلام"}
                      className="w-full bg-ink border border-ink-border text-paper p-3 rounded-sm focus:border-gold outline-none text-[11px] leading-relaxed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-text-muted">Scroll Speed</label>
                      <span className="text-gold font-bold">{tickerForm.speedSeconds}s per pass</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={120}
                      step={1}
                      value={tickerForm.speedSeconds}
                      onChange={(e) => setTickerForm({ ...tickerForm, speedSeconds: parseInt(e.target.value, 10) || 30 })}
                      className="w-full accent-gold cursor-pointer"
                    />
                    <p className="text-[10px] text-text-muted">Lower is faster. The strip pauses while a visitor hovers it.</p>
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="block text-text-muted mb-1.5">Link (optional)</label>
                    <input
                      type="text"
                      value={tickerForm.linkHref ?? ""}
                      onChange={(e) => setTickerForm({ ...tickerForm, linkHref: e.target.value })}
                      placeholder="/manga?format=Box+Set"
                      className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                    />
                  </div>
                </div>

                {/* Where it appears */}
                <div className="space-y-2 font-mono text-xs">
                  <label className="block text-text-muted">Show it in</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {TICKER_SLOTS.map((slotOption) => {
                      const active = (tickerForm.placements ?? []).includes(slotOption.id);
                      return (
                        <Checkbox
                          key={slotOption.id}
                          checked={active}
                          label={slotOption.label}
                          className="py-1.5 px-2 -mx-1 rounded-xs hover:bg-ink-elevated/50"
                          onChange={() => {
                            const current = tickerForm.placements ?? [];
                            setTickerForm({
                              ...tickerForm,
                              placements: active
                                ? current.filter((s) => s !== slotOption.id)
                                : [...current, slotOption.id],
                            });
                          }}
                        />
                      );
                    })}
                  </div>
                  {(tickerForm.placements ?? []).length === 0 && (
                    <p className="text-[10px] text-vermilion">Pick at least one spot, or the strip will not show anywhere.</p>
                  )}
                </div>


                {/* Live preview of the strip itself */}
                <div className="rounded-xs overflow-hidden border border-ink-border">
                  <div className="bg-vermilion text-white py-2 px-3 flex items-center gap-8 overflow-hidden">
                    {(tickerForm.messages.filter((m) => m.trim()).length > 0
                      ? tickerForm.messages.filter((m) => m.trim())
                      : ["(no messages yet)"]
                    ).map((m, i) => (
                      <span key={i} className="text-[11px] font-mono tracking-wider whitespace-nowrap flex items-center gap-8">
                        {m}
                        <span className="text-white/40">◆</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <SectionSaveButton
                    label="Ticker"
                    // This one panel edits both languages at once, so it is
                    // unsaved if either side has moved.
                    dirty={
                      isDirty(tickerForm, tickerConfig) ||
                      isDirty(tickerArabicForm, tickerArabicConfig)
                    }
                    onSave={() => {
                      updateTickerConfig({
                        ...tickerForm,
                        messages: tickerForm.messages.map((m) => m.trim()).filter(Boolean),
                        placements: tickerForm.placements ?? [],
                      });
                      updateTickerArabicConfig({
                        messages: tickerArabicForm.messages.map((m) => m.trim()).filter(Boolean),
                      });
                      showToast("Announcement ticker saved and live across the site.");
                    }}
                  />
                </div>
              </div>

              {/* 04. TRENDING NOW CAROUSEL */}
              <div className="p-6 bg-ink-surface border border-ink-border rounded-sm space-y-5">
                <div className="flex items-center justify-between border-b border-ink-border/50 pb-3">
                  <h2 className="text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-gold" />
                    <span>04. Trending Now Carousel</span>
                  </h2>
                  <span className="text-[10px] text-text-muted">
                    Configure carousel autoplay, card transition delay, and section typography.
                  </span>
                </div>

                <div className="space-y-4 font-mono text-xs">
                  {/* Autoplay Toggle & Speed Control */}
                  <div className="p-4 bg-ink/70 border border-gold/30 rounded-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ink-border/60">
                      <div>
                        <h3 className="text-xs font-bold text-gold uppercase tracking-wider">
                          Automatic Card Flipping (Autoplay)
                        </h3>
                        <p className="text-[11px] text-text-muted">
                          Automatically advance carousel cards smoothly across the screen.
                        </p>
                      </div>

                      <Toggle
                        checked={trendingForm.autoplayEnabled}
                        onChange={(value) => setTrendingForm({ ...trendingForm, autoplayEnabled: value })}
                        onLabel="ACTIVE"
                        offLabel="PAUSED"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-text-muted font-bold uppercase tracking-wider">
                          Card Flipping Speed / Transition Delay
                        </label>
                        <span className="text-xs font-mono font-bold text-gold px-2.5 py-0.5 bg-gold/10 border border-gold/30 rounded-xs">
                          {(trendingForm.autoplaySpeed / 1000).toFixed(1)}s ({trendingForm.autoplaySpeed} ms)
                        </span>
                      </div>

                      <input
                        type="range"
                        min={1500}
                        max={8000}
                        step={100}
                        value={trendingForm.autoplaySpeed}
                        disabled={!trendingForm.autoplayEnabled}
                        onChange={(e) =>
                          setTrendingForm({
                            ...trendingForm,
                            autoplaySpeed: parseInt(e.target.value) || 3800,
                          })
                        }
                        className="w-full accent-gold cursor-pointer disabled:opacity-40"
                      />

                      <div className="flex items-center justify-between text-[10px] text-text-muted">
                        <span>1.5s (Fast)</span>
                        <span>3.8s (Standard / Balanced)</span>
                        <span>8.0s (Relaxed)</span>
                      </div>

                      <div className="pt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-text-muted uppercase">Quick Presets:</span>
                        {[
                          { label: "2.0s Fast", val: 2000 },
                          { label: "3.8s Standard", val: 3800 },
                          { label: "5.0s Gentle", val: 5000 },
                          { label: "6.5s Leisure", val: 6500 },
                        ].map((preset) => (
                          <button
                            key={preset.val}
                            type="button"
                            onClick={() =>
                              setTrendingForm({ ...trendingForm, autoplaySpeed: preset.val })
                            }
                            className={`px-2.5 py-1 text-[10px] rounded-xs border transition-colors cursor-pointer ${
                              trendingForm.autoplaySpeed === preset.val
                                ? "bg-gold text-ink border-gold font-bold"
                                : "bg-ink-surface text-paper-muted border-ink-border hover:text-paper hover:border-gold/50"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Typography Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col justify-end">
                      <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                        Section Badge Text
                      </label>
                      <input
                        type="text"
                        value={trendingForm.badgeText}
                        onChange={(e) =>
                          setTrendingForm({ ...trendingForm, badgeText: e.target.value })
                        }
                        placeholder="e.g. CURATED SELECTION"
                        className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                        Section Headline Title
                      </label>
                      <input
                        type="text"
                        value={trendingForm.headline}
                        onChange={(e) =>
                          setTrendingForm({ ...trendingForm, headline: e.target.value })
                        }
                        placeholder="e.g. TRENDING NOW"
                        className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                        Cards in the rail
                      </label>
                      <CustomNumberInput
                        min={1}
                        max={24}
                        step={1}
                        className="h-10"
                        value={trendingForm.minCards ?? 8}
                        onChange={(e) =>
                          setTrendingForm({ ...trendingForm, minCards: parseInt(e.target.value, 10) || 8 })
                        }
                      />
                      <p className="text-[10px] text-text-muted mt-1.5 leading-relaxed">
                        Books you mark as Trending always come first. This only tops the rail up
                        with the best-rated of the rest when there are fewer than this.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <SectionSaveButton
                    label="Trending Settings"
                    dirty={isDirty(trendingForm, trendingConfig)}
                    onSave={() => {
                      updateTrendingConfig(trendingForm);
                      showToast("Trending carousel settings and flip speed saved live.");
                    }}
                  />
                </div>
              </div>

              {/* 05. BOX SETS CAROUSEL */}
              <div className="p-6 bg-ink-surface border border-ink-border rounded-sm space-y-5">
                <div className="flex items-center justify-between border-b border-ink-border/50 pb-3">
                  <h2 className="text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Package className="w-4 h-4 text-gold" />
                    <span>05. Box Sets Carousel</span>
                  </h2>
                  <span className="text-[10px] text-text-muted">
                    Cards are filled automatically from every product whose format is &quot;Box Set&quot;.
                  </span>
                </div>

                <div className="space-y-4 font-mono text-xs">
                  {/* Autoplay Toggle & Speed Control */}
                  <div className="p-4 bg-ink/70 border border-gold/30 rounded-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ink-border/60">
                      <div>
                        <h3 className="text-xs font-bold text-gold uppercase tracking-wider">
                          Automatic Card Flipping (Autoplay)
                        </h3>
                        <p className="text-[10px] text-text-muted mt-1">
                          Pauses on hover. A single box set never flips, however this is set.
                        </p>
                      </div>
                      <Toggle
                        checked={boxSetsForm.autoplayEnabled}
                        onChange={(value) => setBoxSetsForm({ ...boxSetsForm, autoplayEnabled: value })}
                        onLabel="ACTIVE"
                        offLabel="PAUSED"
                      />
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-text-muted">Flip Delay</label>
                        <span className="text-gold font-bold">
                          {(boxSetsForm.autoplaySpeed / 1000).toFixed(1)}s ({boxSetsForm.autoplaySpeed} ms)
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1500}
                        max={10000}
                        step={100}
                        value={boxSetsForm.autoplaySpeed}
                        disabled={!boxSetsForm.autoplayEnabled}
                        onChange={(e) =>
                          setBoxSetsForm({
                            ...boxSetsForm,
                            autoplaySpeed: parseInt(e.target.value, 10) || 4200,
                          })
                        }
                        className="w-full accent-gold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: "FAST", val: 2500 },
                          { label: "NORMAL", val: 4200 },
                          { label: "SLOW", val: 6500 },
                        ].map((preset) => (
                          <button
                            key={preset.val}
                            type="button"
                            disabled={!boxSetsForm.autoplayEnabled}
                            onClick={() =>
                              setBoxSetsForm({ ...boxSetsForm, autoplaySpeed: preset.val })
                            }
                            className={`px-2.5 py-1 rounded-xs border text-[10px] font-bold tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                              boxSetsForm.autoplaySpeed === preset.val
                                ? "bg-gold text-ink border-gold"
                                : "bg-ink-elevated text-text-muted border-ink-border hover:border-gold/60"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Typography Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col justify-end">
                      <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                        Section Badge Text
                      </label>
                      <input
                        type="text"
                        value={boxSetsForm.badgeText}
                        onChange={(e) =>
                          setBoxSetsForm({ ...boxSetsForm, badgeText: e.target.value })
                        }
                        placeholder="e.g. COMPLETE COLLECTIONS"
                        className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                        Section Headline Title
                      </label>
                      <input
                        type="text"
                        value={boxSetsForm.headline}
                        onChange={(e) =>
                          setBoxSetsForm({ ...boxSetsForm, headline: e.target.value })
                        }
                        placeholder="e.g. BOX SETS"
                        className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <SectionSaveButton
                    label="Box Sets Settings"
                    dirty={isDirty(boxSetsForm, boxSetsConfig)}
                    onSave={() => {
                      updateBoxSetsConfig(boxSetsForm);
                      showToast("Box sets carousel settings and flip speed saved live.");
                    }}
                  />
                </div>
              </div>


              {/* Set-and-forget panels. Still fully editable, just not in the
                  way of the handful that change with each promotion. */}
              <CollapsibleSection
                title="Advanced — page copy & layout"
                subtitle="Hero, policies, featured series, categories, new releases, search"
                count={6}
              >
              {/* 06. HERO SECTION */}
              <div className="p-4 sm:p-6 bg-ink-surface border border-ink-border rounded-sm space-y-4">
                <div className="flex items-center justify-between border-b border-ink-border/50 pb-2">
                  <h2 className="text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <LayoutTemplate className="w-4 h-4 text-gold" />
                    <span>06. Hero Section</span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-text-muted mb-1">Badge Text</label>
                    <input
                      type="text"
                      value={heroForm.badgeText}
                      onChange={(e) => setHeroForm({ ...heroForm, badgeText: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">Spotlight Manga</label>
                    <CustomSelect
                      fullWidth
                      value={heroForm.featuredVolumeId}
                      onChange={(val) => setHeroForm({ ...heroForm, featuredVolumeId: val })}
                      // The hero frames a book, so only books are offered.
                      options={volumes.filter((v) => !isMerch(v)).map((v) => ({
                        value: v.id,
                        label: `${v.seriesTitle} — ${v.title}`,
                      }))}
                      buttonClassName="bg-ink rounded-sm py-2 px-3 text-xs"
                      placeholder="Select Spotlight Manga..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:col-span-2 bg-ink/60 p-3 border border-ink-border rounded-sm">
                    <div>
                      <label className="block text-text-muted mb-1 text-[11px]">Headline Line 1</label>
                      <input
                        type="text"
                        value={heroForm.headlineLine1 || "DISCOVER"}
                        onChange={(e) => setHeroForm({ ...heroForm, headlineLine1: e.target.value })}
                        placeholder="DISCOVER"
                        className="w-full bg-ink border border-ink-border text-paper font-bold text-xs px-3 py-2 rounded-sm focus:border-gold outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gold mb-1 text-[11px]">Gold Highlight</label>
                      <input
                        type="text"
                        value={heroForm.headlineHighlight || "YOUR NEXT"}
                        onChange={(e) => setHeroForm({ ...heroForm, headlineHighlight: e.target.value })}
                        placeholder="YOUR NEXT"
                        className="w-full bg-ink border border-gold/60 text-gold font-bold text-xs px-3 py-2 rounded-sm focus:border-gold outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-text-muted mb-1 text-[11px]">Headline Line 2</label>
                      <input
                        type="text"
                        value={heroForm.headlineLine2 || "STORY"}
                        onChange={(e) => setHeroForm({ ...heroForm, headlineLine2: e.target.value })}
                        placeholder="STORY"
                        className="w-full bg-ink border border-ink-border text-paper font-bold text-xs px-3 py-2 rounded-sm focus:border-gold outline-none"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-text-muted mb-1">Subheadline</label>
                    <textarea
                      rows={2}
                      value={heroForm.subheadline}
                      onChange={(e) => setHeroForm({ ...heroForm, subheadline: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">Primary CTA Label</label>
                    <input
                      type="text"
                      value={heroForm.primaryCtaText}
                      onChange={(e) => setHeroForm({ ...heroForm, primaryCtaText: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">Primary CTA Link</label>
                    <input
                      type="text"
                      value={heroForm.primaryCtaLink}
                      onChange={(e) => setHeroForm({ ...heroForm, primaryCtaLink: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">Secondary CTA Label</label>
                    <input
                      type="text"
                      value={heroForm.secondaryCtaText}
                      onChange={(e) => setHeroForm({ ...heroForm, secondaryCtaText: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">Secondary CTA Link</label>
                    <input
                      type="text"
                      value={heroForm.secondaryCtaLink || "#new-releases"}
                      onChange={(e) => setHeroForm({ ...heroForm, secondaryCtaLink: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  {/* 3 Metric Badges */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:col-span-2 pt-2 border-t border-ink-border/40">
                    <div>
                      <label className="block text-text-muted mb-1 text-[11px]">Stat 1 (Value / Label)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={heroForm.stat1Value || "1,400+"}
                          onChange={(e) => setHeroForm({ ...heroForm, stat1Value: e.target.value })}
                          className="w-24 bg-ink border border-ink-border text-paper px-2 py-1.5 rounded-sm text-xs font-bold"
                        />
                        <input
                          type="text"
                          value={heroForm.stat1Label || "Volumes Archived"}
                          onChange={(e) => setHeroForm({ ...heroForm, stat1Label: e.target.value })}
                          className="flex-1 bg-ink border border-ink-border text-paper px-2 py-1.5 rounded-sm text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-text-muted mb-1 text-[11px]">Stat 2 (Value / Label)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={heroForm.stat2Value || "100%"}
                          onChange={(e) => setHeroForm({ ...heroForm, stat2Value: e.target.value })}
                          className="w-24 bg-ink border border-ink-border text-paper px-2 py-1.5 rounded-sm text-xs font-bold"
                        />
                        <input
                          type="text"
                          value={heroForm.stat2Label || "Licensed Imports"}
                          onChange={(e) => setHeroForm({ ...heroForm, stat2Label: e.target.value })}
                          className="flex-1 bg-ink border border-ink-border text-paper px-2 py-1.5 rounded-sm text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gold mb-1 text-[11px]">Stat 3 (Speed / Label)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={heroForm.stat3Value || "24-48h"}
                          onChange={(e) => setHeroForm({ ...heroForm, stat3Value: e.target.value })}
                          className="w-24 bg-ink border border-ink-border text-gold px-2 py-1.5 rounded-sm text-xs font-bold"
                        />
                        <input
                          type="text"
                          value={heroForm.stat3Label || "All Egypt Delivery"}
                          onChange={(e) => setHeroForm({ ...heroForm, stat3Label: e.target.value })}
                          className="flex-1 bg-ink border border-ink-border text-paper px-2 py-1.5 rounded-sm text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <SectionSaveButton
                    label="Hero Changes"
                    dirty={isDirty(heroForm, heroContent)}
                    onSave={() => {
                      updateHeroContent(heroForm);
                      showToast("Hero section content updated in live storefront.");
                    }}
                  />
                </div>
              </div>

              {/* 07. POLICIES & GUARANTEES */}
              <div className="p-4 sm:p-6 bg-ink-surface border border-ink-border rounded-sm space-y-4">
                <div className="flex items-center justify-between border-b border-ink-border/50 pb-2">
                  <h2 className="text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-gold" />
                    <span>07. Policies &amp; Guarantees</span>
                  </h2>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-text-muted mb-1">Footer Description</label>
                    <textarea
                      rows={2}
                      value={editorialForm.footerDescription || ""}
                      onChange={(e) => setEditorialForm({ ...editorialForm, footerDescription: e.target.value })}
                      placeholder="An editorial archive celebrating sequential art, Japanese literary epics, and tactile physical printing craftsmanship."
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">Hub Cities (Under Logo)</label>
                    <input
                      type="text"
                      value={editorialForm.hubCities || ""}
                      onChange={(e) => setEditorialForm({ ...editorialForm, hubCities: e.target.value })}
                      placeholder="6TH OF OCTOBER • CAIRO • ALEXANDRIA • ALL EGYPT"
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">Authenticity Guarantee Text</label>
                    <textarea
                      rows={2}
                      value={editorialForm.authenticityGuaranteeText}
                      onChange={(e) => setEditorialForm({ ...editorialForm, authenticityGuaranteeText: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">Shipping & Packaging Policy</label>
                    <textarea
                      rows={2}
                      value={editorialForm.shippingPolicyText}
                      onChange={(e) => setEditorialForm({ ...editorialForm, shippingPolicyText: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">Return Policy (14-Day)</label>
                    <textarea
                      rows={2}
                      value={editorialForm.returnPolicyText}
                      onChange={(e) => setEditorialForm({ ...editorialForm, returnPolicyText: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <SectionSaveButton
                    label="Policy Statements"
                    dirty={isDirty(editorialForm, editorialConfig)}
                    onSave={() => {
                      updateEditorialConfig(editorialForm);
                      showToast("Editorial policies updated.");
                    }}
                  />
                </div>
              </div>

              {/* 08. FEATURED SERIES SHOWCASE */}
              <div className="p-4 sm:p-6 bg-ink-surface border border-ink-border rounded-sm space-y-5">
                <div className="flex items-center justify-between border-b border-ink-border/50 pb-3">
                  <h2 className="text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Star className="w-4 h-4 text-gold" />
                    <span>08. Featured Series Showcase</span>
                  </h2>
                  <span className="text-[10px] text-text-muted hidden sm:inline">
                    Controls the home spotlight banner.
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  {/* Select Series */}
                  <div className="md:col-span-2 flex flex-col justify-end">
                    <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                      Featured Series
                    </label>
                    <CustomSelect
                      fullWidth
                      value={featuredSeriesForm.seriesSlug}
                      onChange={(val) => setFeaturedSeriesForm({ ...featuredSeriesForm, seriesSlug: val })}
                      options={series.map((s) => ({
                        value: s.slug,
                        label: `${s.title} — by ${s.author} (${s.japaneseTitle || ""})`,
                      }))}
                      buttonClassName="h-10 bg-ink border-ink-border px-3 text-xs"
                    />
                  </div>

                  {/* Badge Text */}
                  <div className="flex flex-col justify-end">
                    <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                      Spotlight Badge Text
                    </label>
                    <input
                      type="text"
                      value={featuredSeriesForm.badgeText}
                      onChange={(e) => setFeaturedSeriesForm({ ...featuredSeriesForm, badgeText: e.target.value })}
                      placeholder="e.g. SERIES SPOTLIGHT"
                      className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                    />
                  </div>

                  {/* Custom Title Override */}
                  <div className="flex flex-col justify-end">
                    <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                      Title Override (blank = series title)
                    </label>
                    <input
                      type="text"
                      value={featuredSeriesForm.customTitle || ""}
                      onChange={(e) => setFeaturedSeriesForm({ ...featuredSeriesForm, customTitle: e.target.value })}
                      placeholder="Optional custom title override"
                      className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                    />
                  </div>

                  {/* Arabic Title Override */}
                  <div className="flex flex-col justify-end">
                    <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                      Title Override — Arabic (blank = English)
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={featuredSeriesForm.customTitleAr || ""}
                      onChange={(e) => setFeaturedSeriesForm({ ...featuredSeriesForm, customTitleAr: e.target.value })}
                      placeholder="عنوان مخصّص بالعربية"
                      className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                    />
                  </div>

                  {/* CTA Text */}
                  <div className="flex flex-col justify-end">
                    <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                      CTA Label
                    </label>
                    <input
                      type="text"
                      value={featuredSeriesForm.ctaText}
                      onChange={(e) => setFeaturedSeriesForm({ ...featuredSeriesForm, ctaText: e.target.value })}
                      placeholder="e.g. EXPLORE ALL VOLUMES"
                      className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                    />
                  </div>

                  {/* CTA Link */}
                  <div className="flex flex-col justify-end">
                    <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                      CTA Link
                    </label>
                    <input
                      type="text"
                      value={featuredSeriesForm.ctaLink}
                      onChange={(e) => setFeaturedSeriesForm({ ...featuredSeriesForm, ctaLink: e.target.value })}
                      placeholder="e.g. /manga?series=berserk"
                      className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                    />
                  </div>

                  {/* Custom Artwork URL */}
                  <div className="md:col-span-2">
                    <ImageUploadInput
                      label="Custom Artwork URL (optional — overrides cover)"
                      value={featuredSeriesForm.customImage || ""}
                      onChange={(url) => setFeaturedSeriesForm({ ...featuredSeriesForm, customImage: url })}
                      placeholder="https://... or upload local image file (Rec: 900 × 1200 px)"
                      aspectRatio="cover"
                      recommendedDimensions="900 × 1200 px (3:4 Spotlight Cover)"
                      helpText="Upload from PC or enter image URL"
                    />
                  </div>

                  {/* Custom Narrative Description */}
                  <div>
                    <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                      Curator Narrative — English (overrides default synopsis)
                    </label>
                    <textarea
                      rows={4}
                      value={featuredSeriesForm.customDescription || ""}
                      onChange={(e) => setFeaturedSeriesForm({ ...featuredSeriesForm, customDescription: e.target.value })}
                      placeholder="Leave blank to use the series default synopsis..."
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none text-xs font-mono"
                    />
                  </div>

                  {/* Arabic Narrative Description */}
                  <div>
                    <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                      Curator Narrative — Arabic (blank = series Arabic synopsis)
                    </label>
                    <textarea
                      rows={4}
                      dir="rtl"
                      value={featuredSeriesForm.customDescriptionAr || ""}
                      onChange={(e) => setFeaturedSeriesForm({ ...featuredSeriesForm, customDescriptionAr: e.target.value })}
                      placeholder="اتركه فارغًا لاستخدام الوصف العربي الخاص بالسلسلة..."
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <SectionSaveButton
                    label="Featured Series"
                    dirty={isDirty(featuredSeriesForm, featuredSeriesConfig)}
                    onSave={() => {
                      updateFeaturedSeriesConfig(featuredSeriesForm);
                      showToast("Featured Series showcase settings saved live.");
                    }}
                  />
                </div>
              </div>


              {/* 09. GENRE GRID */}
              <div className="p-6 bg-ink-surface border border-ink-border rounded-sm space-y-6">
                <div className="flex items-center justify-between border-b border-ink-border/50 pb-3">
                  <h2 className="text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-gold" />
                    <span>09. Genre Grid</span>
                  </h2>
                  <span className="text-[10px] text-text-muted">
                    Edit category directory titles, badges, and customize individual genre cards (Kanji, artwork, descriptions).
                  </span>
                </div>

                {/* Section Header Editor */}
                <div className="space-y-3 font-mono text-xs">
                  <div className="text-[11px] uppercase tracking-wider text-paper font-bold pb-1 border-b border-ink-border/30">
                    A. Section Header Copy
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col justify-end">
                      <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                        Directory Tag / Badge
                      </label>
                      <input
                        type="text"
                        value={genreBentoForm.badgeText}
                        onChange={(e) => setGenreBentoForm({ ...genreBentoForm, badgeText: e.target.value })}
                        placeholder="CURATED ARCHIVES"
                        className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                        Section Headline Title
                      </label>
                      <input
                        type="text"
                        value={genreBentoForm.title}
                        onChange={(e) => setGenreBentoForm({ ...genreBentoForm, title: e.target.value })}
                        placeholder="EXPLORE YOUR GENRE"
                        className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                        Section Descriptive Subtext
                      </label>
                      <textarea
                        rows={2}
                        value={genreBentoForm.description}
                        onChange={(e) => setGenreBentoForm({ ...genreBentoForm, description: e.target.value })}
                        className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <SectionSaveButton
                    label="Header Copy"
                    dirty={isDirty(genreBentoForm, genreBentoConfig)}
                    onSave={() => {
                      updateGenreBentoConfig(genreBentoForm);
                      showToast("Genre section header updated live.");
                    }}
                  />
                  </div>
                </div>

                {/* Individual Genre Card Editor */}
                <div className="space-y-4 font-mono text-xs pt-4 border-t border-ink-border/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-paper font-bold">
                        B. Individual Genre Cards ({genres.length} Categories)
                      </div>
                      <span className="text-[10px] text-text-muted">
                        Select a genre below to customize its artwork, Kanji, and descriptions.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingGenreForModal(null);
                        setIsGenreModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gold hover:bg-gold-light text-ink text-xs font-mono font-bold uppercase tracking-wider rounded-xs cursor-pointer shadow-xs transition-colors self-start sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add New Category</span>
                    </button>
                  </div>

                  {/* Genre Selector Pills */}
                  <div className="flex flex-wrap gap-1.5 p-1.5 bg-ink rounded-sm border border-ink-border/60">
                    {genres.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setSelectedGenreId(g.id)}
                        className={`px-3 py-1.5 rounded-xs text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          selectedGenreId === g.id
                            ? "bg-gold text-ink shadow-xs"
                            : "text-text-muted hover:text-paper hover:bg-ink-surface"
                        }`}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>

                  {/* Active Genre Card Form */}
                  {currentGenre && (
                    <div className="p-4 bg-ink border border-ink-border rounded-sm space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Genre Name */}
                        <div className="flex flex-col justify-end">
                          <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                            Genre Name (English)
                          </label>
                          <input
                            type="text"
                            value={currentGenre.name}
                            onChange={(e) => updateCurrentGenreDraft({ name: e.target.value })}
                            className="w-full h-10 bg-ink-surface border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                          />
                        </div>

                        {/* Japanese Script */}
                        <div className="flex flex-col justify-end">
                          <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                            Japanese Script / Kanji
                          </label>
                          <input
                            type="text"
                            value={currentGenre.japanese}
                            onChange={(e) => updateCurrentGenreDraft({ japanese: e.target.value })}
                            className="w-full h-10 bg-ink-surface border border-ink-border text-gold px-3 rounded-sm focus:border-gold outline-none text-xs font-serif"
                          />
                        </div>

                        {/* Canonical Series Tag */}
                        <div className="flex flex-col justify-end">
                          <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                            Canonical / Flagship Title
                          </label>
                          <input
                            type="text"
                            value={currentGenre.popularTitle}
                            onChange={(e) => updateCurrentGenreDraft({ popularTitle: e.target.value })}
                            placeholder="e.g. Berserk"
                            className="w-full h-10 bg-ink-surface border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                          />
                        </div>

                        {/* Cover Image URL */}
                        <div className="md:col-span-2 lg:col-span-3">
                          <ImageUploadInput
                            label="Card Background Cover Image"
                            value={currentGenre.coverImage}
                            onChange={(url) => updateCurrentGenreDraft({ coverImage: url })}
                            placeholder="https://... or upload local image file (Rec: 1200 × 800 px)"
                            aspectRatio="banner"
                            recommendedDimensions="1200 × 800 px (3:2 / 16:9 Bento Card)"
                            helpText="Displayed in the Bento Grid showcase"
                          />
                        </div>

                        {/* Curator Description */}
                        <div className="md:col-span-2 lg:col-span-3">
                          <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                            Curator Description
                          </label>
                          <textarea
                            rows={2}
                            value={currentGenre.description}
                            onChange={(e) => updateCurrentGenreDraft({ description: e.target.value })}
                            className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-ink-border/40">
                        {/* Live Thumbnail Preview */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-14 rounded-xs overflow-hidden border border-ink-border shrink-0 bg-ink-surface">
                            <img
                              src={currentGenre.coverImage}
                              alt={currentGenre.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-paper block">{currentGenre.name}</span>
                            <span className="text-[10px] text-gold font-serif">{currentGenre.japanese}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              if (
                                await confirm({
                                  title: `Delete "${currentGenre.name}"?`,
                                  body: [
                                    "The category disappears from the homepage grid and from the catalogue filters. Volumes tagged with it are not deleted.",
                                  ],
                                  destructive: true,
                                })
                              ) {
                                const nextGenre = genres.find((g) => g.id !== currentGenre.id);
                                deleteGenre(currentGenre.id);
                                if (nextGenre) setSelectedGenreId(nextGenre.id);
                                showToast(`Category "${currentGenre.name}" deleted.`);
                              }
                            }}
                            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-ink-elevated hover:bg-red-950/60 text-text-muted hover:text-red-400 font-bold text-xs uppercase tracking-wider rounded-sm transition-colors border border-ink-border cursor-pointer"
                            title={`Delete category ${currentGenre.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>

                          <SectionSaveButton
                            label={currentGenre.name}
                            // `currentGenre` is the draft when one exists and
                            // the stored category otherwise, so comparing it
                            // against the stored one is the difference.
                            dirty={isDirty(
                              currentGenre,
                              genres.find((g) => g.id === currentGenre.id)
                            )}
                            onSave={() => {
                              updateGenre(currentGenre.id, currentGenre);
                              showToast(`Genre "${currentGenre.name}" updated successfully.`);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>


              {/* 10. SEARCH SECTION */}
              <div className="p-6 bg-ink-surface border border-ink-border rounded-sm space-y-5">
                <div className="flex items-center justify-between border-b border-ink-border/50 pb-3">
                  <h2 className="text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Search className="w-4 h-4 text-gold" />
                    <span>10. Search Section</span>
                  </h2>
                  <span className="text-[10px] text-text-muted">
                    Configure search section title, description, placeholder, default tab, and result count.
                  </span>
                </div>

                <div className="space-y-4 font-mono text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col justify-end">
                      <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                        Section Badge Text
                      </label>
                      <input
                        type="text"
                        value={mangaDiscoveryForm?.badgeText || ""}
                        onChange={(e) =>
                          setMangaDiscoveryForm({ ...mangaDiscoveryForm, badgeText: e.target.value })
                        }
                        placeholder="INSTANT ARCHIVAL LOOKUP"
                        className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                        Section Headline Title
                      </label>
                      <input
                        type="text"
                        value={mangaDiscoveryForm?.title || ""}
                        onChange={(e) =>
                          setMangaDiscoveryForm({ ...mangaDiscoveryForm, title: e.target.value })
                        }
                        placeholder="FIND YOUR NEXT MANGA"
                        className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                        Section Descriptive Subtext
                      </label>
                      <textarea
                        rows={2}
                        value={mangaDiscoveryForm?.description || ""}
                        onChange={(e) =>
                          setMangaDiscoveryForm({ ...mangaDiscoveryForm, description: e.target.value })
                        }
                        className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none text-xs font-mono"
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                        Search Input Placeholder
                      </label>
                      <input
                        type="text"
                        value={mangaDiscoveryForm?.searchPlaceholder || ""}
                        onChange={(e) =>
                          setMangaDiscoveryForm({ ...mangaDiscoveryForm, searchPlaceholder: e.target.value })
                        }
                        className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                        Catalog Link Text
                      </label>
                      <input
                        type="text"
                        value={mangaDiscoveryForm?.catalogLinkText || ""}
                        onChange={(e) =>
                          setMangaDiscoveryForm({ ...mangaDiscoveryForm, catalogLinkText: e.target.value })
                        }
                        className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                        Default Active Tab
                      </label>
                      <CustomSelect
                        fullWidth
                        value={mangaDiscoveryForm?.defaultTab || "POPULAR"}
                        onChange={(val) =>
                          setMangaDiscoveryForm({
                            ...mangaDiscoveryForm,
                            defaultTab: val as "POPULAR" | "TOP_RATED" | "BEST_SELLERS" | "RECENTLY_ADDED",
                          })
                        }
                        options={[
                          { value: "POPULAR", label: "POPULAR (Trending)" },
                          { value: "TOP_RATED", label: "TOP RATED (4.9+ Stars)" },
                          { value: "BEST_SELLERS", label: "BEST SELLERS" },
                          { value: "RECENTLY_ADDED", label: "RECENTLY ADDED (Vol. 1)" },
                        ]}
                        buttonClassName="bg-ink rounded-sm h-10 px-3 text-xs"
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                        Cards Display Count
                      </label>
                      <CustomSelect
                        fullWidth
                        value={String(mangaDiscoveryForm?.displayCount || 4)}
                        onChange={(val) =>
                          setMangaDiscoveryForm({
                            ...mangaDiscoveryForm,
                            displayCount: parseInt(val, 10) || 4,
                          })
                        }
                        options={[
                          { value: "4", label: "4 Cards (Single Row)" },
                          { value: "8", label: "8 Cards (Two Rows)" },
                        ]}
                        buttonClassName="bg-ink rounded-sm h-10 px-3 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <SectionSaveButton
                    label="Discovery Settings"
                    dirty={isDirty(mangaDiscoveryForm, mangaDiscoveryConfig)}
                    onSave={() => {
                      updateMangaDiscoveryConfig(mangaDiscoveryForm);
                      showToast("Manga discovery settings saved live.");
                    }}
                  />
                  </div>
                </div>
              </div>
              </CollapsibleSection>
            </>
          ) : (
            <div className="space-y-8" dir="rtl">
              {/* Arabic Mode Active Notification */}
              <div className="p-4 bg-gold/10 border border-gold/30 rounded-sm text-xs text-gold flex items-center justify-between">
                <div>
                  <p className="font-bold font-sans text-sm">أنت الآن في وضع تخصيص نصوص الموقع باللغة العربية</p>
                  <p className="text-text-muted text-[11px] mt-1 font-sans">
                    جميع النصوص هنا تظهر مباشرة للمستخدم عند اختيار الواجهة العربية. أسماء المانجا والكتب وأوصافها محفوظة كما هي.
                  </p>
                </div>
              </div>

              {/* 1. HERO SECTION ARABIC */}
              <div className="p-6 bg-ink-surface border border-ink-border rounded-sm space-y-4">
                <div className="flex items-center justify-between border-b border-ink-border/50 pb-2">
                  <h2 className="text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-2 font-sans">
                    <FileText className="w-4 h-4" />
                    <span>01. نصوص الواجهة الرئيسية (Hero Section Arabic)</span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                  <div>
                    <label className="block text-text-muted mb-1">شارة الفصل الترحيبية (Badge)</label>
                    <input
                      type="text"
                      value={heroArabicForm.badgeText}
                      onChange={(e) => setHeroArabicForm({ ...heroArabicForm, badgeText: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:col-span-2 bg-ink/60 p-3 border border-ink-border rounded-sm">
                    <div>
                      <label className="block text-text-muted mb-1 text-[11px]">السطر الأول من العنوان</label>
                      <input
                        type="text"
                        value={heroArabicForm.headlineLine1}
                        onChange={(e) => setHeroArabicForm({ ...heroArabicForm, headlineLine1: e.target.value })}
                        className="w-full bg-ink border border-ink-border text-paper font-bold text-xs px-3 py-2 rounded-sm focus:border-gold outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gold mb-1 text-[11px]">الكلمة المميزة الذهبية</label>
                      <input
                        type="text"
                        value={heroArabicForm.headlineHighlight}
                        onChange={(e) => setHeroArabicForm({ ...heroArabicForm, headlineHighlight: e.target.value })}
                        className="w-full bg-ink border border-gold/60 text-gold font-bold text-xs px-3 py-2 rounded-sm focus:border-gold outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-text-muted mb-1 text-[11px]">السطر الثاني من العنوان</label>
                      <input
                        type="text"
                        value={heroArabicForm.headlineLine2}
                        onChange={(e) => setHeroArabicForm({ ...heroArabicForm, headlineLine2: e.target.value })}
                        className="w-full bg-ink border border-ink-border text-paper font-bold text-xs px-3 py-2 rounded-sm focus:border-gold outline-none"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-text-muted mb-1">الوصف والسرد الترحيبي (Subheadline)</label>
                    <textarea
                      rows={2}
                      value={heroArabicForm.subheadline}
                      onChange={(e) => setHeroArabicForm({ ...heroArabicForm, subheadline: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">نص زر التصفح الرئيسي (Primary CTA)</label>
                    <input
                      type="text"
                      value={heroArabicForm.primaryCtaText}
                      onChange={(e) => setHeroArabicForm({ ...heroArabicForm, primaryCtaText: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">نص زر الإصدارات الجديدة (Secondary CTA)</label>
                    <input
                      type="text"
                      value={heroArabicForm.secondaryCtaText}
                      onChange={(e) => setHeroArabicForm({ ...heroArabicForm, secondaryCtaText: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  {/* 3 Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:col-span-2 pt-2 border-t border-ink-border/40">
                    <div>
                      <label className="block text-text-muted mb-1 text-[11px]">الإحصائية 1 (قيمة / وصف)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={heroArabicForm.stat1Value}
                          onChange={(e) => setHeroArabicForm({ ...heroArabicForm, stat1Value: e.target.value })}
                          className="w-24 bg-ink border border-ink-border text-paper px-2 py-1.5 rounded-sm text-xs font-bold"
                        />
                        <input
                          type="text"
                          value={heroArabicForm.stat1Label}
                          onChange={(e) => setHeroArabicForm({ ...heroArabicForm, stat1Label: e.target.value })}
                          className="flex-1 bg-ink border border-ink-border text-paper px-2 py-1.5 rounded-sm text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-text-muted mb-1 text-[11px]">الإحصائية 2 (قيمة / وصف)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={heroArabicForm.stat2Value}
                          onChange={(e) => setHeroArabicForm({ ...heroArabicForm, stat2Value: e.target.value })}
                          className="w-24 bg-ink border border-ink-border text-paper px-2 py-1.5 rounded-sm text-xs font-bold"
                        />
                        <input
                          type="text"
                          value={heroArabicForm.stat2Label}
                          onChange={(e) => setHeroArabicForm({ ...heroArabicForm, stat2Label: e.target.value })}
                          className="flex-1 bg-ink border border-ink-border text-paper px-2 py-1.5 rounded-sm text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gold mb-1 text-[11px]">الإحصائية 3 (قيمة / سرعة التوصيل)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={heroArabicForm.stat3Value}
                          onChange={(e) => setHeroArabicForm({ ...heroArabicForm, stat3Value: e.target.value })}
                          className="w-24 bg-ink border border-ink-border text-gold px-2 py-1.5 rounded-sm text-xs font-bold"
                        />
                        <input
                          type="text"
                          value={heroArabicForm.stat3Label}
                          onChange={(e) => setHeroArabicForm({ ...heroArabicForm, stat3Label: e.target.value })}
                          className="flex-1 bg-ink border border-ink-border text-paper px-2 py-1.5 rounded-sm text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <SectionSaveButton
                    label="نصوص الهيرو بالعربي"
                    dirty={isDirty(heroArabicForm, heroArabicContent)}
                    onSave={() => {
                      updateHeroArabicContent(heroArabicForm);
                      showToast("تم حفظ المحتوى العربي للواجهة الرئيسية بنجاح.");
                    }}
                  />
                </div>
              </div>

              {/* 3. LOGISTICS & SHIPPING PERKS ARABIC */}
              <div className="p-6 bg-ink-surface border border-ink-border rounded-sm space-y-6">
                <div className="flex items-center justify-between border-b border-ink-border/50 pb-2">
                  <h2 className="text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-2 font-sans">
                    <Package className="w-4 h-4" />
                    <span>03. اللوجستيات ومميزات الشحن بالعربي (Shipping Perks)</span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
                  <div>
                    <label className="block text-text-muted mb-1">اسم مستودع الشحن الرئيسي</label>
                    <input
                      type="text"
                      value={shippingArabicForm.hubName}
                      onChange={(e) => setShippingArabicForm({ ...shippingArabicForm, hubName: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted mb-1">شارة الشحن السريع</label>
                    <input
                      type="text"
                      value={shippingArabicForm.dispatchBadgeText}
                      onChange={(e) => setShippingArabicForm({ ...shippingArabicForm, dispatchBadgeText: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted mb-1">شارة ضمان الأصالة</label>
                    <input
                      type="text"
                      value={shippingArabicForm.guaranteeBadgeText}
                      onChange={(e) => setShippingArabicForm({ ...shippingArabicForm, guaranteeBadgeText: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <SectionSaveButton
                    label="مميزات الشحن بالعربي"
                    dirty={isDirty(shippingArabicForm, shippingArabicConfig)}
                    onSave={() => {
                      updateShippingArabicConfig(shippingArabicForm);
                      showToast("تم حفظ مميزات الشحن العربية بنجاح.");
                    }}
                  />
                </div>
              </div>

              {/* 4. EDITORIAL POLICIES ARABIC */}
              <div className="p-6 bg-ink-surface border border-ink-border rounded-sm space-y-4">
                <div className="flex items-center justify-between border-b border-ink-border/50 pb-2">
                  <h2 className="text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-2 font-sans">
                    <FileText className="w-4 h-4" />
                    <span>04. السياسات والبيان التحريري بالعربي (Policies & Guarantees)</span>
                  </h2>
                </div>

                <div className="space-y-3 text-xs font-sans">
                  <div>
                    <label className="block text-text-muted mb-1">شعار وهوية الموقع (Site Tagline)</label>
                    <input
                      type="text"
                      value={editorialArabicForm.siteTagline}
                      onChange={(e) => setEditorialArabicForm({ ...editorialArabicForm, siteTagline: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">وصف المتجر في الفوتر (Footer Description)</label>
                    <textarea
                      rows={2}
                      value={editorialArabicForm.footerDescription}
                      onChange={(e) => setEditorialArabicForm({ ...editorialArabicForm, footerDescription: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">سطر المدن والمحافظات (تحت اللوجو)</label>
                    <input
                      type="text"
                      value={editorialArabicForm.hubCities}
                      onChange={(e) => setEditorialArabicForm({ ...editorialArabicForm, hubCities: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">اقتباس الفوتر (Footer Quote)</label>
                    <textarea
                      rows={2}
                      value={editorialArabicForm.footerQuote}
                      onChange={(e) => setEditorialArabicForm({ ...editorialArabicForm, footerQuote: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">بيان ضمان الأصالة 100%</label>
                    <textarea
                      rows={2}
                      value={editorialArabicForm.authenticityGuaranteeText}
                      onChange={(e) => setEditorialArabicForm({ ...editorialArabicForm, authenticityGuaranteeText: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">بروتوكول الشحن والتغليف الأرشيفي</label>
                    <textarea
                      rows={2}
                      value={editorialArabicForm.shippingPolicyText}
                      onChange={(e) => setEditorialArabicForm({ ...editorialArabicForm, shippingPolicyText: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">بيان ضمان الاستبدال خلال 14 يوماً</label>
                    <textarea
                      rows={2}
                      value={editorialArabicForm.returnPolicyText}
                      onChange={(e) => setEditorialArabicForm({ ...editorialArabicForm, returnPolicyText: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <SectionSaveButton
                    label="السياسات بالعربي"
                    dirty={isDirty(editorialArabicForm, editorialArabicConfig)}
                    onSave={() => {
                      updateEditorialArabicConfig(editorialArabicForm);
                      showToast("تم حفظ السياسات والبيانات التحريرية بالعربي بنجاح.");
                    }}
                  />
                </div>
              </div>

              {/* 4. TRENDING NOW ARABIC */}
              <div className="p-6 bg-ink-surface border border-ink-border rounded-sm space-y-4">
                <div className="flex items-center justify-between border-b border-ink-border/50 pb-2">
                  <h2 className="text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-2 font-sans">
                    <Sparkles className="w-4 h-4 text-vermilion" />
                    <span>04. نصوص قسم الأكثر رواجاً (Trending Now Arabic)</span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                  <div>
                    <label className="block text-text-muted mb-1">شارة القسم العلوية (Badge)</label>
                    <input
                      type="text"
                      value={trendingArabicForm?.badgeText || ""}
                      onChange={(e) => setTrendingArabicForm({ ...trendingArabicForm, badgeText: e.target.value })}
                      placeholder="مختارات الأرشيف"
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">عنوان القسم الرئيسي (Headline)</label>
                    <input
                      type="text"
                      value={trendingArabicForm?.headline || ""}
                      onChange={(e) => setTrendingArabicForm({ ...trendingArabicForm, headline: e.target.value })}
                      placeholder="الأكثر رواجاً الآن"
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <SectionSaveButton
                    label="قسم الأكثر رواجاً"
                    dirty={isDirty(trendingArabicForm, trendingArabicConfig)}
                    onSave={() => {
                      updateTrendingArabicConfig(trendingArabicForm);
                      showToast("تم حفظ نصوص قسم الأكثر تداولاً بالعربي بنجاح.");
                    }}
                  />
                </div>
              </div>

              {/* 5. NEW RELEASES & MANGA DISCOVERY ARABIC */}
              <div className="p-6 bg-ink-surface border border-ink-border rounded-sm space-y-4">
                <div className="flex items-center justify-between border-b border-ink-border/50 pb-2">
                  <h2 className="text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-2 font-sans">
                    <Sparkles className="w-4 h-4 text-gold" />
                    <span>05. عناوين البحث بالأرشيف (Discovery)</span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                  <div className="md:col-span-2 pt-2 border-t border-ink-border/40">
                    <label className="block text-gold font-bold mb-2">إعدادات قسم البحث الفوري بالأرشيف (Instant Lookup)</label>
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">شارة قسم البحث</label>
                    <input
                      type="text"
                      value={mangaDiscoveryArabicForm.badgeText}
                      onChange={(e) => setMangaDiscoveryArabicForm({ ...mangaDiscoveryArabicForm, badgeText: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted mb-1">عنوان قسم البحث</label>
                    <input
                      type="text"
                      value={mangaDiscoveryArabicForm.title}
                      onChange={(e) => setMangaDiscoveryArabicForm({ ...mangaDiscoveryArabicForm, title: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-text-muted mb-1">وصف قسم البحث</label>
                    <textarea
                      rows={2}
                      value={mangaDiscoveryArabicForm.description}
                      onChange={(e) => setMangaDiscoveryArabicForm({ ...mangaDiscoveryArabicForm, description: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted mb-1">النص التوضيحي داخل حقل البحث (Placeholder)</label>
                    <input
                      type="text"
                      value={mangaDiscoveryArabicForm.searchPlaceholder}
                      onChange={(e) => setMangaDiscoveryArabicForm({ ...mangaDiscoveryArabicForm, searchPlaceholder: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted mb-1">نص رابط الانتقال للكتالوج</label>
                    <input
                      type="text"
                      value={mangaDiscoveryArabicForm.catalogLinkText}
                      onChange={(e) => setMangaDiscoveryArabicForm({ ...mangaDiscoveryArabicForm, catalogLinkText: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      updateMangaDiscoveryArabicConfig(mangaDiscoveryArabicForm);
                      showToast("تم حفظ نصوص البحث الفوري بالعربي بنجاح.");
                    }}
                    className="flex items-center gap-1.5 px-5 py-2 bg-gold hover:bg-gold-muted text-ink font-bold text-xs uppercase tracking-wider rounded-sm transition-colors cursor-pointer font-sans"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>حفظ نصوص البحث بالعربي</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

          {/* ======================================================== */}
          {/* TAB 5: ORDERS & CUSTOMER CRM                             */}
          {/* ======================================================== */}
          {activeTab === "orders" && (
            <div className="space-y-4 sm:space-y-6 font-mono">
              {/* Header with Title & Live Refresh */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                  <h1 className="font-cinzel text-xl sm:text-2xl font-bold text-paper">Orders &amp; Customers</h1>
                  <p className="text-xs font-mono text-text-muted mt-0.5 sm:mt-1">
                    Manage orders, payment verification, and dispatch.
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={handleRefreshOrders}
                    disabled={isRefreshingOrders}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-ink-surface border border-ink-border hover:border-gold/60 text-text-muted hover:text-gold rounded-sm text-xs cursor-pointer transition-colors disabled:opacity-50"
                    title="Refresh orders from central server database"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingOrders ? "animate-spin text-gold" : ""}`} />
                    <span>Sync</span>
                  </button>
                  <div className="text-xs text-gold border border-gold/30 bg-gold/10 px-2.5 sm:px-3 py-1.5 rounded-sm">
                    Total: <strong>{allOrders.length}</strong>
                  </div>
                </div>
              </div>

              {/* 1. LATEST ORDERS SPOTLIGHT */}
              {allOrders.length > 0 && (
                <div className="space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gold font-bold uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold" />
                      <span>Latest Orders</span>
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-text-muted">Recent customer submissions</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                    {recentOrders.map(({ order, customer }) => {
                      return (
                        <div
                          key={`recent-${order.id}`}
                          onClick={() => {
                            setSelectedOrder(order);
                            setSelectedCustomer(customer);
                            setIsOrderModalOpen(true);
                          }}
                          className="bg-ink-surface border border-ink-border hover:border-gold/60 p-3 sm:p-4 rounded-sm cursor-pointer transition-all hover:-translate-y-0.5 shadow-sm group"
                        >
                          <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-ink-border/50">
                            <span className="text-gold font-bold text-xs group-hover:text-gold-light">
                              #{order.id}
                            </span>
                            <span className="text-[10px] text-text-muted">{order.date}</span>
                          </div>

                          <div className="text-paper font-bold text-xs truncate mb-1">
                            {customer.name || "Collector"}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-text-muted mb-2.5">
                            <span>{order.items.length} vol{order.items.length > 1 ? "s" : ""}</span>
                            <span className="text-gold font-bold">{formatPrice(order.total)}</span>
                          </div>

                          <div className="flex items-center justify-between gap-1 pt-1 border-t border-ink-border/30">
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded-xs font-semibold ${
                                order.status === "Delivered"
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                  : order.status === "Shipped"
                                  ? "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                                  : order.status === "Processing" || order.status === "Confirmed"
                                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                  : order.status.includes("Pending")
                                  ? "bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse"
                                  : "bg-ink border border-ink-border text-paper"
                              }`}
                            >
                              {order.status}
                            </span>

                            <span className="text-[9px] text-text-muted truncate">
                              {order.paymentMethod === "wallet"
                                ? "Wallet"
                                : order.paymentMethod === "instapay"
                                ? "InstaPay"
                                : "COD"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. STATUS QUICK PILLS / COUNTERS */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setOrderStatusFilter("all")}
                  className={`p-2 sm:p-2.5 rounded-sm border text-left transition-all cursor-pointer ${
                    orderStatusFilter === "all"
                      ? "bg-gold text-ink border-gold font-bold shadow-md shadow-gold/10"
                      : "bg-ink-surface border-ink-border text-text-muted hover:text-paper hover:border-gold/40"
                  }`}
                >
                  <div className="text-[9px] sm:text-[10px] uppercase">All</div>
                  <div className="text-sm sm:text-base font-extrabold">{orderStats.total}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderStatusFilter("pending")}
                  className={`p-2 sm:p-2.5 rounded-sm border text-left transition-all cursor-pointer ${
                    orderStatusFilter === "pending"
                      ? "bg-rose-500 text-white border-rose-500 font-bold"
                      : "bg-ink-surface border-ink-border text-rose-400 hover:border-rose-400/50"
                  }`}
                >
                  <div className="text-[9px] sm:text-[10px] uppercase">Pending</div>
                  <div className="text-sm sm:text-base font-extrabold">{orderStats.pending}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderStatusFilter("processing")}
                  className={`p-2 sm:p-2.5 rounded-sm border text-left transition-all cursor-pointer ${
                    orderStatusFilter === "processing"
                      ? "bg-amber-500 text-ink border-amber-500 font-bold"
                      : "bg-ink-surface border-ink-border text-amber-400 hover:border-amber-400/50"
                  }`}
                >
                  <div className="text-[9px] sm:text-[10px] uppercase">Processing</div>
                  <div className="text-sm sm:text-base font-extrabold">{orderStats.processing}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderStatusFilter("shipped")}
                  className={`p-2 sm:p-2.5 rounded-sm border text-left transition-all cursor-pointer ${
                    orderStatusFilter === "shipped"
                      ? "bg-sky-500 text-white border-sky-500 font-bold"
                      : "bg-ink-surface border-ink-border text-sky-400 hover:border-sky-400/50"
                  }`}
                >
                  <div className="text-[9px] sm:text-[10px] uppercase">Shipped</div>
                  <div className="text-sm sm:text-base font-extrabold">{orderStats.shipped}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderStatusFilter("delivered")}
                  className={`p-2 sm:p-2.5 rounded-sm border text-left transition-all cursor-pointer ${
                    orderStatusFilter === "delivered"
                      ? "bg-emerald-500 text-white border-emerald-500 font-bold"
                      : "bg-ink-surface border-ink-border text-emerald-400 hover:border-emerald-400/50"
                  }`}
                >
                  <div className="text-[9px] sm:text-[10px] uppercase">Delivered</div>
                  <div className="text-sm sm:text-base font-extrabold">{orderStats.delivered}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderStatusFilter("cancelled")}
                  className={`p-2 sm:p-2.5 rounded-sm border text-left transition-all cursor-pointer ${
                    orderStatusFilter === "cancelled"
                      ? "bg-zinc-600 text-white border-zinc-500 font-bold"
                      : "bg-ink-surface border-ink-border text-zinc-400 hover:border-zinc-400/50"
                  }`}
                >
                  <div className="text-[9px] sm:text-[10px] uppercase">Cancelled</div>
                  <div className="text-sm sm:text-base font-extrabold">{orderStats.cancelled}</div>
                </button>
              </div>

              {/* 3. ADVANCED FILTERS & SEARCH TOOLBAR */}
              <div className="p-3 sm:p-4 bg-ink-surface border border-ink-border rounded-sm space-y-2.5 sm:space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 text-xs [&>*]:min-w-0">
                  {/* Search by Order ID / Customer / Phone / Tracking */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="Search ID, customer, phone..."
                      className="w-full h-9 bg-ink border border-ink-border text-paper pl-9 pr-3 rounded-sm focus:border-gold outline-none text-xs placeholder:text-text-muted/60"
                    />
                  </div>

                  {/* Status Dropdown */}
                  <CustomSelect
                    value={orderStatusFilter}
                    onChange={(val) => setOrderStatusFilter(val)}
                    options={[
                      { value: "all", label: "All Statuses" },
                      { value: "pending", label: "Pending Payment" },
                      { value: "confirmed", label: "Confirmed" },
                      { value: "processing", label: "Processing" },
                      { value: "shipped", label: "Shipped" },
                      { value: "delivered", label: "Delivered" },
                      { value: "cancelled", label: "Cancelled" },
                    ]}
                    fullWidth
                    buttonClassName="h-9 bg-ink border-ink-border py-1 px-3 text-xs"
                  />

                  {/* Payment Method Dropdown */}
                  <CustomSelect
                    value={orderPaymentFilter}
                    onChange={(val) => setOrderPaymentFilter(val)}
                    options={[
                      { value: "all", label: "All Payment Methods" },
                      { value: "cash", label: "Cash on Delivery" },
                      { value: "wallet", label: "Mobile Wallet" },
                      { value: "instapay", label: "InstaPay" },
                      { value: "unverified", label: "Pending Verification" },
                      { value: "paid", label: "Verified & Paid" },
                    ]}
                    fullWidth
                    buttonClassName="h-9 bg-ink border-ink-border py-1 px-3 text-xs"
                  />

                  {/* Governorate Filter */}
                  <CustomSelect
                    value={orderGovFilter}
                    onChange={(val) => setOrderGovFilter(val)}
                    options={[
                      { value: "all", label: "All Governorates" },
                      ...EGYPT_GOVERNORATES.map((g) => ({
                        value: g.value,
                        label: g.label,
                      })),
                    ]}
                    fullWidth
                    buttonClassName="h-9 bg-ink border-ink-border py-1 px-3 text-xs"
                  />
                </div>

                {/* Filter Active Indicator & Reset Button */}
                {(orderSearch || orderStatusFilter !== "all" || orderPaymentFilter !== "all" || orderGovFilter !== "all") && (
                  <div className="flex items-center justify-between pt-2 border-t border-ink-border/40 text-[11px] text-text-muted">
                    <div className="flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5 text-gold" />
                      <span>
                        Showing <strong>{filteredOrders.length}</strong> of {allOrders.length} orders
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOrderSearch("");
                        setOrderStatusFilter("all");
                        setOrderPaymentFilter("all");
                        setOrderGovFilter("all");
                      }}
                      className="text-gold hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Filters</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 4. ORDERS MOBILE CARDS (Visible on mobile screens) */}
              <div className="grid grid-cols-1 gap-2.5 md:hidden text-xs">
                {filteredOrders.length === 0 ? (
                  <div className="p-8 text-center text-text-muted bg-ink-surface border border-ink-border rounded-sm">
                    No orders match your filters.
                  </div>
                ) : (
                  filteredOrders.map(({ order, customer }) => (
                    <div
                      key={`mob-order-${order.id}`}
                      className="p-3.5 bg-ink-surface border border-ink-border rounded-sm space-y-2.5 shadow-xs"
                    >
                      {/* Top: ID, Date, Total */}
                      <div className="flex items-center justify-between pb-2 border-b border-ink-border/40">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gold">#{order.id}</span>
                          <span className="text-[10px] text-text-muted">{order.date}</span>
                        </div>
                        <span className="font-bold text-paper text-sm">{formatPrice(order.total)}</span>
                      </div>

                      {/* Middle: Customer & Location */}
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="min-w-0">
                          <div className="font-bold text-paper truncate">{customer.name}</div>
                          <div className="text-[10px] text-text-muted">{customer.governorate || "Egypt"}</div>
                        </div>
                        <span className="text-[10px] text-text-muted shrink-0">{order.items.length} items</span>
                      </div>

                      {/* Badges: Payment & Status */}
                      <div className="flex items-center justify-between gap-1 flex-wrap pt-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded-xs bg-ink border border-ink-border text-[9px] text-text-muted">
                            {order.paymentMethod === "wallet"
                              ? "Wallet"
                              : order.paymentMethod === "instapay"
                              ? "InstaPay"
                              : "COD"}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-xs font-mono whitespace-nowrap ${
                              order.paymentStatus === "Verified & Paid"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : order.paymentStatus === "Pending Verification"
                                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                : "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                            }`}
                          >
                            {order.paymentStatus || (order.paymentMethod === "cash" ? "Pending Collection" : "Pending")}
                          </span>
                        </div>

                        <span
                          className={`px-2 py-0.5 border rounded-xs text-[10px] font-mono ${
                            order.status === "Delivered"
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : order.status === "Shipped"
                              ? "bg-sky-500/10 border-sky-500/30 text-sky-400"
                              : order.status === "Processing" || order.status === "Confirmed"
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                              : order.status === "Pending Payment"
                              ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                              : "bg-ink border-ink-border text-paper"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>

                      {/* Bottom Action buttons */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink-border/40">
                        <button
                          type="button"
                          onClick={() => printCustomerInvoice(order, customer)}
                          className="px-2.5 py-1 bg-ink border border-ink-border hover:border-gold text-paper text-[11px] rounded-xs flex items-center gap-1 font-mono"
                        >
                          <Printer strokeWidth={1.5} className="w-3 h-3 text-gold" />
                          <span>Print</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrder(order);
                            setSelectedCustomer(customer);
                            setIsOrderModalOpen(true);
                          }}
                          className="px-3 py-1 bg-gold text-ink font-bold text-[11px] rounded-xs font-mono hover:bg-gold-light"
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* 5. ORDERS DATA TABLE (Hidden on mobile) */}
              <div className="hidden md:block border border-ink-border rounded-sm overflow-x-auto bg-ink-surface">
                <table className="w-full text-left text-xs min-w-[750px]">
                  <thead className="bg-ink text-text-muted text-[10px] uppercase border-b border-ink-border">
                    <tr>
                      <th className="px-4 py-3">Order ID</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Payment</th>
                      <th className="px-4 py-3">Governorate</th>
                      <th className="px-4 py-3 text-center">Items</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-border/50">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-text-muted space-y-2">
                          <p>No orders match the selected filters or search criteria.</p>
                          {(orderSearch || orderStatusFilter !== "all" || orderPaymentFilter !== "all" || orderGovFilter !== "all") && (
                            <button
                              type="button"
                              onClick={() => {
                                setOrderSearch("");
                                setOrderStatusFilter("all");
                                setOrderPaymentFilter("all");
                                setOrderGovFilter("all");
                              }}
                              className="text-xs text-gold hover:underline cursor-pointer"
                            >
                              Clear active filters
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map(({ order, customer }) => (
                        <tr key={order.id} className="hover:bg-ink-elevated/40 transition-colors">
                          <td className="px-4 py-3 font-bold text-gold">#{order.id}</td>
                          <td className="px-4 py-3 text-text-muted">{order.date}</td>
                          <td className="px-4 py-3 text-paper font-bold">{customer.name}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-paper text-[11px] font-semibold">
                                {order.paymentMethod === "wallet"
                                  ? "Mobile Wallet"
                                  : order.paymentMethod === "instapay"
                                  ? "InstaPay"
                                  : "Cash On Delivery"}
                              </span>
                              <span
                                className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded-xs w-fit whitespace-nowrap ${
                                  order.paymentStatus === "Verified & Paid"
                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                    : order.paymentStatus === "Pending Verification"
                                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse"
                                    : "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                                }`}
                              >
                                {order.paymentStatus || (order.paymentMethod === "cash" ? "Pending Collection" : "Pending Verification")}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-text-muted">{customer.governorate || "Egypt Hub"}</td>
                          <td className="px-4 py-3 text-center text-paper font-bold">{order.items.length}</td>
                          <td className="px-4 py-3 text-right text-gold font-bold">{formatPrice(order.total)}</td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2 py-0.5 border rounded-xs text-[10px] font-mono ${
                                order.status === "Delivered"
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : order.status === "Shipped"
                                  ? "bg-sky-500/10 border-sky-500/30 text-sky-400"
                                  : order.status === "Processing" || order.status === "Confirmed"
                                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                  : order.status === "Pending Payment"
                                  ? "bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse"
                                  : "bg-ink border-ink-border text-paper"
                              }`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  printCustomerInvoice(order, customer);
                                }}
                                title="Print Customer Packing Slip & Invoice"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-ink border border-ink-border hover:border-gold hover:bg-gold/10 text-paper hover:text-gold rounded-xs transition-colors cursor-pointer text-[11px] font-mono font-semibold"
                              >
                                <Printer strokeWidth={1.5} className="w-3.5 h-3.5 text-gold" />
                                <span>Print</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setSelectedCustomer(customer);
                                  setIsOrderModalOpen(true);
                                }}
                                className="text-gold hover:underline cursor-pointer font-bold text-xs"
                              >
                                Manage Order
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 6: SETTINGS & BACKUP                                 */}
          {/* ======================================================== */}
          {activeTab === "settings" && (
            <div className="space-y-6 font-mono max-w-2xl">
              <div>
                <h1 className="font-cinzel text-2xl font-bold text-paper">Settings & Data Integrity</h1>
                <p className="text-xs text-text-muted mt-1">
                  Configure administrative credentials, export database snapshots, and restore factory defaults.
                </p>
              </div>

              {/* 2. Admin PIN */}
              <div className="p-4 sm:p-6 bg-ink-surface border border-ink-border rounded-sm space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-gold" />
                    <span>Master Security PIN</span>
                  </h2>
                  <span className="text-[10px] font-mono text-gold/80 px-2 py-0.5 bg-gold/10 border border-gold/20 rounded-xs">
                    Encrypted in Neon
                  </span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Stored as a one-way server-side hash. Updating it signs every admin session out.
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <input
                    type="password"
                    maxLength={64}
                    value={currentPinInput}
                    onChange={(e) => setCurrentPinInput(e.target.value)}
                    placeholder="Current PIN"
                    className="flex-1 min-w-[140px] bg-ink border border-ink-border text-paper px-3 py-2 text-xs rounded-sm focus:border-gold outline-none font-mono"
                  />
                  <input
                    type="password"
                    maxLength={64}
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    placeholder="New PIN (10+ chars)"
                    className="flex-1 min-w-[140px] bg-ink border border-ink-border text-paper px-3 py-2 text-xs rounded-sm focus:border-gold outline-none font-mono"
                  />
                  <input
                    type="password"
                    maxLength={64}
                    value={confirmPinInput}
                    onChange={(e) => setConfirmPinInput(e.target.value)}
                    placeholder="Confirm new PIN"
                    className="flex-1 min-w-[140px] bg-ink border border-ink-border text-paper px-3 py-2 text-xs rounded-sm focus:border-gold outline-none font-mono"
                  />
                  <button
                    type="button"
                    disabled={isUpdatingPin}
                    onClick={async () => {
                      const cleanCurrent = currentPinInput.trim();
                      const cleanNew = newPinInput.trim();
                      if (!cleanCurrent) {
                        showToast("Please enter your current Security PIN.");
                        return;
                      }
                      if (cleanNew.length < 10) {
                        showToast("New PIN must be at least 10 characters.");
                        return;
                      }
                      if (cleanNew !== confirmPinInput.trim()) {
                        showToast("New PIN confirmation does not match.");
                        return;
                      }
                      setIsUpdatingPin(true);
                      const res = await changeAdminPinWithServer(cleanCurrent, cleanNew);
                      setIsUpdatingPin(false);
                      if (res.success) {
                        setCurrentPinInput("");
                        setNewPinInput("");
                        setConfirmPinInput("");
                        await handleAdminSignOut();
                      } else {
                        showToast(res.message || "Failed to update Security PIN.");
                      }
                    }}
                    className="px-4 py-2 bg-ink-elevated hover:bg-gold hover:text-ink text-paper text-xs uppercase tracking-wider rounded-sm transition-colors border border-ink-border cursor-pointer font-bold shrink-0 disabled:opacity-50"
                  >
                    {isUpdatingPin ? "Updating..." : "Update PIN"}
                  </button>
                </div>
              </div>

              {/* 3. Authorized Admin Accounts */}
              <div className="p-4 sm:p-6 bg-ink-surface border border-ink-border rounded-sm space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Authorized Accounts</span>
                  </h2>
                  <span className="text-[10px] text-text-muted">
                    {adminEmails.length} {adminEmails.length === 1 ? "Admin" : "Admins"}
                  </span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Only accounts listed below have access to the admin console.
                </p>

                {/* Email list */}
                <div className="space-y-2 pt-1">
                  {adminEmails.map((email) => {
                    const isSelf = currentUser?.email.toLowerCase() === email.toLowerCase();
                    return (
                      <div
                        key={email}
                        className="flex items-center justify-between px-3 sm:px-3.5 py-2 sm:py-2.5 bg-ink border border-ink-border rounded-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <UserCheck className="w-3.5 h-3.5 text-gold shrink-0" />
                          <span className="text-xs text-paper font-mono truncate">{email}</span>
                          {isSelf && (
                            <span className="px-1.5 py-0.2 text-[9px] uppercase tracking-wider bg-gold/15 text-gold border border-gold/30 rounded-xs shrink-0">
                              You
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            const result = await removeAdminEmail(email);
                            showToast(result.message);
                          }}
                          disabled={adminEmails.length <= 1}
                          className={`p-1.5 rounded-xs transition-colors ${
                            adminEmails.length <= 1
                              ? "text-text-muted/30 cursor-not-allowed"
                              : "text-text-muted hover:text-vermilion hover:bg-vermilion/10 cursor-pointer"
                          }`}
                          title={
                            adminEmails.length <= 1
                              ? "At least one admin account is required"
                              : `Remove ${email}`
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Add new admin */}
                <div className="pt-1.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="email"
                    value={newAdminEmailInput}
                    onChange={(e) => setNewAdminEmailInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = newAdminEmailInput.trim().toLowerCase();
                        if (!val || !val.includes("@")) {
                          showToast("Please enter a valid email address.");
                          return;
                        }
                        if (adminEmails.map((em) => em.toLowerCase()).includes(val)) {
                          showToast("This email is already an authorized curator.");
                          return;
                        }
                        void addAdminEmail(val).then((result) => {
                          if (result.success) setNewAdminEmailInput("");
                          showToast(result.message);
                        });
                      }
                    }}
                    placeholder="e.g. name@gmail.com"
                    className="flex-1 bg-ink border border-ink-border text-paper px-3 py-2 text-xs rounded-sm focus:border-gold outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = newAdminEmailInput.trim().toLowerCase();
                      if (!val || !val.includes("@")) {
                        showToast("Please enter a valid email address.");
                        return;
                      }
                      if (adminEmails.map((em) => em.toLowerCase()).includes(val)) {
                        showToast("This email is already an authorized curator.");
                        return;
                      }
                      void addAdminEmail(val).then((result) => {
                        if (result.success) setNewAdminEmailInput("");
                        showToast(result.message);
                      });
                    }}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-ink-elevated hover:bg-gold hover:text-ink text-paper text-xs uppercase tracking-wider rounded-sm transition-colors border border-ink-border cursor-pointer shrink-0 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Admin</span>
                  </button>
                </div>
              </div>

              {/* 4. Data Backup & Restore */}
              <div className="p-4 sm:p-6 bg-ink-surface border border-ink-border rounded-sm space-y-3 sm:space-y-4">
                <h2 className="text-gold text-xs font-bold uppercase tracking-wider">
                  Data Backup &amp; Restore (JSON)
                </h2>
                <p className="text-xs text-text-muted">
                  Download a full backup of all books, series, and settings, or restore from file.
                </p>
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1">
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-3.5 py-2 bg-gold hover:bg-gold-muted text-ink font-bold text-xs uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export JSON</span>
                  </button>

                  <label className="flex items-center gap-2 px-3.5 py-2 bg-ink-elevated hover:bg-ink border border-ink-border text-paper font-bold text-xs uppercase tracking-wider rounded-sm transition-colors cursor-pointer">
                    <Upload className="w-4 h-4 text-gold" />
                    <span>Restore File</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* 5. Factory Reset */}
              <div className="p-4 sm:p-6 bg-ink-surface border border-vermilion/30 rounded-sm space-y-3 sm:space-y-4">
                <h2 className="text-vermilion text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Factory Reset</span>
                </h2>
                <p className="text-xs text-text-muted">
                  Restore all books, series, and site copy back to initial codebase defaults.
                </p>
                <button
                  onClick={async () => {
                    if (
                      await confirm({
                        title: "Restore factory defaults?",
                        body: [
                          "Every book, series, category and piece of site copy goes back to what shipped with the code.",
                          "Anything added or edited since then is discarded. This cannot be undone.",
                        ],
                        confirmLabel: "Restore defaults",
                        destructive: true,
                      })
                    ) {
                      resetToDefaults();
                      setHeroForm(heroContent);
                      setShippingForm({
                        ...shippingConfig,
                        governoratesList: shippingConfig.governoratesList || EGYPT_GOVERNORATES,
                        governorateRates: {
                          ...DEFAULT_GOVERNORATE_RATES,
                          ...(shippingConfig.governorateRates || {}),
                        },
                      });
                      setEditorialForm(editorialConfig);
                      setFeaturedSeriesForm(featuredSeriesConfig);
                      setGenreBentoForm(genreBentoConfig);
                      setGenreDrafts({});
                      showToast("All store data reset to factory defaults.");
                    }
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 bg-vermilion/15 hover:bg-vermilion text-vermilion hover:text-white font-bold text-xs uppercase tracking-wider rounded-sm transition-colors cursor-pointer border border-vermilion/40"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset All Data to Default</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODALS */}
      <VolumeFormModal
        isOpen={isVolumeModalOpen}
        onClose={() => {
          setIsVolumeModalOpen(false);
          setEditingVolume(null);
        }}
        onSave={handleSaveVolume}
        initialVolume={editingVolume}
        seriesList={series}
      />

      <SeriesFormModal
        isOpen={isSeriesModalOpen}
        onClose={() => {
          setIsSeriesModalOpen(false);
          setEditingSeries(null);
        }}
        onSave={handleSaveSeries}
        initialSeries={editingSeries}
      />

      <OrderDetailsModal
        isOpen={isOrderModalOpen}
        onClose={() => {
          setIsOrderModalOpen(false);
          setSelectedOrder(null);
          setSelectedCustomer(null);
        }}
        order={selectedOrder}
        customer={selectedCustomer}
        onUpdateOrder={async (orderId, updates) => {
          const fullOrderPayload = selectedOrder
            ? {
                ...selectedOrder,
                customerEmail: selectedCustomer?.email || selectedOrder.customerEmail,
                customerName: selectedCustomer?.name || selectedOrder.customerName,
                customerPhone: selectedCustomer?.phone || selectedOrder.customerPhone,
                customerAddress: selectedCustomer?.address || selectedOrder.customerAddress,
                customerGovernorate: selectedCustomer?.governorate || selectedOrder.customerGovernorate,
                ...updates,
              }
            : undefined;

          try {
            const response = await fetch("/api/orders", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId, updates, fullOrder: fullOrderPayload }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok || !payload?.success) {
              throw new Error(payload?.message || "Central order update was rejected.");
            }
          } catch (error) {
            console.error("Server order patch error:", error);
            showToast(`Order #${orderId} could not be synced. Please try again.`);
            return;
          }
          updateOrderStatus(orderId, updates);
          setServerOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, ...updates } : o))
          );
          if (selectedOrder && selectedOrder.id === orderId) {
            setSelectedOrder({ ...selectedOrder, ...updates });
          }
          showToast(`Order #${orderId} updated successfully.`);
        }}
        onUpdateStatus={async (orderId, newStatus) => {
          const fullOrderPayload = selectedOrder
            ? {
                ...selectedOrder,
                customerEmail: selectedCustomer?.email || selectedOrder.customerEmail,
                customerName: selectedCustomer?.name || selectedOrder.customerName,
                customerPhone: selectedCustomer?.phone || selectedOrder.customerPhone,
                customerAddress: selectedCustomer?.address || selectedOrder.customerAddress,
                customerGovernorate: selectedCustomer?.governorate || selectedOrder.customerGovernorate,
                status: newStatus,
              }
            : undefined;

          try {
            const response = await fetch("/api/orders", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId, updates: { status: newStatus }, fullOrder: fullOrderPayload }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok || !payload?.success) {
              throw new Error(payload?.message || "Central order update was rejected.");
            }
          } catch (error) {
            console.error("Server order patch error:", error);
            showToast(`Order #${orderId} status could not be synced. Please try again.`);
            return;
          }
          updateOrderStatus(orderId, { status: newStatus });
          setServerOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
          );
          if (selectedOrder && selectedOrder.id === orderId) {
            setSelectedOrder({ ...selectedOrder, status: newStatus });
          }
          showToast(`Order #${orderId} status set to "${newStatus}"`);
        }}
      />

      <GenreFormModal
        isOpen={isGenreModalOpen}
        onClose={() => {
          setIsGenreModalOpen(false);
          setEditingGenreForModal(null);
        }}
        initialGenre={editingGenreForModal}
        onSave={(savedGenre) => {
          if (editingGenreForModal) {
            updateGenre(editingGenreForModal.id, savedGenre);
            showToast(`Category "${savedGenre.name}" updated successfully.`);
          } else {
            addGenre(savedGenre);
            setSelectedGenreId(savedGenre.id);
            showToast(`Category "${savedGenre.name}" created successfully.`);
          }
          setIsGenreModalOpen(false);
          setEditingGenreForModal(null);
        }}
        onDelete={(id) => {
          const nextGenre = genres.find((g) => g.id !== id);
          deleteGenre(id);
          if (nextGenre) setSelectedGenreId(nextGenre.id);
          setIsGenreModalOpen(false);
          setEditingGenreForModal(null);
          showToast("Category deleted successfully.");
        }}
      />

      {/* The console's own confirmation dialog; rendered last so it sits over
          every other surface, including the form modals that can open one. */}
      {confirmDialog}
    </div>
  );
}
