"use client";

import React, { useState } from "react";
import { X, Save, Layers, Plus, Check, Trash2 } from "lucide-react";
import { Series, GenreInfo } from "@/data/manga";
import { CustomSelect } from "@/components/CustomSelect";
import { CustomNumberInput } from "@/components/ui/CustomNumberInput";
import { ImageUploadInput } from "@/components/ImageUploadInput";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { PLACEHOLDER_BANNER, PLACEHOLDER_COVER } from "@/config/mediaDefaults";

interface SeriesFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (series: Series) => void;
  onDelete?: (slug: string) => void;
  initialSeries?: Series | null;
}

function SeriesFormDialog({
  initialSeries,
  onClose,
  onSave,
  onDelete,
}: {
  initialSeries?: Series | null;
  onClose: () => void;
  onSave: (series: Series) => void;
  onDelete?: (slug: string) => void;
}) {
  useModalScrollLock(true);

  const storeGenres = useStorefrontStore((s) => s.genres);
  const addGenre = useStorefrontStore((s) => s.addGenre);

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
      descriptionAr: "",
      quote: "",
      bannerImage: PLACEHOLDER_BANNER,
      featuredImage: PLACEHOLDER_COVER,
      status: "Ongoing",
      totalVolumes: 1,
      volumes: [],
    };
  });

  const [selectedGenres, setSelectedGenres] = useState<string[]>(() => {
    if (initialSeries?.genres && initialSeries.genres.length > 0) {
      return initialSeries.genres;
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

  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = () => {
    if (!initialSeries || !onDelete) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(initialSeries.slug);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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
      genres: selectedGenres.length ? selectedGenres : ["Action"],
      description: formData.description || "",
      descriptionAr: formData.descriptionAr || "",
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
      <div className="relative w-full max-w-3xl bg-ink-surface border border-ink-border rounded-sm shadow-2xl my-8 overflow-hidden">
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
          className="px-6 py-7 space-y-9 max-h-[75vh] overflow-y-auto overscroll-contain text-xs font-mono"
        >
          <div>
            <h3 className="mb-4 pb-2 border-b border-ink-border/50 text-[11px] uppercase tracking-[0.18em] font-bold text-paper flex items-center gap-1.5">
              <span><span className="text-gold/70">01.</span> Identity &amp; Publication</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
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
          </div>

          {/* Category / Genres Selection & Quick Add */}
          <div className="space-y-2.5">
            <h3 className="mb-4 pb-2 border-b border-ink-border/50 text-[11px] uppercase tracking-[0.18em] font-bold text-paper flex items-center gap-1.5">
              <span><span className="text-gold/70">02.</span> Genres &amp; Categories</span>
            </h3>
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

          <div>
            <h3 className="mb-4 pb-2 border-b border-ink-border/50 text-[11px] uppercase tracking-[0.18em] font-bold text-paper flex items-center gap-1.5">
              <span><span className="text-gold/70">03.</span> Editorial Copy</span>
            </h3>
            <div className="space-y-4">
            <div>
            <label className="block text-text-muted mb-1.5">Editorial Quote / Tagline</label>
            <input
              type="text"
              value={formData.quote}
              onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
              placeholder="e.g. In a world where negative human emotions manifest as deadly curses..."
              className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none"
            />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-text-muted mb-1.5 min-h-[20px] flex items-end">
                  Synopsis &amp; Editorial Overview (English)
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Series narrative breakdown..."
                  className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none resize-y"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-text-muted mb-1.5 min-h-[20px] flex items-end gap-1.5">
                  <span>وصف السلسلة بالعربية</span>
                  <span className="text-text-muted/60">(optional)</span>
                </label>
                <textarea
                  rows={4}
                  dir="rtl"
                  value={formData.descriptionAr || ""}
                  onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                  placeholder="وصف السلسلة بالعربية..."
                  className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none font-sans resize-y"
                />
              </div>
            </div>
            </div>
          </div>

          <div>
            <h3 className="mb-4 pb-2 border-b border-ink-border/50 text-[11px] uppercase tracking-[0.18em] font-bold text-paper flex items-center gap-1.5">
              <span><span className="text-gold/70">04.</span> Artwork</span>
            </h3>
            <div className="space-y-5">
            <ImageUploadInput
              label="Banner Artwork"
              value={formData.bannerImage}
              onChange={(url) => setFormData({ ...formData, bannerImage: url })}
              placeholder="https://... or upload local banner from PC (Rec: 1920 × 800 px)"
              aspectRatio="banner"
              recommendedDimensions="1920 × 800 px (16:9 / 2.4:1 Header)"
              helpText="Panoramic header artwork for series page"
            />

            <ImageUploadInput
              label="Featured Cover / Poster"
              value={formData.featuredImage}
              onChange={(url) => setFormData({ ...formData, featuredImage: url })}
              placeholder="https://... or upload local cover from PC (Rec: 800 × 1200 px)"
              aspectRatio="cover"
              recommendedDimensions="800 × 1200 px (3:4 or 2:3 Poster)"
              helpText="Vertical poster for catalog cards"
            />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-3 pt-5 border-t border-ink-border">
            {initialSeries && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2.5 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-sm text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{confirmDelete ? "Confirm Delete?" : "Delete Series"}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
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
  onDelete,
  initialSeries,
}: SeriesFormModalProps) {
  if (!isOpen) return null;

  return (
    <SeriesFormDialog
      key={initialSeries?.slug || "new"}
      initialSeries={initialSeries}
      onClose={onClose}
      onSave={onSave}
      onDelete={onDelete}
    />
  );
}
