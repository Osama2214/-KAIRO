"use client";

import React, { useState } from "react";
import { X, Save, BookOpen } from "lucide-react";
import { MangaVolume, Series } from "@/data/manga";
import { CustomSelect } from "@/components/CustomSelect";
import { CustomNumberInput } from "@/components/ui/CustomNumberInput";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";

interface VolumeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (volume: MangaVolume) => void;
  initialVolume?: MangaVolume | null;
  seriesList: Series[];
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
  useModalScrollLock(true);
  const defaultSeries = seriesList[0] || { slug: "jujutsu-kaisen", title: "Jujutsu Kaisen", author: "", artist: "" };

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
      price: 11.99,
      originalPrice: 14.99,
      rating: 4.9,
      reviewCount: 50,
      coverImage: "https://images-na.ssl-images-amazon.com/images/P/1974700526.01._SX700_SCLZZZZZZZ_.jpg",
      synopsis: "",
      format: "Manga",
      pages: 192,
      publishDate: new Date().toISOString().split("T")[0],
      isbn: "978-1974718827",
      genre: ["Action"],
      stock: 20,
      isTrending: false,
      isNewRelease: true,
      isFeatured: false,
      previewPages: [],
    };
  });

  const [genresInput, setGenresInput] = useState(() => (initialVolume?.genre || []).join(", ") || "Action");
  const [previewPagesInput, setPreviewPagesInput] = useState(() => (initialVolume?.previewPages || []).join("\n"));

  const handleSeriesChange = (slug: string) => {
    const selected = seriesList.find((s) => s.slug === slug);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedGenres = genresInput
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);

    const parsedPreviews = previewPagesInput
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);

    const finalVolume: MangaVolume = {
      id: formData.id || `vol-${Date.now()}`,
      volumeNumber: Number(formData.volumeNumber) || 1,
      title: formData.title || `Volume ${formData.volumeNumber || 1}`,
      seriesSlug: formData.seriesSlug || seriesList[0]?.slug || "general",
      seriesTitle: formData.seriesTitle || seriesList[0]?.title || "General",
      japaneseTitle: formData.japaneseTitle || "",
      author: formData.author || "Unknown",
      artist: formData.artist || formData.author || "Unknown",
      price: Number(formData.price) || 0,
      originalPrice: formData.originalPrice ? Number(formData.originalPrice) : undefined,
      rating: Number(formData.rating) || 5.0,
      reviewCount: Number(formData.reviewCount) || 0,
      coverImage: formData.coverImage || "",
      synopsis: formData.synopsis || "",
      format: (formData.format as MangaVolume["format"]) || "Manga",
      pages: Number(formData.pages) || 192,
      publishDate: formData.publishDate || new Date().toISOString().split("T")[0],
      isbn: formData.isbn || "978-0000000000",
      genre: parsedGenres.length ? parsedGenres : ["Manga"],
      stock: Number(formData.stock) >= 0 ? Number(formData.stock) : 0,
      isTrending: Boolean(formData.isTrending),
      isNewRelease: Boolean(formData.isNewRelease),
      isFeatured: Boolean(formData.isFeatured),
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
          className="p-6 space-y-6 max-h-[75vh] overflow-y-auto overscroll-contain text-xs font-mono"
        >
          {/* Section: Basic Identity */}
          <div>
            <h3 className="text-gold uppercase tracking-wider mb-3 font-bold border-b border-ink-border/50 pb-1 flex items-center gap-1.5">
              <span>01. Identity & Series</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col justify-end">
                <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">Parent Series *</label>
                <CustomSelect
                  fullWidth
                  value={formData.seriesSlug || (seriesList[0]?.slug || "")}
                  onChange={handleSeriesChange}
                  options={seriesList.map((s) => ({ value: s.slug, label: s.title }))}
                  buttonClassName="bg-ink rounded-sm h-10 px-3 text-xs"
                  placeholder="Select Parent Series..."
                />
              </div>

              <div className="flex flex-col justify-end">
                <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">Volume Number *</label>
                <CustomNumberInput
                  min={1}
                  className="h-10"
                  value={formData.volumeNumber}
                  onChange={(e) => setFormData({ ...formData, volumeNumber: parseInt(e.target.value, 10) || 1 })}
                  required
                />
              </div>

              <div className="flex flex-col justify-end">
                <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">Format *</label>
                <CustomSelect
                  fullWidth
                  value={formData.format || "Manga"}
                  onChange={(val) => setFormData({ ...formData, format: val as MangaVolume["format"] })}
                  options={[
                    { value: "Manga", label: "Manga" },
                    { value: "Light Novel", label: "Light Novel" },
                    { value: "Box Set", label: "Box Set" },
                    { value: "Deluxe Edition", label: "Deluxe Edition" },
                  ]}
                  buttonClassName="bg-ink rounded-sm h-10 px-3 text-xs"
                />
              </div>

              <div className="md:col-span-2 flex flex-col justify-end">
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

              <div className="flex flex-col justify-end">
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
            <h3 className="text-gold uppercase tracking-wider mb-3 font-bold border-b border-ink-border/50 pb-1 flex items-center gap-1.5">
              <span>02. Authorship & Editorial Specs</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col justify-end">
                <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">Author</label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-sm font-sans"
                />
              </div>
              <div className="flex flex-col justify-end">
                <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">Artist / Illustrator</label>
                <input
                  type="text"
                  value={formData.artist}
                  onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                  className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-sm font-sans"
                />
              </div>
              <div className="flex flex-col justify-end">
                <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">Page Count</label>
                <CustomNumberInput
                  min={1}
                  step={1}
                  className="h-10"
                  value={formData.pages}
                  onChange={(e) => setFormData({ ...formData, pages: parseInt(e.target.value, 10) || 192 })}
                />
              </div>
              <div className="flex flex-col justify-end">
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
            <h3 className="text-gold uppercase tracking-wider mb-3 font-bold border-b border-ink-border/50 pb-1 flex items-center gap-1.5">
              <span>03. Pricing & Stock Inventory</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col justify-end">
                <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end truncate" title="Selling Price (EGP) *">Selling Price (EGP) *</label>
                <CustomNumberInput
                  step="any"
                  min={0}
                  prefix="EGP"
                  className="h-10"
                  inputClassName="text-gold font-bold"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="flex flex-col justify-end">
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
              <div className="flex flex-col justify-end">
                <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end truncate" title="Stock Units Available *">Stock Available *</label>
                <CustomNumberInput
                  min={0}
                  step={1}
                  className="h-10"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value, 10) || 0 })}
                  required
                />
              </div>
              <div className="flex flex-col justify-end">
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
          </div>

          {/* Section: Artwork & Manga Reader Preview */}
          <div>
            <h3 className="text-gold uppercase tracking-wider mb-3 font-bold border-b border-ink-border/50 pb-1 flex items-center gap-1.5">
              <span>04. Cover Artwork & Manga Reader Preview</span>
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-text-muted mb-1.5">Cover Image URL *</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="url"
                    value={formData.coverImage}
                    onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-sm font-sans"
                    required
                  />
                  {formData.coverImage && (
                    <div className="w-10 h-10 border border-ink-border overflow-hidden rounded-xs shrink-0 bg-ink">
                      <img src={formData.coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-text-muted mb-1.5">
                  Preview Reader Pages (One Image URL per line for RTL Reader)
                </label>
                <textarea
                  rows={3}
                  value={previewPagesInput}
                  onChange={(e) => setPreviewPagesInput(e.target.value)}
                  placeholder="https://images.../page-1.jpg&#10;https://images.../page-2.jpg&#10;https://images.../page-3.jpg"
                  className="w-full bg-ink border border-ink-border text-paper p-3 rounded-sm focus:border-gold outline-none font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-text-muted mb-1.5">Genres (Comma separated)</label>
                <input
                  type="text"
                  value={genresInput}
                  onChange={(e) => setGenresInput(e.target.value)}
                  placeholder="Action, Dark Fantasy, Supernatural"
                  className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-sm font-sans"
                />
              </div>

              <div>
                <label className="block text-text-muted mb-1">Synopsis & Editorial Summary</label>
                <textarea
                  rows={3}
                  value={formData.synopsis}
                  onChange={(e) => setFormData({ ...formData, synopsis: e.target.value })}
                  placeholder="Story synopsis..."
                  className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section: Badges & Merchandising Flags */}
          <div>
            <h3 className="text-gold uppercase tracking-wider mb-3 font-bold border-b border-ink-border/50 pb-1">
              <span>05. Merchandising Flags</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-ink-border">
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

export function VolumeFormModal({
  isOpen,
  onClose,
  onSave,
  initialVolume,
  seriesList,
}: VolumeFormModalProps) {
  if (!isOpen) return null;

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
