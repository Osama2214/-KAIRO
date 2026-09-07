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
  ExternalLink,
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
} from "lucide-react";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { useAuthStore, SavedOrder, UserProfile } from "@/store/useAuthStore";
import { MangaVolume, Series, GenreInfo } from "@/data/manga";
import { formatPrice } from "@/lib/utils";
import { AdminLoginOverlay } from "@/components/admin/AdminLoginOverlay";
import { VolumeFormModal } from "@/components/admin/VolumeFormModal";
import { SeriesFormModal } from "@/components/admin/SeriesFormModal";
import { OrderDetailsModal } from "@/components/admin/OrderDetailsModal";
import { CustomSelect } from "@/components/CustomSelect";
import { CustomNumberInput } from "@/components/ui/CustomNumberInput";
import { useMounted } from "@/store/useWishlistStore";
import { hashAdminPin, changeAdminPinWithServer } from "@/lib/security";
import { EGYPT_GOVERNORATES, DEFAULT_GOVERNORATE_RATES } from "@/data/governorates";

type AdminTab = "overview" | "volumes" | "series" | "cms" | "orders" | "settings";

export default function AdminPage() {
  const mounted = useMounted();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isVolumeModalOpen, setIsVolumeModalOpen] = useState(false);
  const [editingVolume, setEditingVolume] = useState<MangaVolume | null>(null);

  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SavedOrder | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<UserProfile | null>(null);

  // Storefront CMS State & Actions
  const {
    volumes,
    series,
    heroContent,
    announcement,
    shippingConfig,
    editorialConfig,
    featuredSeriesConfig,
    collectionConfig,
    genreBentoConfig,
    genres,
    isAdminAuthenticated,
    adminPin,
    adminPinHash,
    addVolume,
    updateVolume,
    deleteVolume,
    duplicateVolume,
    addSeries,
    updateSeries,
    deleteSeries,
    updateHeroContent,
    updateAnnouncement,
    updateShippingConfig,
    updateEditorialConfig,
    updateFeaturedSeriesConfig,
    updateCollectionConfig,
    updateGenreBentoConfig,
    updateGenre,
    logoutAdmin,
    updateAdminPin,
    updateAdminPinHash,
    adminEmails,
    addAdminEmail,
    removeAdminEmail,
    exportData,
    importData,
    resetToDefaults,
  } = useStorefrontStore();

  // Auth & Orders State
  const users = useAuthStore((state) => state.users);
  const currentUser = useAuthStore((state) => state.currentUser);
  const updateOrderStatus = useAuthStore((state) => state.updateOrderStatus);

  // Local CMS Form States for smooth editing
  const [heroForm, setHeroForm] = useState(heroContent);
  const [announcementForm, setAnnouncementForm] = useState(announcement);
  const [shippingForm, setShippingForm] = useState(shippingConfig);
  const [editorialForm, setEditorialForm] = useState(editorialConfig);
  const [featuredSeriesForm, setFeaturedSeriesForm] = useState(featuredSeriesConfig);
  const [collectionForm, setCollectionForm] = useState(collectionConfig);
  const [genreBentoForm, setGenreBentoForm] = useState(genreBentoConfig);
  const [selectedGenreId, setSelectedGenreId] = useState<string>(genres?.[0]?.id || "action");
  const [genreDrafts, setGenreDrafts] = useState<Record<string, GenreInfo>>({});
  const [currentPinInput, setCurrentPinInput] = useState("");
  const [newPinInput, setNewPinInput] = useState("");
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [newAdminEmailInput, setNewAdminEmailInput] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Cryptographic server-side session guard
  useEffect(() => {
    if (isAdminAuthenticated) {
      fetch("/api/admin/verify-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
        .then((r) => r.json())
        .then((data) => {
          if (!data.valid) {
            logoutAdmin();
          }
        })
        .catch(() => {
          // Keep active during transient network drops
        });
    }
  }, [isAdminAuthenticated, logoutAdmin]);

  useEffect(() => {
    if (shippingConfig) {
      setShippingForm({
        ...shippingConfig,
        governorateRates: {
          ...DEFAULT_GOVERNORATE_RATES,
          ...(shippingConfig.governorateRates || {}),
        },
      });
    }
  }, [shippingConfig]);

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

  // Compile all customer orders from useAuthStore & local storage
  const allOrders = useMemo(() => {
    const list: { order: SavedOrder; customer: UserProfile }[] = [];
    const seenIds = new Set<string>();

    const allUsers = Object.values(users);
    if (currentUser && !allUsers.some((u) => u.id === currentUser.id)) {
      allUsers.push(currentUser);
    }
    allUsers.forEach((u) => {
      (u.orders || []).forEach((o) => {
        if (!seenIds.has(o.id)) {
          seenIds.add(o.id);
          list.push({ order: o, customer: u });
        }
      });
    });

    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("kairo_orders");
        if (raw) {
          const guestOrders: SavedOrder[] = JSON.parse(raw);
          if (Array.isArray(guestOrders)) {
            guestOrders.forEach((o) => {
              if (o && o.id && !seenIds.has(o.id)) {
                seenIds.add(o.id);
                list.push({
                  order: o,
                  customer: {
                    id: `GUEST-${o.id}`,
                    name: o.customerName || "Guest Collector",
                    email: o.customerEmail || "guest@kairo.archive",
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
          }
        }
      } catch (e) {
        console.error(e);
      }
    }

    return list.sort((a, b) => new Date(b.order.date).getTime() - new Date(a.order.date).getTime());
  }, [users, currentUser]);

  // Key performance indicators
  const totalStockUnits = useMemo(() => {
    return volumes.reduce((sum, v) => sum + (v.stock || 0), 0);
  }, [volumes]);

  const lowStockVolumes = useMemo(() => {
    return volumes.filter((v) => (v.stock || 0) <= 5);
  }, [volumes]);

  const totalRevenue = useMemo(() => {
    return allOrders.reduce((sum, item) => sum + (item.order.total || 0), 0);
  }, [allOrders]);

  // Filtered Volumes List
  const filteredVolumes = useMemo(() => {
    return volumes.filter((v) => {
      const matchesSearch =
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.seriesTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.isbn && v.isbn.includes(searchQuery));
      const matchesSeries = seriesFilter === "all" || v.seriesSlug === seriesFilter;
      const matchesFormat = formatFilter === "all" || v.format === formatFilter;
      return matchesSearch && matchesSeries && matchesFormat;
    });
  }, [volumes, searchQuery, seriesFilter, formatFilter]);

  // Prevent hydration mismatch between server render (localStorage empty) and client (persisted session)
  if (!mounted) {
    return (
      <div className="min-h-screen w-full bg-ink flex flex-col items-center justify-center p-6 text-center font-mono select-none">
        <div className="w-12 h-12 mx-auto rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold mb-3 animate-pulse">
          <Shield className="w-5 h-5" />
        </div>
        <div className="text-xs font-bold text-gold tracking-widest uppercase">
          KAIRO ARCHIVE — CURATOR CONSOLE
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
  const handleSaveVolume = (vol: MangaVolume) => {
    if (editingVolume) {
      updateVolume(vol.id, vol);
      showToast(`Updated volume "${vol.title}" successfully.`);
    } else {
      addVolume(vol);
      showToast(`Added new volume "${vol.title}" to catalog.`);
    }
    setEditingVolume(null);
  };

  // Handle Save Series
  const handleSaveSeries = (s: Series) => {
    if (editingSeries) {
      updateSeries(s.slug, s);
      showToast(`Updated series "${s.title}" successfully.`);
    } else {
      addSeries(s);
      showToast(`Created series franchise "${s.title}".`);
    }
    setEditingSeries(null);
  };

  // Handle Export
  const handleExport = () => {
    const jsonStr = exportData();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kairo-archive-backup-${new Date().toISOString().split("T")[0]}.json`;
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
      <header className="h-16 bg-ink-surface border-b border-ink-border px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="font-serif text-gold text-lg font-bold group-hover:scale-105 transition-transform">
              回路
            </span>
            <span className="font-cinzel text-base font-bold text-paper tracking-wider">
              KAIRO ADMIN
            </span>
          </Link>
          <span className="text-[11px] font-mono text-gold bg-gold/10 px-2.5 py-0.5 rounded uppercase tracking-wider border border-gold/30">
            Master Console
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          {currentUser && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-ink/70 border border-gold/30 rounded-sm">
              <div className="w-5 h-5 rounded-full bg-gold/20 text-gold font-bold flex items-center justify-center text-[10px]">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "A"}
              </div>
              <span className="text-paper text-[11px] font-medium">{currentUser.name}</span>
            </div>
          )}

          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 border border-ink-border text-text-muted hover:text-paper hover:border-gold/50 rounded-sm transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Live Store</span>
          </Link>
          <button
            onClick={logoutAdmin}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-ink-elevated hover:bg-vermilion/20 hover:text-vermilion border border-ink-border rounded-sm text-text-muted transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Console</span>
          </button>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 bg-ink-surface/50 border-r border-ink-border p-4 shrink-0 flex flex-row md:flex-col gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-sm text-xs font-mono tracking-wider text-left transition-colors cursor-pointer ${
              activeTab === "overview"
                ? "bg-gold text-ink font-bold shadow-md shadow-gold/10"
                : "text-text-muted hover:text-paper hover:bg-ink-elevated"
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Overview & KPIs</span>
          </button>

          <button
            onClick={() => setActiveTab("volumes")}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-sm text-xs font-mono tracking-wider text-left transition-colors cursor-pointer ${
              activeTab === "volumes"
                ? "bg-gold text-ink font-bold shadow-md shadow-gold/10"
                : "text-text-muted hover:text-paper hover:bg-ink-elevated"
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>Books & Volumes ({volumes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("series")}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-sm text-xs font-mono tracking-wider text-left transition-colors cursor-pointer ${
              activeTab === "series"
                ? "bg-gold text-ink font-bold shadow-md shadow-gold/10"
                : "text-text-muted hover:text-paper hover:bg-ink-elevated"
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>Series Franchises ({series.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("cms")}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-sm text-xs font-mono tracking-wider text-left transition-colors cursor-pointer ${
              activeTab === "cms"
                ? "bg-gold text-ink font-bold shadow-md shadow-gold/10"
                : "text-text-muted hover:text-paper hover:bg-ink-elevated"
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Site Content CMS</span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-sm text-xs font-mono tracking-wider text-left transition-colors cursor-pointer ${
              activeTab === "orders"
                ? "bg-gold text-ink font-bold shadow-md shadow-gold/10"
                : "text-text-muted hover:text-paper hover:bg-ink-elevated"
            }`}
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span>Orders & CRM ({allOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-sm text-xs font-mono tracking-wider text-left transition-colors cursor-pointer ${
              activeTab === "settings"
                ? "bg-gold text-ink font-bold shadow-md shadow-gold/10"
                : "text-text-muted hover:text-paper hover:bg-ink-elevated"
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span>Backup & Settings</span>
          </button>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl">
          {/* ======================================================== */}
          {/* TAB 1: OVERVIEW & KPIS                                   */}
          {/* ======================================================== */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              <div>
                <h1 className="font-cinzel text-2xl font-bold text-paper">Executive Overview</h1>
                <p className="text-xs font-mono text-text-muted mt-1">
                  Live archival inventory metrics, sales performance, and hub alerts.
                </p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
                <div className="p-5 bg-ink-surface border border-ink-border rounded-sm">
                  <div className="flex items-center justify-between text-text-muted mb-2 text-xs">
                    <span>TOTAL VOLUMES</span>
                    <BookOpen className="w-4 h-4 text-gold" />
                  </div>
                  <div className="text-3xl font-extrabold text-paper">{volumes.length}</div>
                  <div className="text-[11px] text-text-muted mt-1">Across {series.length} franchises</div>
                </div>

                <div className="p-5 bg-ink-surface border border-ink-border rounded-sm">
                  <div className="flex items-center justify-between text-text-muted mb-2 text-xs">
                    <span>PHYSICAL STOCK</span>
                    <Package className="w-4 h-4 text-gold" />
                  </div>
                  <div className="text-3xl font-extrabold text-paper">{totalStockUnits}</div>
                  <div className="text-[11px] text-text-muted mt-1">Units logged in 6th of October Hub</div>
                </div>

                <div className="p-5 bg-ink-surface border border-ink-border rounded-sm">
                  <div className="flex items-center justify-between text-text-muted mb-2 text-xs">
                    <span>TOTAL ORDERS</span>
                    <ShoppingBag className="w-4 h-4 text-gold" />
                  </div>
                  <div className="text-3xl font-extrabold text-paper">{allOrders.length}</div>
                  <div className="text-[11px] text-text-muted mt-1">
                    Revenue: <strong className="text-gold">{formatPrice(totalRevenue)}</strong>
                  </div>
                </div>

                <div className="p-5 bg-ink-surface border border-ink-border rounded-sm">
                  <div className="flex items-center justify-between text-text-muted mb-2 text-xs">
                    <span>LOW STOCK ALERTS</span>
                    <AlertTriangle className="w-4 h-4 text-vermilion" />
                  </div>
                  <div className="text-3xl font-extrabold text-vermilion">{lowStockVolumes.length}</div>
                  <div className="text-[11px] text-text-muted mt-1">Volumes with ≤ 5 units left</div>
                </div>
              </div>

              {/* Quick Navigation Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                <button
                  onClick={() => {
                    setEditingVolume(null);
                    setIsVolumeModalOpen(true);
                  }}
                  className="p-5 bg-ink-surface border border-ink-border hover:border-gold/60 rounded-sm text-left transition-colors flex items-center justify-between cursor-pointer group"
                >
                  <div>
                    <span className="text-gold font-bold block mb-1">+ Add New Book</span>
                    <span className="text-text-muted">Insert a new volume into the catalog</span>
                  </div>
                  <Plus className="w-5 h-5 text-gold group-hover:scale-110 transition-transform" />
                </button>

                <button
                  onClick={() => setActiveTab("cms")}
                  className="p-5 bg-ink-surface border border-ink-border hover:border-gold/60 rounded-sm text-left transition-colors flex items-center justify-between cursor-pointer group"
                >
                  <div>
                    <span className="text-gold font-bold block mb-1">Edit Site Copy & Hero</span>
                    <span className="text-text-muted">Modify headlines, announcements & shipping text</span>
                  </div>
                  <FileText className="w-5 h-5 text-gold group-hover:scale-110 transition-transform" />
                </button>

                <button
                  onClick={handleExport}
                  className="p-5 bg-ink-surface border border-ink-border hover:border-gold/60 rounded-sm text-left transition-colors flex items-center justify-between cursor-pointer group"
                >
                  <div>
                    <span className="text-gold font-bold block mb-1">Export JSON Backup</span>
                    <span className="text-text-muted">Download complete store snapshot</span>
                  </div>
                  <Download className="w-5 h-5 text-gold group-hover:scale-110 transition-transform" />
                </button>
              </div>

              {/* Low Stock Table */}
              {lowStockVolumes.length > 0 && (
                <div className="space-y-3 font-mono">
                  <h3 className="text-xs uppercase tracking-wider text-vermilion font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Inventory Low Stock Alerts</span>
                  </h3>
                  <div className="border border-ink-border rounded-sm overflow-hidden bg-ink-surface">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-ink text-text-muted text-[10px] uppercase border-b border-ink-border">
                        <tr>
                          <th className="px-4 py-3">Book Title</th>
                          <th className="px-4 py-3">Series</th>
                          <th className="px-4 py-3">Format</th>
                          <th className="px-4 py-3 text-right">Price</th>
                          <th className="px-4 py-3 text-center">Remaining Stock</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-border/50">
                        {lowStockVolumes.slice(0, 5).map((vol) => (
                          <tr key={vol.id} className="hover:bg-ink-elevated/40">
                            <td className="px-4 py-3 font-bold text-paper">{vol.title}</td>
                            <td className="px-4 py-3 text-text-muted">{vol.seriesTitle}</td>
                            <td className="px-4 py-3 text-text-muted">{vol.format}</td>
                            <td className="px-4 py-3 text-right text-gold font-bold">{formatPrice(vol.price)}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2 py-0.5 bg-vermilion/20 text-vermilion font-bold rounded-xs">
                                {vol.stock} units
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => {
                                  setEditingVolume(vol);
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
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-cinzel text-2xl font-bold text-paper">Books & Volumes Catalog</h1>
                  <p className="text-xs font-mono text-text-muted mt-1">
                    Manage prices, stock levels, editorial descriptions, and preview reader assets.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingVolume(null);
                    setIsVolumeModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gold hover:bg-gold-muted text-ink font-mono text-xs font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer shadow-lg shadow-gold/15 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Volume</span>
                </button>
              </div>

              {/* Filters & Search Toolbar */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 font-mono text-xs">
                <div className="md:col-span-6 relative">
                  <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, series, author, or ISBN..."
                    className="w-full bg-ink-surface border border-ink-border pl-9 pr-3 py-2 text-paper rounded-sm outline-none focus:border-gold"
                  />
                </div>

                <div className="md:col-span-3">
                  <CustomSelect
                    fullWidth
                    value={seriesFilter}
                    onChange={setSeriesFilter}
                    options={[
                      { value: "all", label: "All Series Franchises" },
                      ...series.map((s) => ({ value: s.slug, label: s.title })),
                    ]}
                    buttonClassName="bg-ink-surface border-ink-border py-2 px-3 text-xs"
                  />
                </div>

                <div className="md:col-span-3">
                  <CustomSelect
                    fullWidth
                    value={formatFilter}
                    onChange={setFormatFilter}
                    options={[
                      { value: "all", label: "All Formats" },
                      { value: "Manga", label: "Manga" },
                      { value: "Light Novel", label: "Light Novel" },
                      { value: "Box Set", label: "Box Set" },
                      { value: "Deluxe Edition", label: "Deluxe Edition" },
                    ]}
                    buttonClassName="bg-ink-surface border-ink-border py-2 px-3 text-xs"
                  />
                </div>
              </div>

              {/* Volumes Table */}
              <div className="border border-ink-border rounded-sm overflow-x-auto bg-ink-surface font-mono">
                <table className="w-full text-left text-xs min-w-[800px]">
                  <thead className="bg-ink text-text-muted text-[10px] uppercase border-b border-ink-border">
                    <tr>
                      <th className="px-4 py-3">Book Title & Vol</th>
                      <th className="px-4 py-3">Series</th>
                      <th className="px-4 py-3">Format</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-center">Stock</th>
                      <th className="px-4 py-3 text-center">Merchandising</th>
                      <th className="px-4 py-3 text-right">Actions</th>
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
                      filteredVolumes.map((vol) => (
                        <tr key={vol.id} className="hover:bg-ink-elevated/40 transition-colors">
                          <td className="px-4 py-3 flex items-center gap-3">
                            <div className="w-9 h-13 border border-ink-border overflow-hidden rounded-xs shrink-0 bg-ink">
                              <img src={vol.coverImage} alt={vol.title} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <div className="text-paper font-bold flex items-center gap-1.5">
                                <span>{vol.title}</span>
                                <span className="text-[10px] text-gold font-normal">Vol. {vol.volumeNumber}</span>
                              </div>
                              <div className="text-[11px] text-text-muted">{vol.japaneseTitle || vol.author}</div>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-text-muted">{vol.seriesTitle}</td>

                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-ink border border-ink-border rounded-xs text-[10px]">
                              {vol.format}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right font-bold text-gold">
                            {formatPrice(vol.price)}
                            {vol.originalPrice && (
                              <span className="block text-[10px] text-text-muted line-through font-normal">
                                {formatPrice(vol.originalPrice)}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-xs font-bold text-[11px] ${
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
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete "${vol.title}"?`)) {
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
                  className="flex items-center gap-2 px-4 py-2.5 bg-gold hover:bg-gold-muted text-ink font-mono text-xs font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer shadow-lg shadow-gold/15 shrink-0"
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
                            onClick={() => {
                              if (confirm(`Delete series "${s.title}" and its catalog volumes?`)) {
                                deleteSeries(s.slug);
                                showToast(`Deleted series "${s.title}"`);
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
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-cinzel text-2xl font-bold text-paper">Site Content & Editorial CMS</h1>
                  <p className="text-xs text-text-muted mt-1">
                    Live modification of all website text, headlines, promo banners, and shipping messages.
                  </p>
                </div>
              </div>

              {/* 1. HERO SECTION EDITOR */}
              <div className="p-6 bg-ink-surface border border-ink-border rounded-sm space-y-4">
                <div className="flex items-center justify-between border-b border-ink-border/50 pb-2">
                  <h2 className="text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>01. Hero Section Content</span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-text-muted mb-1">Badge Callout Text</label>
                    <input
                      type="text"
                      value={heroForm.badgeText}
                      onChange={(e) => setHeroForm({ ...heroForm, badgeText: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">Featured Spotlight Manga</label>
                    <CustomSelect
                      fullWidth
                      value={heroForm.featuredVolumeId}
                      onChange={(val) => setHeroForm({ ...heroForm, featuredVolumeId: val })}
                      options={volumes.map((v) => ({
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
                      <label className="block text-gold mb-1 text-[11px]">Golden Italic Highlight</label>
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
                    <label className="block text-text-muted mb-1">Subheadline & Narrative</label>
                    <textarea
                      rows={2}
                      value={heroForm.subheadline}
                      onChange={(e) => setHeroForm({ ...heroForm, subheadline: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">Primary CTA Button Label</label>
                    <input
                      type="text"
                      value={heroForm.primaryCtaText}
                      onChange={(e) => setHeroForm({ ...heroForm, primaryCtaText: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">Primary CTA Destination Link</label>
                    <input
                      type="text"
                      value={heroForm.primaryCtaLink}
                      onChange={(e) => setHeroForm({ ...heroForm, primaryCtaLink: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">Secondary CTA Button Label</label>
                    <input
                      type="text"
                      value={heroForm.secondaryCtaText}
                      onChange={(e) => setHeroForm({ ...heroForm, secondaryCtaText: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">Secondary CTA Destination Link</label>
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
                  <button
                    type="button"
                    onClick={() => {
                      updateHeroContent(heroForm);
                      showToast("Hero section content updated in live storefront.");
                    }}
                    className="flex items-center gap-1.5 px-5 py-2 bg-gold hover:bg-gold-muted text-ink font-bold text-xs uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Hero Changes</span>
                  </button>
                </div>
              </div>

              {/* 2. GLOBAL PROMO & ANNOUNCEMENT BAR */}
              <div className="p-6 bg-ink-surface border border-ink-border rounded-sm space-y-4">
                <div className="flex items-center justify-between border-b border-ink-border/50 pb-2">
                  <h2 className="text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>02. Global Welcome Offer & Top Announcement Bar</span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="md:col-span-3">
                    <label className="flex items-center gap-2 cursor-pointer text-paper">
                      <input
                        type="checkbox"
                        checked={announcementForm.enabled}
                        onChange={(e) => setAnnouncementForm({ ...announcementForm, enabled: e.target.checked })}
                        className="w-4 h-4 accent-gold cursor-pointer"
                      />
                      <span>Enable Global Announcement Bar on Live Website</span>
                    </label>
                  </div>

                  <div className="md:col-span-3 flex flex-col justify-end">
                    <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">Banner Announcement Text</label>
                    <input
                      type="text"
                      value={announcementForm.text}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, text: e.target.value })}
                      className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-sm font-sans"
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">Promotional Voucher Code</label>
                    <input
                      type="text"
                      value={announcementForm.voucherCode}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, voucherCode: e.target.value.toUpperCase() })}
                      className="w-full h-10 bg-ink border border-ink-border text-gold font-bold px-3 rounded-sm focus:border-gold outline-none text-sm font-sans"
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">Discount Percentage (%)</label>
                    <CustomNumberInput
                      min={1}
                      max={90}
                      step={1}
                      suffix="%"
                      className="h-10"
                      value={announcementForm.discountPercent}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, discountPercent: parseInt(e.target.value, 10) || 20 })}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      updateAnnouncement(announcementForm);
                      showToast("Announcement and voucher settings updated.");
                    }}
                    className="flex items-center gap-1.5 px-5 py-2 bg-gold hover:bg-gold-muted text-ink font-bold text-xs uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Announcement Changes</span>
                  </button>
                </div>
              </div>

              {/* 3. LOGISTICS & DISPATCH HUB SETTINGS */}
              <div className="p-6 bg-ink-surface border border-ink-border rounded-sm space-y-6">
                <div className="flex items-center justify-between border-b border-ink-border/50 pb-2">
                  <h2 className="text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    <span>03. Logistics, Dispatch Hub & Governorate Shipping Rates</span>
                  </h2>
                </div>

                {/* Fulfillment Hub Core Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-text-muted mb-1">Primary Fulfillment Hub Name</label>
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
                      Product Page Dispatch Badge (e.g. Dispatched from 6th of October)
                    </label>
                    <input
                      type="text"
                      value={shippingForm.dispatchBadgeText}
                      onChange={(e) => setShippingForm({ ...shippingForm, dispatchBadgeText: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">Authenticity Guarantee Badge Text</label>
                    <input
                      type="text"
                      value={shippingForm.guaranteeBadgeText}
                      onChange={(e) => setShippingForm({ ...shippingForm, guaranteeBadgeText: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>
                </div>

                {/* Governorate Shipping Rates Table */}
                <div className="pt-4 border-t border-ink-border/60 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-paper uppercase tracking-wider">
                        Governorate Shipping Rates (EGP)
                      </h3>
                      <p className="text-[11px] text-text-muted">
                        Configure customized doorstep delivery prices for each Egyptian governorate. These rates automatically compute at checkout.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShippingForm((prev) => ({
                          ...prev,
                          governorateRates: { ...DEFAULT_GOVERNORATE_RATES },
                        }));
                        showToast("Reset all governorates to baseline factory rates.");
                      }}
                      className="self-start sm:self-auto text-[10px] font-mono text-gold hover:text-paper hover:underline uppercase tracking-wider cursor-pointer"
                    >
                      Reset to Baseline Rates
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                    {EGYPT_GOVERNORATES.map((gov) => {
                      const currentRate =
                        shippingForm.governorateRates?.[gov.value] ??
                        DEFAULT_GOVERNORATE_RATES[gov.value] ??
                        gov.defaultRate;
                      return (
                        <div
                          key={gov.value}
                          className="p-3 bg-ink border border-ink-border rounded-xs flex items-center justify-between gap-3 hover:border-ink-border/90 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-xs font-bold text-paper truncate">{gov.label}</span>
                              {gov.badge && (
                                <span className="text-[8px] font-mono px-1.5 py-0.2 bg-gold/15 text-gold border border-gold/30 rounded-xs uppercase">
                                  {gov.badge}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-text-muted">
                              Default: {gov.defaultRate} EGP
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max="1000"
                              step="5"
                              value={currentRate}
                              onChange={(e) => handleGovRateChange(gov.value, parseFloat(e.target.value))}
                              className="w-20 bg-ink-surface border border-ink-border text-gold font-mono font-bold text-right px-2.5 py-1.5 rounded-xs focus:border-gold outline-none text-xs"
                            />
                            <span className="text-[10px] font-mono text-text-muted">EGP</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-ink-border/50">
                  <button
                    type="button"
                    onClick={() => {
                      updateShippingConfig(shippingForm);
                      showToast("Logistics and governorate shipping rates saved successfully.");
                    }}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-gold hover:bg-gold-muted text-ink font-bold text-xs uppercase tracking-wider rounded-sm transition-colors cursor-pointer shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Logistics & Shipping Rates</span>
                  </button>
                </div>
              </div>

              {/* 4. POLICIES & EDITORIAL TEXT */}
              <div className="p-6 bg-ink-surface border border-ink-border rounded-sm space-y-4">
                <div className="flex items-center justify-between border-b border-ink-border/50 pb-2">
                  <h2 className="text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>04. Editorial Policies & Guarantees</span>
                  </h2>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-text-muted mb-1">Authenticity Guarantee Modal Statement</label>
                    <textarea
                      rows={2}
                      value={editorialForm.authenticityGuaranteeText}
                      onChange={(e) => setEditorialForm({ ...editorialForm, authenticityGuaranteeText: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">Shipping & Packaging Protocol</label>
                    <textarea
                      rows={2}
                      value={editorialForm.shippingPolicyText}
                      onChange={(e) => setEditorialForm({ ...editorialForm, shippingPolicyText: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-muted mb-1">14-Day Archival Return Policy Statement</label>
                    <textarea
                      rows={2}
                      value={editorialForm.returnPolicyText}
                      onChange={(e) => setEditorialForm({ ...editorialForm, returnPolicyText: e.target.value })}
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      updateEditorialConfig(editorialForm);
                      showToast("Editorial policies updated.");
                    }}
                    className="flex items-center gap-1.5 px-5 py-2 bg-gold hover:bg-gold-muted text-ink font-bold text-xs uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Policy Statements</span>
                  </button>
                </div>
              </div>

              {/* 5. FEATURED SERIES SHOWCASE */}
              <div className="p-6 bg-ink-surface border border-ink-border rounded-sm space-y-5">
                <div className="flex items-center justify-between border-b border-ink-border/50 pb-3">
                  <h2 className="text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Flame className="w-4 h-4 text-vermilion" />
                    <span>05. Featured Series Showcase (Home Spotlight)</span>
                  </h2>
                  <span className="text-[10px] text-text-muted">
                    Controls the prominent featured series banner on the storefront.
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  {/* Select Series */}
                  <div className="md:col-span-2 flex flex-col justify-end">
                    <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                      Select Featured Series Franchise
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
                      Custom Title Override (Leave blank to use series title)
                    </label>
                    <input
                      type="text"
                      value={featuredSeriesForm.customTitle || ""}
                      onChange={(e) => setFeaturedSeriesForm({ ...featuredSeriesForm, customTitle: e.target.value })}
                      placeholder="Optional custom title override"
                      className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                    />
                  </div>

                  {/* CTA Text */}
                  <div className="flex flex-col justify-end">
                    <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                      CTA Button Label
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
                      CTA Button Destination Link
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
                  <div className="md:col-span-2 flex flex-col justify-end">
                    <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                      Custom High-Resolution Artwork URL (Optional — overrides default cover)
                    </label>
                    <input
                      type="text"
                      value={featuredSeriesForm.customImage || ""}
                      onChange={(e) => setFeaturedSeriesForm({ ...featuredSeriesForm, customImage: e.target.value })}
                      placeholder="https://... (Leave blank to use default franchise artwork)"
                      className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                    />
                  </div>

                  {/* Custom Narrative Description */}
                  <div className="md:col-span-2">
                    <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                      Curator Narrative / Description (Optional — overrides default synopsis)
                    </label>
                    <textarea
                      rows={3}
                      value={featuredSeriesForm.customDescription || ""}
                      onChange={(e) => setFeaturedSeriesForm({ ...featuredSeriesForm, customDescription: e.target.value })}
                      placeholder="Leave blank to use the series default synopsis..."
                      className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      updateFeaturedSeriesConfig(featuredSeriesForm);
                      showToast("Featured Series showcase settings saved live.");
                    }}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-gold hover:bg-gold-muted text-ink font-bold text-xs uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Featured Series</span>
                  </button>
                </div>
              </div>

              {/* 6. THE COLLECTION 3D BOXSET */}
              <div className="p-6 bg-ink-surface border border-ink-border rounded-sm space-y-5">
                <div className="flex items-center justify-between border-b border-ink-border/50 pb-3">
                  <h2 className="text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-gold" />
                    <span>06. The Collection 3D Boxset Showcase</span>
                  </h2>
                  <span className="text-[10px] text-text-muted">
                    Controls the 3D slipcase scroll animation, headline, bundle price, and 3 featured volumes.
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
                  {/* Headline */}
                  <div className="flex flex-col justify-end">
                    <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                      Section Headline
                    </label>
                    <input
                      type="text"
                      value={collectionForm.headline}
                      onChange={(e) => setCollectionForm({ ...collectionForm, headline: e.target.value })}
                      placeholder="THE COLLECTION"
                      className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                    />
                  </div>

                  {/* Metadata Badge Text */}
                  <div className="flex flex-col justify-end">
                    <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                      Metadata Badge Text
                    </label>
                    <input
                      type="text"
                      value={collectionForm.badgeText}
                      onChange={(e) => setCollectionForm({ ...collectionForm, badgeText: e.target.value })}
                      placeholder="COMPLETE ARCHIVE • VOL. 01–03"
                      className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                    />
                  </div>

                  {/* Bundle Price in EGP */}
                  <div className="flex flex-col justify-end">
                    <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                      Boxset Bundle Price (EGP)
                    </label>
                    <CustomNumberInput
                      min={1}
                      max={100000}
                      step="any"
                      prefix="EGP "
                      className="h-10"
                      value={collectionForm.price}
                      onChange={(e) => setCollectionForm({ ...collectionForm, price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  {/* Volume 1 */}
                  <div className="flex flex-col justify-end">
                    <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                      Volume 01 (Left Wing)
                    </label>
                    <CustomSelect
                      fullWidth
                      value={collectionForm.volumeId1}
                      onChange={(val) => setCollectionForm({ ...collectionForm, volumeId1: val })}
                      options={volumes.map((v) => ({
                        value: v.id,
                        label: `${v.seriesTitle} - Vol. ${v.volumeNumber} (${v.title})`,
                      }))}
                      buttonClassName="h-10 bg-ink border-ink-border px-3 text-xs"
                    />
                  </div>

                  {/* Volume 2 */}
                  <div className="flex flex-col justify-end">
                    <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                      Volume 02 (Center Hero)
                    </label>
                    <CustomSelect
                      fullWidth
                      value={collectionForm.volumeId2}
                      onChange={(val) => setCollectionForm({ ...collectionForm, volumeId2: val })}
                      options={volumes.map((v) => ({
                        value: v.id,
                        label: `${v.seriesTitle} - Vol. ${v.volumeNumber} (${v.title})`,
                      }))}
                      buttonClassName="h-10 bg-ink border-ink-border px-3 text-xs"
                    />
                  </div>

                  {/* Volume 3 */}
                  <div className="flex flex-col justify-end">
                    <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                      Volume 03 (Right Wing)
                    </label>
                    <CustomSelect
                      fullWidth
                      value={collectionForm.volumeId3}
                      onChange={(val) => setCollectionForm({ ...collectionForm, volumeId3: val })}
                      options={volumes.map((v) => ({
                        value: v.id,
                        label: `${v.seriesTitle} - Vol. ${v.volumeNumber} (${v.title})`,
                      }))}
                      buttonClassName="h-10 bg-ink border-ink-border px-3 text-xs"
                    />
                  </div>

                  {/* Primary CTA */}
                  <div className="flex flex-col justify-end">
                    <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                      Primary CTA Button Label
                    </label>
                    <input
                      type="text"
                      value={collectionForm.primaryCtaText}
                      onChange={(e) => setCollectionForm({ ...collectionForm, primaryCtaText: e.target.value })}
                      placeholder="ADD SET TO CART"
                      className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                    />
                  </div>

                  {/* Secondary CTA Text */}
                  <div className="flex flex-col justify-end">
                    <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                      Secondary CTA Button Label
                    </label>
                    <input
                      type="text"
                      value={collectionForm.secondaryCtaText}
                      onChange={(e) => setCollectionForm({ ...collectionForm, secondaryCtaText: e.target.value })}
                      placeholder="DISCOVER ALL BOXSETS"
                      className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                    />
                  </div>

                  {/* Secondary CTA Link */}
                  <div className="flex flex-col justify-end">
                    <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                      Secondary CTA Destination Link
                    </label>
                    <input
                      type="text"
                      value={collectionForm.secondaryCtaLink}
                      onChange={(e) => setCollectionForm({ ...collectionForm, secondaryCtaLink: e.target.value })}
                      placeholder="/manga?format=Box+Set"
                      className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      updateCollectionConfig(collectionForm);
                      showToast("The Collection 3D showcase settings saved live.");
                    }}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-gold hover:bg-gold-muted text-ink font-bold text-xs uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Boxset Settings</span>
                  </button>
                </div>
              </div>

              {/* 7. EXPLORE YOUR GENRE BENTO GRID */}
              <div className="p-6 bg-ink-surface border border-ink-border rounded-sm space-y-6">
                <div className="flex items-center justify-between border-b border-ink-border/50 pb-3">
                  <h2 className="text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-gold" />
                    <span>07. Explore Your Genre (Category Bento Grid)</span>
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
                    <button
                      type="button"
                      onClick={() => {
                        updateGenreBentoConfig(genreBentoForm);
                        showToast("Genre section header updated live.");
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-ink-elevated hover:bg-gold hover:text-ink text-paper font-bold text-xs uppercase tracking-wider rounded-sm transition-colors border border-ink-border cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Header Copy</span>
                    </button>
                  </div>
                </div>

                {/* Individual Genre Card Editor */}
                <div className="space-y-4 font-mono text-xs pt-4 border-t border-ink-border/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-[11px] uppercase tracking-wider text-paper font-bold">
                      B. Individual Genre Cards ({genres.length} Categories)
                    </div>
                    <span className="text-[10px] text-text-muted">
                      Select a genre below to customize its artwork, Kanji, and descriptions.
                    </span>
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
                        <div className="md:col-span-2 lg:col-span-3 flex flex-col justify-end">
                          <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">
                            Card Background Cover Image URL
                          </label>
                          <input
                            type="text"
                            value={currentGenre.coverImage}
                            onChange={(e) => updateCurrentGenreDraft({ coverImage: e.target.value })}
                            placeholder="https://images.unsplash.com/..."
                            className="w-full h-10 bg-ink-surface border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
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

                        <button
                          type="button"
                          onClick={() => {
                            updateGenre(currentGenre.id, currentGenre);
                            showToast(`Genre "${currentGenre.name}" updated successfully.`);
                          }}
                          className="flex items-center gap-1.5 px-5 py-2.5 bg-gold hover:bg-gold-muted text-ink font-bold text-xs uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save {currentGenre.name}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: ORDERS & CUSTOMER CRM                             */}
          {/* ======================================================== */}
          {activeTab === "orders" && (
            <div className="space-y-6 font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-cinzel text-2xl font-bold text-paper">Orders & Patron CRM</h1>
                  <p className="text-xs text-text-muted mt-1">
                    Live customer checkout orders, fulfillment state, and delivery tracking.
                  </p>
                </div>
                <div className="text-xs text-gold">
                  Total Orders: <strong>{allOrders.length}</strong>
                </div>
              </div>

              {/* Orders Table */}
              <div className="border border-ink-border rounded-sm overflow-x-auto bg-ink-surface">
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
                    {allOrders.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-text-muted">
                          No orders logged yet. Orders placed at checkout will appear here in real-time.
                        </td>
                      </tr>
                    ) : (
                      allOrders.map(({ order, customer }) => (
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
                                className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded-xs w-fit ${
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
                                  : order.status === "Pending Payment"
                                  ? "bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse"
                                  : "bg-ink border-ink-border text-paper"
                              }`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setSelectedCustomer(customer);
                                setIsOrderModalOpen(true);
                              }}
                              className="text-gold hover:underline cursor-pointer font-bold"
                            >
                              Manage Order
                            </button>
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

              {/* 1. Admin PIN */}
              <div className="p-6 bg-ink-surface border border-ink-border rounded-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-gold" />
                    <span>Master Curator PIN</span>
                  </h2>
                  <span className="text-[10px] font-mono text-gold/80 px-2 py-0.5 bg-gold/10 border border-gold/20 rounded-xs">
                    SHA-256 Salted Digest
                  </span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Your Security PIN is protected with server-side salted cryptography and brute-force lockout. The plain PIN is never stored or exposed in your browser storage.
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <input
                    type="password"
                    maxLength={8}
                    value={currentPinInput}
                    onChange={(e) => setCurrentPinInput(e.target.value)}
                    placeholder="Current PIN"
                    className="w-full sm:w-44 bg-ink border border-ink-border text-paper px-3 py-2 text-xs rounded-sm focus:border-gold outline-none font-mono"
                  />
                  <input
                    type="password"
                    maxLength={8}
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    placeholder="New 4-8 digit PIN"
                    className="w-full sm:w-44 bg-ink border border-ink-border text-paper px-3 py-2 text-xs rounded-sm focus:border-gold outline-none font-mono"
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
                      if (cleanNew.length < 4) {
                        showToast("New PIN must be at least 4 digits.");
                        return;
                      }
                      setIsUpdatingPin(true);
                      const res = await changeAdminPinWithServer(cleanCurrent, cleanNew);
                      setIsUpdatingPin(false);
                      if (res.success) {
                        if (res.newPinHash) updateAdminPinHash(res.newPinHash);
                        updateAdminPin(cleanNew);
                        setCurrentPinInput("");
                        setNewPinInput("");
                        showToast("Security PIN updated successfully across server authority.");
                      } else {
                        showToast(res.message || "Failed to update Security PIN.");
                      }
                    }}
                    className="px-4 py-2 bg-ink-elevated hover:bg-gold hover:text-ink text-paper text-xs uppercase tracking-wider rounded-sm transition-colors border border-ink-border cursor-pointer font-bold shrink-0 disabled:opacity-50"
                  >
                    {isUpdatingPin ? "Updating..." : "Update Security PIN"}
                  </button>
                </div>
              </div>

              {/* 2. Authorized Admin Accounts */}
              <div className="p-6 bg-ink-surface border border-ink-border rounded-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Authorized Admin Accounts</span>
                  </h2>
                  <span className="text-[10px] text-text-muted">
                    {adminEmails.length} Authorized {adminEmails.length === 1 ? "Curator" : "Curators"}
                  </span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Only authenticated accounts listed below have authorization to access the curator console and execute administrative changes.
                </p>

                {/* Email list */}
                <div className="space-y-2 pt-1">
                  {adminEmails.map((email) => {
                    const isSelf = currentUser?.email.toLowerCase() === email.toLowerCase();
                    return (
                      <div
                        key={email}
                        className="flex items-center justify-between px-3.5 py-2.5 bg-ink border border-ink-border rounded-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <UserCheck className="w-3.5 h-3.5 text-gold shrink-0" />
                          <span className="text-xs text-paper font-mono truncate">{email}</span>
                          {isSelf && (
                            <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider bg-gold/15 text-gold border border-gold/30 rounded-xs shrink-0">
                              Current Session
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (adminEmails.length <= 1) {
                              showToast("Cannot remove the only remaining admin account.");
                              return;
                            }
                            removeAdminEmail(email);
                            showToast(`Removed ${email} from authorized curators.`);
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
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
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
                        addAdminEmail(val);
                        setNewAdminEmailInput("");
                        showToast(`Granted admin access to ${val}`);
                      }
                    }}
                    placeholder="e.g. curator@kairo.archive"
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
                      addAdminEmail(val);
                      setNewAdminEmailInput("");
                      showToast(`Granted admin access to ${val}`);
                    }}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-ink-elevated hover:bg-gold hover:text-ink text-paper text-xs uppercase tracking-wider rounded-sm transition-colors border border-ink-border cursor-pointer shrink-0 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Authorize Email</span>
                  </button>
                </div>
              </div>

              {/* 3. Data Backup & Restore */}
              <div className="p-6 bg-ink-surface border border-ink-border rounded-sm space-y-4">
                <h2 className="text-gold text-xs font-bold uppercase tracking-wider">
                  Data Backup & Restore (JSON)
                </h2>
                <p className="text-xs text-text-muted">
                  Download a full backup of all your books, series, prices, and website text, or restore a previously saved JSON snapshot.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gold hover:bg-gold-muted text-ink font-bold text-xs uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download JSON Backup</span>
                  </button>

                  <label className="flex items-center gap-2 px-4 py-2.5 bg-ink-elevated hover:bg-ink border border-ink-border text-paper font-bold text-xs uppercase tracking-wider rounded-sm transition-colors cursor-pointer">
                    <Upload className="w-4 h-4 text-gold" />
                    <span>Restore From File</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* 4. Factory Reset */}
              <div className="p-6 bg-ink-surface border border-vermilion/30 rounded-sm space-y-4">
                <h2 className="text-vermilion text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Factory Reset</span>
                </h2>
                <p className="text-xs text-text-muted">
                  This will restore all books, series, and site copy back to the initial factory codebase defaults.
                </p>
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to restore factory default data? Any custom books or edits will be reset.")) {
                      resetToDefaults();
                      setHeroForm(heroContent);
                      setAnnouncementForm(announcement);
                      setShippingForm(shippingConfig);
                      setEditorialForm(editorialConfig);
                      setFeaturedSeriesForm(featuredSeriesConfig);
                      setCollectionForm(collectionConfig);
                      setGenreBentoForm(genreBentoConfig);
                      setGenreDrafts({});
                      showToast("All store data reset to factory defaults.");
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-vermilion/15 hover:bg-vermilion text-vermilion hover:text-white font-bold text-xs uppercase tracking-wider rounded-sm transition-colors cursor-pointer border border-vermilion/40"
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
        onUpdateOrder={(orderId, updates) => {
          updateOrderStatus(orderId, updates);
          if (selectedOrder && selectedOrder.id === orderId) {
            setSelectedOrder({ ...selectedOrder, ...updates });
          }
          showToast(`Order #${orderId} updated successfully.`);
        }}
        onUpdateStatus={(orderId, newStatus) => {
          updateOrderStatus(orderId, { status: newStatus });
          if (selectedOrder && selectedOrder.id === orderId) {
            setSelectedOrder({ ...selectedOrder, status: newStatus });
          }
          showToast(`Order #${orderId} status set to "${newStatus}"`);
        }}
      />
    </div>
  );
}
