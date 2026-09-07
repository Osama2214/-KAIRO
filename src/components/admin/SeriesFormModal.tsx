"use client";

import React, { useState } from "react";
import { X, Save, Layers } from "lucide-react";
import { Series } from "@/data/manga";
import { CustomSelect } from "@/components/CustomSelect";
import { CustomNumberInput } from "@/components/ui/CustomNumberInput";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";

interface SeriesFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (series: Series) => void;
  initialSeries?: Series | null;
}

function SeriesFormDialog({
  initialSeries,
  onClose,
  onSave,
}: {
  initialSeries?: Series | null;
  onClose: () => void;
  onSave: (series: Series) => void;
}) {
  useModalScrollLock(true);
  const [formData, setFormData] = useState<Partial<Series>>(() => {
    if (initialSeries) return initialSeries;
    return {
      slug: "",
      title: "",
      japaneseTitle: "",
      romajiTitle: "",
      author: "",
      artist: "",
      genres: ["Action"],
      description: "",
      quote: "",
      bannerImage: "https://s4.anilist.co/file/anilistcdn/media/manga/banner/101517-FrJtb3Th3HtF.jpg",
      featuredImage: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx101517-kWbiEqjC1Bsm.jpg",
      status: "Ongoing",
      totalVolumes: 1,
      volumes: [],
    };
  });

  const [genresInput, setGenresInput] = useState(() => (initialSeries?.genres || []).join(", ") || "Action");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedGenres = genresInput
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);

    const generatedSlug =
      formData.slug?.trim() ||
      (formData.title || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") ||
      `series-${Date.now()}`;

    const finalSeries: Series = {
      slug: generatedSlug,
      title: formData.title || "Untitled Series",
      japaneseTitle: formData.japaneseTitle || "",
      romajiTitle: formData.romajiTitle || formData.title || "",
      author: formData.author || "Unknown",
      artist: formData.artist || formData.author || "Unknown",
      genres: parsedGenres.length ? parsedGenres : ["Manga"],
      description: formData.description || "",
      quote: formData.quote || "",
      bannerImage: formData.bannerImage || "",
      featuredImage: formData.featuredImage || "",
      status: (formData.status as Series["status"]) || "Ongoing",
      totalVolumes: Number(formData.totalVolumes) || 1,
      volumes: initialSeries?.volumes || [],
    };

    onSave(finalSeries);
    onClose();
  };

  return (
    <div
      data-lenis-prevent
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto overscroll-contain"
    >
      <div className="relative w-full max-w-2xl bg-ink-surface border border-ink-border rounded-sm shadow-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-gold" />
            <h2 className="font-cinzel text-lg font-bold text-paper">
              {initialSeries ? `Edit Series: ${initialSeries.title}` : "Create New Series Franchise"}
            </h2>
          </div>
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
          className="p-6 space-y-4 max-h-[75vh] overflow-y-auto overscroll-contain text-xs font-mono"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col justify-end">
              <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">Series Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Jujutsu Kaisen"
                className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-sm font-sans"
                required
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">Slug Identifier *</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="e.g. jujutsu-kaisen"
                className="w-full h-10 bg-ink border border-ink-border text-gold px-3 rounded-sm focus:border-gold outline-none text-sm font-sans font-mono"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">Japanese Title (Kanji)</label>
              <input
                type="text"
                value={formData.japaneseTitle}
                onChange={(e) => setFormData({ ...formData, japaneseTitle: e.target.value })}
                placeholder="e.g. 呪術廻戦"
                className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-sm font-sans"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">Romaji Title</label>
              <input
                type="text"
                value={formData.romajiTitle}
                onChange={(e) => setFormData({ ...formData, romajiTitle: e.target.value })}
                placeholder="e.g. Jujutsu Kaisen"
                className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-sm font-sans"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">Author</label>
              <input
                type="text"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                placeholder="e.g. Gege Akutami"
                className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-sm font-sans"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">Artist / Illustrator</label>
              <input
                type="text"
                value={formData.artist}
                onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                placeholder="e.g. Gege Akutami"
                className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-sm font-sans"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">Publication Status *</label>
              <CustomSelect
                fullWidth
                value={formData.status || "Ongoing"}
                onChange={(val) => setFormData({ ...formData, status: val as Series["status"] })}
                options={[
                  { value: "Ongoing", label: "Ongoing", badge: "連載中" },
                  { value: "Completed", label: "Completed", badge: "完結" },
                ]}
                buttonClassName="bg-ink rounded-sm h-10 px-3 text-xs"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="block text-text-muted mb-1.5 min-h-[20px] flex items-end">Total Expected Volumes</label>
              <CustomNumberInput
                min={1}
                step={1}
                className="h-10"
                value={formData.totalVolumes}
                onChange={(e) => setFormData({ ...formData, totalVolumes: parseInt(e.target.value, 10) || 1 })}
              />
            </div>
          </div>

          <div>
            <label className="block text-text-muted mb-1.5">Genres (Comma separated)</label>
            <input
              type="text"
              value={genresInput}
              onChange={(e) => setGenresInput(e.target.value)}
              placeholder="Action, Supernatural, Dark Fantasy"
              className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-sm font-sans"
            />
          </div>

          <div>
            <label className="block text-text-muted mb-1">Editorial Quote / Tagline</label>
            <input
              type="text"
              value={formData.quote}
              onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
              placeholder="e.g. In a world where negative human emotions manifest as deadly curses..."
              className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
            />
          </div>

          <div>
            <label className="block text-text-muted mb-1">Synopsis & Editorial Overview</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Series narrative breakdown..."
              className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-text-muted mb-1">Banner Artwork URL</label>
              <input
                type="url"
                value={formData.bannerImage}
                onChange={(e) => setFormData({ ...formData, bannerImage: e.target.value })}
                placeholder="https://..."
                className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
              />
            </div>

            <div>
              <label className="block text-text-muted mb-1">Featured Cover URL</label>
              <input
                type="url"
                value={formData.featuredImage}
                onChange={(e) => setFormData({ ...formData, featuredImage: e.target.value })}
                placeholder="https://..."
                className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
              />
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
              <span>Save Series</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SeriesFormModal({
  isOpen,
  onClose,
  onSave,
  initialSeries,
}: SeriesFormModalProps) {
  if (!isOpen) return null;

  return (
    <SeriesFormDialog
      key={initialSeries?.slug || "new"}
      initialSeries={initialSeries}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
