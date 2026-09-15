"use client";

import React, { useState, useMemo } from "react";
import { X, Save, Plus, Check, Upload, Loader2, Timer, Package, AlertTriangle } from "lucide-react";
import { MangaVolume, Series, GenreInfo, type ProductType } from "@/data/manga";
import { isBook, isMerch } from "@/lib/variants";
import { MerchFormModal } from "@/components/admin/MerchFormModal";
import { priceVolume } from "@/lib/pricing";
import { describeBundle, findBundleCycle, indexById, type VolumeLike } from "@/lib/bundle";
import { CustomSelect } from "@/components/CustomSelect";
import { CustomNumberInput } from "@/components/ui/CustomNumberInput";
import { ImageUploadInput } from "@/components/ImageUploadInput";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";
import { useStorefrontStore, DEFAULT_FORMATS } from "@/store/useStorefrontStore";
import { PLACEHOLDER_BANNER, PLACEHOLDER_COVER } from "@/config/mediaDefaults";
import { useNow } from "@/hooks/useNow";
import { useTranslation } from "@/hooks/useTranslation";

interface VolumeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (volume: MangaVolume) => void;
  initialVolume?: MangaVolume | null;
  seriesList: Series[];
}

/** ISO instant -> the value a datetime-local input wants, in local time. */
function toLocalInputValue(iso: string | undefined): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  return new Date(ms - new Date(ms).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

/** The reverse: a local wall-clock value -> a stored ISO instant. */
function fromLocalInputValue(value: string): string | undefined {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined;
}

function VolumeFormDialog({
  initialVolume,
  seriesList,
  onClose,
  onSave,
}: {
  initialVolume?: MangaVolume | null;
  seriesList: Series[];
  onClose: () => void;
  onSave: (volume: MangaVolume) => void;
}) {
  const { locale } = useTranslation();
  const isArabic = locale === "ar";
  useModalScrollLock(true);

  const storeGenres = useStorefrontStore((s) => s.genres);
  const addGenre = useStorefrontStore((s) => s.addGenre);
  const storeSeries = useStorefrontStore((s) => s.series);
  const addSeries = useStorefrontStore((s) => s.addSeries);
  const storeFormats = useStorefrontStore((s) => s.formats);
  const addFormat = useStorefrontStore((s) => s.addFormat);

  const effectiveSeriesList = storeSeries && storeSeries.length > 0 ? storeSeries : seriesList;
  const defaultSeries = effectiveSeriesList[0] || { slug: "jujutsu-kaisen", title: "Jujutsu Kaisen", author: "", artist: "" };

  const [formData, setFormData] = useState<Partial<MangaVolume>>(() => {
    if (initialVolume) return initialVolume;
    return {
      id: `vol-${Date.now()}`,
      volumeNumber: 1,
      title: "",
      seriesSlug: defaultSeries.slug,
      seriesTitle: defaultSeries.title,
      japaneseTitle: "",
      author: defaultSeries.author || "",
      artist: defaultSeries.artist || "",
      price: 0,
      originalPrice: undefined,
      rating: 4.9,
      reviewCount: 50,
      coverImage: PLACEHOLDER_COVER,
      synopsis: "",
      synopsisAr: "",
      format: "Manga",
      pages: 192,
      publishDate: new Date().toISOString().split("T")[0],
      isbn: "978-1974718827",
      genre: ["Action"],
      stock: 20,
      isTrending: false,
      isNewRelease: true,
      isFeatured: false,
      comingSoon: false,
      previewPages: [],
    };
  });

  const effectiveFormats = useMemo(() => {
    const base = storeFormats && storeFormats.length > 0 ? storeFormats : DEFAULT_FORMATS;
    if (formData.format && !base.includes(formData.format)) {
      return [...base, formData.format];
    }
    return base;
  }, [storeFormats, formData.format]);

  // Series quick creator
  const [showAddSeries, setShowAddSeries] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [newSeriesTitle, setNewSeriesTitle] = useState("");
  const [newSeriesAuthor, setNewSeriesAuthor] = useState("");

  const handleQuickAddSeries = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newSeriesTitle.trim()) return;
    const slug = newSeriesTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const createdSeries: Series = {
      slug,
      title: newSeriesTitle.trim(),
      japaneseTitle: newSeriesTitle.trim(),
      romajiTitle: newSeriesTitle.trim(),
      author: newSeriesAuthor.trim() || formData.author || "Unknown",
      artist: formData.artist || "Unknown",
      genres: selectedGenres.length > 0 ? selectedGenres : ["Action"],
      description: `Curated narrative arc for ${newSeriesTitle.trim()}.`,
      quote: "Canonical series collection.",
      bannerImage: PLACEHOLDER_BANNER,
      featuredImage: PLACEHOLDER_COVER,
      status: "Ongoing",
      totalVolumes: 1,
      volumes: [],
    };
    addSeries(createdSeries);
    setFormData((prev) => ({
      ...prev,
      seriesSlug: slug,
      seriesTitle: createdSeries.title,
      author: prev.author || createdSeries.author,
    }));
    setNewSeriesTitle("");
    setNewSeriesAuthor("");
    setShowAddSeries(false);
  };

  // Format quick creator
  const [showAddFormat, setShowAddFormat] = useState(false);
  const [newFormatName, setNewFormatName] = useState("");

  const handleQuickAddFormat = (e: React.MouseEvent) => {
    e.preventDefault();
    const trimmed = newFormatName.trim();
    if (!trimmed) return;
    addFormat(trimmed);
    setFormData((prev) => ({ ...prev, format: trimmed as MangaVolume["format"] }));
    setNewFormatName("");
    setShowAddFormat(false);
  };

  // Genre selection & quick creator
  const [selectedGenres, setSelectedGenres] = useState<string[]>(() => {
    if (initialVolume?.genre && initialVolume.genre.length > 0) {
      return initialVolume.genre;
    }
    return ["Action"];
  });

  const [showAddGenre, setShowAddGenre] = useState(false);
  const [newGenreName, setNewGenreName] = useState("");
  const [newGenreKanji, setNewGenreKanji] = useState("");

  const toggleGenreSelection = (genreName: string) => {
    setSelectedGenres((prev) => {
      const exists = prev.some((g) => g.toLowerCase() === genreName.toLowerCase());
      if (exists) {
        return prev.filter((g) => g.toLowerCase() !== genreName.toLowerCase());
      } else {
        return [...prev, genreName];
      }
    });
  };

  const handleQuickAddGenre = (e: React.MouseEvent) => {
    e.preventDefault();
    const name = newGenreName.trim();
    if (!name) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const kanji = newGenreKanji.trim() || name;

    const newCategory: GenreInfo = {
      id: slug,
      name,
      japanese: kanji,
      description: `Curated canonical ${name} titles.`,
      coverImage: PLACEHOLDER_COVER,
      popularTitle: formData.title || "Archival Selection",
    };

    addGenre(newCategory);
    if (!selectedGenres.some((g) => g.toLowerCase() === name.toLowerCase())) {
      setSelectedGenres((prev) => [...prev, name]);
    }
    setNewGenreName("");
    setNewGenreKanji("");
    setShowAddGenre(false);
  };

  const [previewPagesInput, setPreviewPagesInput] = useState(() => (initialVolume?.previewPages || []).join("\n"));
  const [isUploadingPreviews, setIsUploadingPreviews] = useState(false);
  const [isImportingPreviews, setIsImportingPreviews] = useState(false);
  const [previewUploadProgress, setPreviewUploadProgress] = useState<{ total: number; done: number } | null>(null);
  const [previewUploadError, setPreviewUploadError] = useState("");
  const previewFileInputRef = React.useRef<HTMLInputElement>(null);

  const handlePreviewFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPreviews(true);
    setPreviewUploadError("");
    setPreviewUploadProgress({ total: files.length, done: 0 });

    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const body = new FormData();
        body.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body,
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || `Failed to upload ${file.name}`);
        }

        uploadedUrls.push(data.url);
        setPreviewUploadProgress({ total: files.length, done: i + 1 });
      }

      setPreviewPagesInput((prev) => {
        const existing = prev.trim();
        const addition = uploadedUrls.join("\n");
        return existing ? `${existing}\n${addition}` : addition;
      });
    } catch (err: unknown) {
      console.error("Preview batch upload error:", err);
      const msg = err instanceof Error ? err.message : "Failed to upload preview pages";
      setPreviewUploadError(msg);
    } finally {
      setIsUploadingPreviews(false);
      setPreviewUploadProgress(null);
      if (previewFileInputRef.current) {
        previewFileInputRef.current.value = "";
      }
    }
  };

  /**
   * Pulls any pasted page URLs into our own storage when the field loses focus.
   *
   * Pages typed in by hand should end up in the same bucket as the uploaded
   * ones — otherwise the reader hotlinks a host we do not control, and Next's
   * optimiser refuses any host missing from next.config.
   */
  const handlePreviewUrlsBlur = async () => {
    const lines = previewPagesInput.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.some((line) => /^https?:\/\//i.test(line))) return;

    setIsImportingPreviews(true);
    setPreviewUploadError("");
    try {
      const imported = await Promise.all(
        lines.map(async (line) => {
          if (!/^https?:\/\//i.test(line)) return line;
          try {
            const res = await fetch("/api/upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: line }),
            });
            const data = await res.json();
            // Leave the original in place on failure rather than losing the page.
            return res.ok && data.success ? data.url : line;
          } catch {
            return line;
          }
        })
      );
      const next = imported.join("\n");
      if (next !== previewPagesInput.trim()) setPreviewPagesInput(next);
    } finally {
      setIsImportingPreviews(false);
    }
  };

  const currentPreviewUrls = useMemo(() => {
    return previewPagesInput
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);
  }, [previewPagesInput]);

  const handleRemovePreviewPage = (indexToRemove: number) => {
    const nextList = currentPreviewUrls.filter((_, idx) => idx !== indexToRemove);
    setPreviewPagesInput(nextList.join("\n"));
  };

  const handleSeriesChange = (slug: string) => {
    const selected = effectiveSeriesList.find((s) => s.slug === slug);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        seriesSlug: selected.slug,
        seriesTitle: selected.title,
        author: prev.author || selected.author,
        artist: prev.artist || selected.artist,
      }));
    }
  };

  // Shows the curator exactly what a shopper pays, through the same module
  // the server prices with. The clock comes from a subscription rather than a
  // `Date.now()` read while rendering, so the preview refreshes on a tick
  // instead of on whatever happens to trigger the next render.
  const now = useNow();
  const promoPreview = (() => {
    const promo = formData.promo;
    if (!promo?.percent || !promo?.endsAt) return "";
    const ends = Date.parse(promo.endsAt);
    if (!Number.isFinite(ends)) return "";
    if (now !== null && ends <= now) return "That end time has already passed — the offer will not apply.";
    const priced = priceVolume({ price: Number(formData.price) || 0, originalPrice: formData.originalPrice, promo });
    if (!priced.activePromo) return "Scheduled — not live yet.";
    const hours = Math.round((priced.endsInMs || 0) / 3600000);
    return `Shoppers pay ${priced.price.toFixed(2)} EGP instead of ${Number(formData.price).toFixed(2)} — ends in ${hours}h.`;
  })();

  // --- Box set contents -----------------------------------------------------
  const allVolumes = useStorefrontStore((s) => s.volumes);
  const isBoxSet = formData.format === "Box Set";

  const memberIds = useMemo(() => formData.bundleOf || [], [formData.bundleOf]);

  // A box cannot contain itself, and listing another box would let one bundle
  // silently depend on another's contents. Only the chosen series' volumes are
  // offered; anything already in the box stays listed so it can be unticked
  // after the series is changed.
  const eligibleMembers = useMemo(
    () =>
      allVolumes.filter(
        (v) =>
          v.id !== formData.id &&
          v.format !== "Box Set" &&
          // A box set is made of books; figures and posters never belong in one.
          isBook(v) &&
          (v.seriesSlug === formData.seriesSlug || memberIds.includes(v.id))
      ),
    [allVolumes, formData.id, formData.seriesSlug, memberIds]
  );

  const toggleMember = (id: string) => {
    const next = memberIds.includes(id)
      ? memberIds.filter((m) => m !== id)
      : [...memberIds, id];
    setFormData((prev) => ({ ...prev, bundleOf: next }));
  };

  // Everything the curator needs to see before saving: how many boxes this can
  // actually make, which volume is the bottleneck, and what the contents are
  // worth — all from the same module the storefront and checkout use.
  const bundleFacts = useMemo(() => {
    if (!isBoxSet || memberIds.length === 0) return null;
    const byId = indexById(allVolumes as unknown as VolumeLike[]);
    const facts = describeBundle({ bundleOf: memberIds }, byId);
    const cycle = findBundleCycle(String(formData.id || ""), memberIds, byId);
    const limiting = facts.limitingMemberId
      ? allVolumes.find((v) => v.id === facts.limitingMemberId)
      : null;
    return { ...facts, cycle, limiting };
  }, [isBoxSet, memberIds, allVolumes, formData.id]);


  const handleSubmit = (e: React.FormEvent) => {
    // Before anything else: these checks used to return *ahead* of
    // preventDefault, so a box set that failed validation submitted the form
    // and navigated the console away instead of showing the problem.
    e.preventDefault();
    setErrorMsg("");

    if (formData.format === "Box Set") {
      const chosen = formData.bundleOf || [];
      if (chosen.length === 0) {
        setErrorMsg("A box set needs at least one volume in it. Pick its contents below.");
        return;
      }
      if (bundleFacts?.cycle) {
        setErrorMsg("A box set cannot contain itself or another box set.");
        return;
      }
      if (bundleFacts && bundleFacts.missing.length > 0) {
        setErrorMsg(`These volumes are no longer in the catalogue: ${bundleFacts.missing.join(", ")}`);
        return;
      }
    }

    const parsedPreviews = previewPagesInput
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);

    if (formData.format) {
      addFormat(formData.format);
    }

    const finalVolume: MangaVolume = {
      id: formData.id || `vol-${Date.now()}`,
      volumeNumber: Number(formData.volumeNumber) || 1,
      title: formData.title || `Volume ${formData.volumeNumber || 1}`,
      seriesSlug: formData.seriesSlug || effectiveSeriesList[0]?.slug || "general",
      seriesTitle: formData.seriesTitle || effectiveSeriesList[0]?.title || "General",
      japaneseTitle: formData.japaneseTitle || "",
      author: formData.author || "Unknown",
      artist: formData.artist || formData.author || "Unknown",
      price: Number(formData.price) || 0,
      originalPrice: formData.originalPrice ? Number(formData.originalPrice) : undefined,
      // Only a box set carries contents; anything else drops the field so a
      // format change cannot leave a stale bundle behind.
      bundleOf: formData.format === "Box Set" ? formData.bundleOf : undefined,
      // An incomplete offer is dropped rather than stored half-set.
      promo:
        formData.promo?.percent && formData.promo?.endsAt
          ? { ...formData.promo, percent: Number(formData.promo.percent) }
          : undefined,
      rating: Number(formData.rating) || 5.0,
      reviewCount: Number(formData.reviewCount) || 0,
      coverImage: formData.coverImage || "",
      synopsis: formData.synopsis || "",
      synopsisAr: formData.synopsisAr || "",
      format: (formData.format as MangaVolume["format"]) || "Manga",
      pages: Number(formData.pages) || 192,
      publishDate: formData.publishDate || new Date().toISOString().split("T")[0],
      isbn: formData.isbn || "978-0000000000",
      genre: selectedGenres.length ? selectedGenres : ["Action"],
      stock: Number(formData.stock) >= 0 ? Number(formData.stock) : 0,
      isTrending: Boolean(formData.isTrending),
      isNewRelease: Boolean(formData.isNewRelease),
      isFeatured: Boolean(formData.isFeatured),
      comingSoon: Boolean(formData.comingSoon),
      previewPages: parsedPreviews,
    };

    onSave(finalVolume);
    onClose();
  };

  return (
    <div
      data-lenis-prevent
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto overscroll-contain"
    >
      <div className="relative w-full max-w-3xl bg-ink-surface border border-ink-border rounded-sm shadow-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink">
          <h2 className="font-cinzel text-lg font-bold text-paper">
            {initialVolume ? `Edit Volume: ${initialVolume.title}` : "Add New Manga Volume"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-paper hover:bg-ink-elevated rounded-sm transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          data-lenis-prevent
          onSubmit={handleSubmit}
          className="px-6 py-7 space-y-9 max-h-[75vh] overflow-y-auto overscroll-contain text-xs font-mono"
        >
          {errorMsg && (
            <div
              role="alert"
              className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xs flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section: Basic Identity */}
          <div>
            <h3 className="mb-4 pb-2 border-b border-ink-border/50 text-[11px] uppercase tracking-[0.18em] font-bold text-paper flex items-center gap-1.5">
              <span><span className="text-gold/70">01.</span> Identity & Series</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-4">
              <div className="md:col-span-5 flex flex-col justify-end">
                <div className="flex items-center justify-between mb-1.5 min-h-[20px]">
                  <label className="block text-text-muted">Parent Series *</label>
                  <button
                    type="button"
                    onClick={() => setShowAddSeries(!showAddSeries)}
                    className="text-[10px] text-text-muted hover:text-gold font-mono font-semibold uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    {showAddSeries ? "Cancel" : "+ Add Series"}
                  </button>
                </div>
                {showAddSeries ? (
                  <div className="p-2.5 bg-ink border border-gold/40 rounded-xs space-y-2 font-mono">
                    <input
                      type="text"
                      value={newSeriesTitle}
                      onChange={(e) => setNewSeriesTitle(e.target.value)}
                      placeholder="New Series Title..."
                      className="w-full h-8 bg-ink-surface border border-ink-border text-paper px-2 text-xs rounded-xs focus:border-gold outline-none font-sans"
                    />
                    <input
                      type="text"
                      value={newSeriesAuthor}
                      onChange={(e) => setNewSeriesAuthor(e.target.value)}
                      placeholder="Author (optional)..."
                      className="w-full h-8 bg-ink-surface border border-ink-border text-paper px-2 text-xs rounded-xs focus:border-gold outline-none font-sans"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowAddSeries(false)}
                        className="px-2 py-1 text-[10px] text-text-muted hover:text-paper"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleQuickAddSeries}
                        disabled={!newSeriesTitle.trim()}
                        className="px-2.5 py-1 bg-gold hover:bg-gold-light disabled:opacity-50 text-ink text-[10px] font-bold uppercase tracking-wider rounded-xs cursor-pointer shadow-xs"
                      >
                        Create &amp; Select
                      </button>
                    </div>
                  </div>
                ) : (
                  <CustomSelect
                    fullWidth
                    value={formData.seriesSlug || (effectiveSeriesList[0]?.slug || "")}
                    onChange={handleSeriesChange}
                    options={effectiveSeriesList.map((s) => ({ value: s.slug, label: s.title }))}
                    buttonClassName="bg-ink rounded-sm h-10 px-3 text-xs"
                    placeholder="Select Parent Series..."
                  />
                )}
              </div>

              <div className="md:col-span-3 flex flex-col justify-end">
                <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">Volume Number *</label>
                <CustomNumberInput
                  min={1}
                  className="h-10"
                  value={formData.volumeNumber}
                  onChange={(e) => setFormData({ ...formData, volumeNumber: parseInt(e.target.value, 10) || 1 })}
                  required
                />
              </div>

              <div className="md:col-span-4 flex flex-col justify-end">
                <div className="flex items-center justify-between mb-1.5 min-h-[20px]">
                  <label className="block text-text-muted">Format *</label>
                  <button
                    type="button"
                    onClick={() => setShowAddFormat(!showAddFormat)}
                    className="text-[10px] text-text-muted hover:text-gold font-mono font-semibold uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    {showAddFormat ? "Cancel" : "+ Add Format"}
                  </button>
                </div>
                {showAddFormat ? (
                  <div className="p-2.5 bg-ink border border-gold/40 rounded-xs space-y-2 font-mono">
                    <input
                      type="text"
                      value={newFormatName}
                      onChange={(e) => setNewFormatName(e.target.value)}
                      placeholder="e.g. Collector's Box Set"
                      className="w-full h-8 bg-ink-surface border border-ink-border text-paper px-2 text-xs rounded-xs focus:border-gold outline-none font-sans"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowAddFormat(false)}
                        className="px-2 py-1 text-[10px] text-text-muted hover:text-paper"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleQuickAddFormat}
                        disabled={!newFormatName.trim()}
                        className="px-2.5 py-1 bg-gold hover:bg-gold-light disabled:opacity-50 text-ink text-[10px] font-bold uppercase tracking-wider rounded-xs cursor-pointer shadow-xs"
                      >
                        Add &amp; Select
                      </button>
                    </div>
                  </div>
                ) : (
                  <CustomSelect
                    fullWidth
                    value={formData.format || "Manga"}
                    onChange={(val) => setFormData({ ...formData, format: val as MangaVolume["format"] })}
                    options={effectiveFormats.map((f) => ({ value: f, label: f }))}
                    buttonClassName="bg-ink rounded-sm h-10 px-3 text-xs"
                  />
                )}
              </div>

              <div className="md:col-span-8 flex flex-col justify-end">
                <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">Volume Title / Edition Name *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Ryomen Sukuna"
                  className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-sm font-sans"
                  required
                />
              </div>

              <div className="md:col-span-4 flex flex-col justify-end">
                <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">Japanese Title (Kanji)</label>
                <input
                  type="text"
                  value={formData.japaneseTitle}
                  onChange={(e) => setFormData({ ...formData, japaneseTitle: e.target.value })}
                  placeholder="e.g. 呪術廻戦 01 — 両面宿儺"
                  className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-sm font-sans"
                />
              </div>
            </div>
          </div>

          {/* Section: Authorship & Print Specs */}
          <div>
            <h3 className="mb-4 pb-2 border-b border-ink-border/50 text-[11px] uppercase tracking-[0.18em] font-bold text-paper flex items-center gap-1.5">
              <span><span className="text-gold/70">02.</span> Authorship & Editorial Specs</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-4">
              <div className="md:col-span-3 flex flex-col justify-end">
                <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">Author</label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-sm font-sans"
                />
              </div>
              <div className="md:col-span-3 flex flex-col justify-end">
                <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">Artist / Illustrator</label>
                <input
                  type="text"
                  value={formData.artist}
                  onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                  className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-sm font-sans"
                />
              </div>
              <div className="md:col-span-3 flex flex-col justify-end">
                <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">Page Count</label>
                <CustomNumberInput
                  min={1}
                  step={1}
                  className="h-10"
                  value={formData.pages}
                  onChange={(e) => setFormData({ ...formData, pages: parseInt(e.target.value, 10) || 192 })}
                />
              </div>
              <div className="md:col-span-3 flex flex-col justify-end">
                <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">ISBN-13</label>
                <input
                  type="text"
                  value={formData.isbn}
                  onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                  className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-sm font-sans"
                />
              </div>
            </div>
          </div>

          {/* Section: Pricing & Stock Inventory */}
          <div>
            <h3 className="mb-4 pb-2 border-b border-ink-border/50 text-[11px] uppercase tracking-[0.18em] font-bold text-paper flex items-center gap-1.5">
              <span><span className="text-gold/70">03.</span> Pricing & Stock Inventory</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-4">
              <div className="md:col-span-3 flex flex-col justify-end">
                <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end truncate" title="Selling Price (EGP)">Selling Price (EGP) <span className="ms-1 text-text-muted/60">(optional)</span></label>
                <CustomNumberInput
                  step="any"
                  min={0}
                  prefix="EGP"
                  className="h-10"
                  inputClassName="text-gold font-bold"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="md:col-span-3 flex flex-col justify-end" hidden={isBoxSet}>
                <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end truncate" title="Original Price (EGP) (Strikethrough)">Original Price (EGP)</label>
                <CustomNumberInput
                  step="any"
                  min={0}
                  prefix="EGP"
                  className="h-10"
                  inputClassName="text-text-muted"
                  value={formData.originalPrice ?? ""}
                  onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="e.g. 250"
                />
              </div>
              <div className="md:col-span-3 flex flex-col justify-end" hidden={isBoxSet}>
                <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end truncate" title="Stock Units Available *">Stock Available *</label>
                <CustomNumberInput
                  min={0}
                  step={1}
                  className="h-10"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value, 10) || 0 })}
                  required={!isBoxSet}
                />
              </div>
              <div className="md:col-span-3 flex flex-col justify-end">
                <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end truncate" title="Review Rating (0.0 – 5.0)">Rating (0.0–5.0)</label>
                <CustomNumberInput
                  step={0.1}
                  min={1}
                  max={5}
                  className="h-10"
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || 5.0 })}
                />
              </div>
            </div>

              {/* Box Set Contents */}
              {isBoxSet && (
                <div className="mt-5 p-4 bg-ink/50 border border-ink-border/70 rounded-sm space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Package strokeWidth={1.6} className="w-3.5 h-3.5 text-gold/70" />
                      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-paper">
                        Box Contents — {memberIds.length} volume{memberIds.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, bundleOf: eligibleMembers.filter((v) => v.seriesSlug === formData.seriesSlug).map((v) => v.id) })}
                        className="text-[10px] font-mono uppercase tracking-wider text-text-muted hover:text-gold cursor-pointer"
                      >
                        Select all
                      </button>
                      <span className="text-ink-border">|</span>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, bundleOf: [] })}
                        className="text-[10px] font-mono uppercase tracking-wider text-text-muted hover:text-vermilion cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] text-text-muted leading-relaxed">
                    Stock and the &quot;before discount&quot; price are worked out from these volumes —
                    you do not set them for a box. Selling one box takes one copy of every
                    volume listed here.
                  </p>

                  <div
                    data-lenis-prevent
                    className="max-h-56 overflow-y-auto overscroll-contain space-y-1 pr-1 border-y border-ink-border/60 py-2"
                  >
                    {eligibleMembers.length === 0 ? (
                      <p className="text-[11px] text-text-muted py-2">No volumes available to add yet.</p>
                    ) : (
                      eligibleMembers.map((volume) => {
                        const checked = memberIds.includes(volume.id);
                        return (
                          <label
                            key={volume.id}
                            onClick={() => toggleMember(volume.id)}
                            className="flex items-center justify-between gap-2 text-[11px] text-text-muted hover:text-paper cursor-pointer group select-none py-1 px-1 -mx-1 rounded-xs hover:bg-ink-elevated/50"
                          >
                            <span className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`w-4 h-4 rounded-xs border flex items-center justify-center shrink-0 transition-colors ${
                                  checked ? "bg-gold border-gold text-ink" : "border-ink-border group-hover:border-paper/60"
                                }`}
                              >
                                {checked && <Check strokeWidth={2.5} className="w-3 h-3" />}
                              </span>
                              <span className="truncate">
                                Vol. {volume.volumeNumber} — {volume.title}
                              </span>
                            </span>
                            <span className={`font-mono shrink-0 ${volume.stock <= 0 ? "text-vermilion" : "text-text-muted/70"}`}>
                              {volume.stock} in stock
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>

                  {bundleFacts && (
                    <div className="space-y-1.5 text-[11px] font-mono">
                      {bundleFacts.cycle ? (
                        <p className="flex items-start gap-1.5 text-vermilion">
                          <AlertTriangle strokeWidth={1.8} className="w-3.5 h-3.5 shrink-0 mt-px" />
                          <span>A box set cannot contain itself or another box set.</span>
                        </p>
                      ) : bundleFacts.missing.length > 0 ? (
                        <p className="flex items-start gap-1.5 text-vermilion">
                          <AlertTriangle strokeWidth={1.8} className="w-3.5 h-3.5 shrink-0 mt-px" />
                          <span>Missing from the catalogue: {bundleFacts.missing.join(", ")}</span>
                        </p>
                      ) : (
                        <>
                          <p className={bundleFacts.stock > 0 ? "text-gold" : "text-vermilion"}>
                            {bundleFacts.stock > 0
                              ? `Can assemble ${bundleFacts.stock} box${bundleFacts.stock === 1 ? "" : "es"} right now.`
                              : "Out of stock — at least one volume in this box has none left."}
                          </p>
                          {bundleFacts.limiting && (
                            <p className="text-text-muted">
                              Limited by Vol. {bundleFacts.limiting.volumeNumber} — {bundleFacts.limiting.title}
                              {" "}({bundleFacts.limiting.stock} left).
                            </p>
                          )}
                          <p className="text-text-muted">
                            Contents are worth {bundleFacts.listPrice.toFixed(2)} EGP separately
                            {Number(formData.price) > 0 && bundleFacts.listPrice > Number(formData.price)
                              ? ` — this box saves ${(bundleFacts.listPrice - Number(formData.price)).toFixed(2)} EGP (${Math.round((1 - Number(formData.price) / bundleFacts.listPrice) * 100)}%).`
                              : "."}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Limited-Time Offer */}
              <div className="mt-5 p-4 bg-ink/50 border border-ink-border/70 rounded-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Timer strokeWidth={1.6} className="w-3.5 h-3.5 text-vermilion/80" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-paper">Limited-Time Offer</span>
                  </div>
                  {formData.promo?.endsAt ? (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, promo: undefined })}
                      className="text-[10px] font-mono uppercase tracking-wider text-text-muted hover:text-vermilion cursor-pointer"
                    >
                      Remove offer
                    </button>
                  ) : (
                    <span className="text-[10px] text-text-muted">Optional — applied on top of the price above</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="flex flex-col justify-end">
                    <label className="block text-text-muted mb-1.5">Discount %</label>
                    <CustomNumberInput
                      min={0}
                      max={90}
                      step={1}
                      className="h-10"
                      inputClassName="text-vermilion font-bold"
                      value={formData.promo?.percent ?? ""}
                      onChange={(e) => {
                        const percent = parseInt(e.target.value, 10);
                        setFormData({
                          ...formData,
                          promo: Number.isFinite(percent) && percent > 0
                            ? { ...(formData.promo || { endsAt: "" }), percent }
                            : undefined,
                        });
                      }}
                      placeholder="e.g. 20"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="block text-text-muted mb-1.5">Starts (optional)</label>
                    <input
                      type="datetime-local"
                      value={toLocalInputValue(formData.promo?.startsAt)}
                      onChange={(e) => setFormData({ ...formData, promo: { ...(formData.promo || { percent: 0, endsAt: "" }), startsAt: fromLocalInputValue(e.target.value) } })}
                      className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="block text-text-muted mb-1.5">Ends *</label>
                    <input
                      type="datetime-local"
                      value={toLocalInputValue(formData.promo?.endsAt)}
                      onChange={(e) => setFormData({ ...formData, promo: { ...(formData.promo || { percent: 0 }), endsAt: fromLocalInputValue(e.target.value) || "" } })}
                      className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="flex flex-col justify-end">
                    <label className="block text-text-muted mb-1.5">Badge label (EN)</label>
                    <input
                      type="text"
                      maxLength={40}
                      value={formData.promo?.label ?? ""}
                      onChange={(e) => setFormData({ ...formData, promo: { ...(formData.promo || { percent: 0, endsAt: "" }), label: e.target.value } })}
                      placeholder="e.g. WEEKEND DEAL"
                      className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="block text-text-muted mb-1.5">Badge label (AR)</label>
                    <input
                      type="text"
                      maxLength={40}
                      dir="rtl"
                      value={formData.promo?.labelArabic ?? ""}
                      onChange={(e) => setFormData({ ...formData, promo: { ...(formData.promo || { percent: 0, endsAt: "" }), labelArabic: e.target.value } })}
                      placeholder="مثال: عرض نهاية الأسبوع"
                      className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs"
                    />
                  </div>
                </div>

                {promoPreview && <p className="text-[11px] font-mono text-gold">{promoPreview}</p>}
              </div>

          </div>

          {/* Section: Artwork & Manga Reader Preview */}
          <div>
            <h3 className="mb-4 pb-2 border-b border-ink-border/50 text-[11px] uppercase tracking-[0.18em] font-bold text-paper flex items-center gap-1.5">
              <span><span className="text-gold/70">04.</span> Cover Artwork & Manga Reader Preview</span>
            </h3>
            <div className="space-y-6">
              <ImageUploadInput
                label="Volume Cover Artwork"
                value={formData.coverImage}
                onChange={(url) => setFormData({ ...formData, coverImage: url })}
                placeholder="https://... or upload local image file (Rec: 800 × 1200 px)"
                required
                aspectRatio="cover"
                recommendedDimensions="800 × 1200 px (2:3 or 3:4 Tankōbon)"
                helpText="Upload from your PC or enter an external image URL"
              />

              {/* Preview Reader Pages (Multi-Image Upload or URL List) */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="block text-text-muted">Preview Reader Pages (RTL reader chapter)</label>
                    <span className="text-[10px] font-mono text-text-muted/80">Rec. 800 × 1200 px (2:3 portrait per page)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={previewFileInputRef}
                      onChange={handlePreviewFilesUpload}
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={isUploadingPreviews}
                      onClick={() => previewFileInputRef.current?.click()}
                      className="px-2.5 py-1 bg-ink-surface hover:bg-gold/15 border border-ink-border hover:border-gold/60 text-text-muted hover:text-gold text-[11px] font-mono font-semibold uppercase tracking-wider rounded-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploadingPreviews ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-gold" />
                          <span>
                            {isArabic ? "جاري الرفع" : "Uploading"} ({previewUploadProgress ? `${previewUploadProgress.done}/${previewUploadProgress.total}` : "..."})
                          </span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3 h-3" />
                          <span>Upload Pages from PC</span>
                        </>
                      )}
                    </button>
                    {currentPreviewUrls.length > 0 && (
                      <span className="text-[10px] text-paper-muted font-mono">
                        ({currentPreviewUrls.length} pages)
                      </span>
                    )}
                  </div>
                </div>

                {previewUploadError && (
                  <p className="text-[10px] text-vermilion font-mono bg-vermilion/10 p-2 rounded-xs border border-vermilion/20">
                    {previewUploadError}
                  </p>
                )}

                <textarea
                  rows={3}
                  value={previewPagesInput}
                  onChange={(e) => setPreviewPagesInput(e.target.value)}
                  onBlur={handlePreviewUrlsBlur}
                  disabled={isImportingPreviews}
                  placeholder="https://images.../page-1.jpg&#10;https://images.../page-2.jpg&#10;https://images.../page-3.jpg (or click Upload Pages from PC above)"
                  className="w-full bg-ink border border-ink-border text-paper p-3 rounded-sm focus:border-gold outline-none font-mono text-[11px]"
                />

                {/* Visual Preview Gallery of Pages */}
                {currentPreviewUrls.length > 0 && (
                  <div className="bg-ink-surface/50 p-2.5 rounded-sm border border-ink-border space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-text-muted uppercase font-mono">
                      <span>Preview Gallery ({currentPreviewUrls.length} Pages Loaded)</span>
                      <button
                        type="button"
                        onClick={() => setPreviewPagesInput("")}
                        className="text-vermilion hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 max-h-28 scrollbar-thin">
                      {currentPreviewUrls.map((url, idx) => (
                        <div
                          key={idx}
                          className="relative shrink-0 w-16 h-22 bg-ink border border-ink-border rounded-xs overflow-hidden group"
                        >
                          <img
                            src={url}
                            alt={`Page ${idx + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                          <div className="absolute bottom-0 inset-x-0 bg-ink/90 text-center text-[9px] font-mono text-paper-muted py-0.5">
                            P.{idx + 1}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemovePreviewPage(idx)}
                            className="absolute top-1 right-1 w-4 h-4 bg-vermilion/90 hover:bg-vermilion text-paper rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Remove page"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Category / Genres Selection & Quick Add */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="block text-text-muted">Genres &amp; Categories *</label>
                    <span className="text-[10px] text-paper-muted">
                      ({selectedGenres.length} selected)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddGenre(!showAddGenre)}
                    className="flex items-center gap-1 text-[11px] text-text-muted hover:text-gold font-mono font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showAddGenre ? "Cancel" : "+ Add New Category"}</span>
                  </button>
                </div>

                {/* Quick Add Inline Creator */}
                {showAddGenre && (
                  <div className="p-3 bg-ink-surface border border-gold/40 rounded-xs space-y-3 animate-in fade-in duration-200">
                    <div className="text-[11px] font-mono text-paper font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>Create New Store Category</span>
                      <span className="text-[10px] text-text-muted font-normal">
                        Immediately updates site filters &amp; bento grid
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-mono text-text-muted uppercase mb-1">
                          Category Name (English) *
                        </label>
                        <input
                          type="text"
                          value={newGenreName}
                          onChange={(e) => setNewGenreName(e.target.value)}
                          placeholder="e.g. Cyberpunk, Mecha, Historical"
                          className="w-full h-8 bg-ink border border-ink-border text-paper px-2.5 rounded-xs text-xs focus:border-gold outline-none font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-text-muted uppercase mb-1">
                          Japanese Kanji (Optional)
                        </label>
                        <input
                          type="text"
                          value={newGenreKanji}
                          onChange={(e) => setNewGenreKanji(e.target.value)}
                          placeholder="e.g. サイバーパンク"
                          className="w-full h-8 bg-ink border border-ink-border text-gold px-2.5 rounded-xs text-xs focus:border-gold outline-none font-serif"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddGenre(false)}
                        className="px-3 py-1 text-[10px] font-mono uppercase text-text-muted hover:text-paper cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleQuickAddGenre}
                        disabled={!newGenreName.trim()}
                        className="flex items-center gap-1.5 px-3 py-1 bg-gold hover:bg-gold-light disabled:opacity-50 text-ink text-[11px] font-mono font-bold uppercase tracking-wider rounded-xs cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add &amp; Select Category</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Selected Genre Badges / Chips */}
                <div className="flex flex-wrap items-center gap-1.5 min-h-[38px] p-2 bg-ink border border-ink-border rounded-sm">
                  {selectedGenres.length === 0 ? (
                    <span className="text-xs text-text-muted/60 italic font-mono">
                      No categories selected yet. Click any category below to assign it.
                    </span>
                  ) : (
                    selectedGenres.map((g) => (
                      <span
                        key={g}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-gold/15 text-gold border border-gold/40 text-xs font-mono font-bold uppercase tracking-wide group"
                      >
                        <span>{g}</span>
                        <button
                          type="button"
                          onClick={() => toggleGenreSelection(g)}
                          className="text-gold/70 hover:text-paper p-0.5 rounded-full hover:bg-gold/20 cursor-pointer transition-colors"
                          title={`Remove ${g}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Available Store Categories (Click to Toggle) */}
                <div className="space-y-1.5 pt-1">
                  <span className="block text-[10px] font-mono text-text-muted/80">Click a category to select or deselect it</span>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto overscroll-contain pr-1">
                    {storeGenres.map((genre) => {
                      const isSelected = selectedGenres.some(
                        (g) => g.toLowerCase() === genre.name.toLowerCase() || g.toLowerCase() === genre.id.toLowerCase()
                      );
                      return (
                        <button
                          key={genre.id}
                          type="button"
                          onClick={() => toggleGenreSelection(genre.name)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs text-[11px] font-mono uppercase tracking-wider border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-gold text-ink border-gold font-bold shadow-xs"
                              : "bg-ink-surface text-text-muted border-ink-border hover:border-gold/50 hover:text-paper"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                          <span>{genre.name}</span>
                          <span className={`text-[9px] font-serif ${isSelected ? "text-ink/80" : "text-gold/70"}`}>
                            {genre.japanese}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-text-muted mb-1.5 min-h-[20px] flex items-end">
                    Synopsis &amp; Editorial Summary (English)
                  </label>
                  <textarea
                    rows={4}
                    value={formData.synopsis}
                    onChange={(e) => setFormData({ ...formData, synopsis: e.target.value })}
                    placeholder="Story synopsis..."
                    className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none resize-y"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-text-muted mb-1.5 min-h-[20px] flex items-end gap-1.5">
                    <span>الوصف بالعربية</span>
                    <span className="text-text-muted/60">(optional)</span>
                  </label>
                  <textarea
                    rows={4}
                    dir="rtl"
                    value={formData.synopsisAr || ""}
                    onChange={(e) => setFormData({ ...formData, synopsisAr: e.target.value })}
                    placeholder="وصف الكتاب بالعربية..."
                    className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none font-sans resize-y"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Badges & Merchandising Flags */}
          <div>
            <h3 className="mb-4 pb-2 border-b border-ink-border/50 text-[11px] uppercase tracking-[0.18em] font-bold text-paper flex items-center gap-1.5">
              <span><span className="text-gold/70">05.</span> Merchandising Flags</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex items-center gap-2.5 p-3 border border-gold/30 rounded-sm bg-gold/5 cursor-pointer hover:border-gold/60">
                <input type="checkbox" checked={formData.comingSoon || false} onChange={(e) => setFormData({ ...formData, comingSoon: e.target.checked })} className="accent-gold w-4 h-4 cursor-pointer" />
                <span className="text-paper">Coming soon — visible to shoppers; they can save it to Wishlist, not buy it</span>
              </label>
              <label className="flex items-center gap-2.5 p-3 border border-ink-border rounded-sm bg-ink cursor-pointer hover:border-gold/50">
                <input
                  type="checkbox"
                  checked={formData.isTrending || false}
                  onChange={(e) => setFormData({ ...formData, isTrending: e.target.checked })}
                  className="accent-gold w-4 h-4 cursor-pointer"
                />
                <span className="text-paper">Show in Trending Carousel</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 border border-ink-border rounded-sm bg-ink cursor-pointer hover:border-gold/50">
                <input
                  type="checkbox"
                  checked={formData.isNewRelease || false}
                  onChange={(e) => setFormData({ ...formData, isNewRelease: e.target.checked })}
                  className="accent-gold w-4 h-4 cursor-pointer"
                />
                <span className="text-paper">Show in New Releases</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 border border-ink-border rounded-sm bg-ink cursor-pointer hover:border-gold/50">
                <input
                  type="checkbox"
                  checked={formData.isFeatured || false}
                  onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                  className="accent-gold w-4 h-4 cursor-pointer"
                />
                <span className="text-paper">Curator Featured Spotlight</span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-5 border-t border-ink-border">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-ink-border text-text-muted hover:text-paper rounded-sm uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-gold hover:bg-gold-muted text-ink font-bold rounded-sm uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-gold/15"
            >
              <Save className="w-4 h-4" />
              <span>Save Volume</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * A new product starts by choosing what it is; the book form and the figure /
 * poster form share nothing but the save handler.
 */
function NewProductDialog({ seriesList, onClose, onSave }: Omit<VolumeFormModalProps, "isOpen" | "initialVolume">) {
  const [choice, setChoice] = useState<ProductType | null>(null);
  useModalScrollLock(choice === null);

  if (choice === "book") {
    return <VolumeFormDialog key="new" initialVolume={null} seriesList={seriesList} onClose={onClose} onSave={onSave} />;
  }
  if (choice === "figure" || choice === "poster") {
    return <MerchFormModal isOpen initialType={choice} onClose={onClose} onSave={onSave} />;
  }

  const options: { id: ProductType; title: string; hint: string }[] = [
    { id: "book", title: "Manga / Book", hint: "A volume, deluxe edition, light novel or box set" },
    { id: "figure", title: "Figure", hint: "Sold in one or more editions, each with its own stock" },
    { id: "poster", title: "Poster", hint: "Sold in one or more sizes, each with its own stock" },
  ];

  return (
    <div data-lenis-prevent role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-xl bg-ink-surface border border-ink-border rounded-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink">
          <h2 className="font-cinzel text-lg font-bold text-paper">What are you adding?</h2>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-paper hover:bg-ink-elevated rounded-sm transition-colors cursor-pointer" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setChoice(option.id)}
              className="p-4 text-start bg-ink border border-ink-border hover:border-gold rounded-sm transition-colors cursor-pointer space-y-1.5"
            >
              <span className="block text-sm font-bold text-paper uppercase tracking-wider">{option.title}</span>
              <span className="block text-[10px] text-text-muted leading-relaxed">{option.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function VolumeFormModal({
  isOpen,
  onClose,
  onSave,
  initialVolume,
  seriesList,
}: VolumeFormModalProps) {
  if (!isOpen) return null;

  // Figures and posters have their own form.
  if (initialVolume && isMerch(initialVolume)) {
    return <MerchFormModal isOpen initialProduct={initialVolume} onClose={onClose} onSave={onSave} />;
  }
  if (!initialVolume) {
    return <NewProductDialog seriesList={seriesList} onClose={onClose} onSave={onSave} />;
  }

  return (
    <VolumeFormDialog
      key={initialVolume?.id || "new"}
      initialVolume={initialVolume}
      seriesList={seriesList}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
