"use client";

import React, { useState } from "react";
import { X, Save, Trash2, AlertTriangle, ArrowUpRight } from "lucide-react";
import { GenreInfo } from "@/data/manga";
import { ImageUploadInput } from "@/components/ImageUploadInput";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";
import { PLACEHOLDER_COVER } from "@/config/mediaDefaults";

interface GenreFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (genre: GenreInfo) => void;
  onDelete?: (id: string) => void;
  initialGenre?: GenreInfo | null;
}

export function GenreFormModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialGenre,
}: GenreFormModalProps) {
  useModalScrollLock(isOpen);

  const [formData, setFormData] = useState<GenreInfo>(() => {
    if (initialGenre) return { ...initialGenre };
    return {
      id: "",
      name: "",
      nameAr: "",
      japanese: "",
      description: "",
      descriptionAr: "",
      coverImage: PLACEHOLDER_COVER,
      popularTitle: "",
    };
  });

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleNameChange = (name: string) => {
    if (!initialGenre) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      setFormData((prev) => ({
        ...prev,
        name,
        id: slug,
      }));
    } else {
      setFormData((prev) => ({ ...prev, name }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg("Category name is required.");
      return;
    }

    const finalId = formData.id.trim() || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    onSave({
      ...formData,
      id: finalId,
      name: formData.name.trim(),
      nameAr: formData.nameAr?.trim() || undefined,
      japanese: formData.japanese.trim() || formData.name.trim(),
      descriptionAr: formData.descriptionAr?.trim() || undefined,
      popularTitle: formData.popularTitle.trim() || "Archival Selection",
      coverImage: formData.coverImage.trim() || PLACEHOLDER_COVER,
      description: formData.description.trim() || "Curated manga titles within this canonical category.",
    });
    onClose();
  };

  const handleDelete = () => {
    if (!initialGenre || !onDelete) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(initialGenre.id);
    onClose();
  };

  return (
    <div
      data-lenis-prevent
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-ink/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto overscroll-contain"
    >
      <div className="w-full max-w-2xl bg-ink border border-ink-border rounded-sm shadow-2xl overflow-hidden font-sans my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink-surface/50">
          <h3 className="font-cinzel text-base font-bold text-paper uppercase tracking-wider">
            {initialGenre ? `Edit Category: ${initialGenre.name}` : "Add New Category"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-paper p-1 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto overscroll-contain text-xs font-mono">
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-paper uppercase tracking-wider">
                Category Name (English) *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Cyberpunk, Psychological, Seinen"
                className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-paper uppercase tracking-wider">
                Category Name (Arabic)
              </label>
              <input
                type="text"
                dir="rtl"
                value={formData.nameAr ?? ""}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                placeholder="مثال: سايبربانك، نفسي، شونين"
                className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none font-sans"
              />
              <span className="text-[10px] text-text-muted">
                Optional; falls back to English.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-paper uppercase tracking-wider">
                Japanese Script / Kanji
              </label>
              <input
                type="text"
                value={formData.japanese}
                onChange={(e) => setFormData({ ...formData, japanese: e.target.value })}
                placeholder="e.g. サイバーパンク, 青年"
                className="w-full bg-ink-surface border border-ink-border text-gold px-3 py-2 text-sm rounded-xs focus:border-gold outline-none font-serif"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-paper uppercase tracking-wider">
                Category ID / URL Slug
              </label>
              <input
                type="text"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                placeholder="e.g. cyberpunk"
                className="w-full bg-ink-surface border border-ink-border text-paper-muted px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
              />
              <span className="text-[10px] text-text-muted">
                Used in links: /manga?genre={formData.id || "slug"}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-paper uppercase tracking-wider">
                Flagship / Canonical Series Title
              </label>
              <input
                type="text"
                value={formData.popularTitle}
                onChange={(e) => setFormData({ ...formData, popularTitle: e.target.value })}
                placeholder="e.g. Akira, Ghost in the Shell"
                className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <ImageUploadInput
                label="Category Bento Cover Artwork"
                value={formData.coverImage}
                onChange={(url) => setFormData({ ...formData, coverImage: url })}
                placeholder="https://... or upload local category image (Rec: 1200 × 800 px)"
                aspectRatio="banner"
                recommendedDimensions="1200 × 800 px (3:2 / 16:9 Bento Card)"
                helpText="Background image used on the homepage Genre Bento Grid"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-paper uppercase tracking-wider">
                Curator Description (English)
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief summary explaining this category's literary focus..."
                className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none resize-none font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-paper uppercase tracking-wider">
                Curator Description (Arabic)
              </label>
              <textarea
                rows={3}
                dir="rtl"
                value={formData.descriptionAr ?? ""}
                onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                placeholder="وصف مختصر يشرح طابع هذا التصنيف..."
                className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none resize-none font-sans"
              />
              <span className="text-[10px] text-text-muted">
                Optional; falls back to English.
              </span>
            </div>
          </div>

          {/* Live Bento Preview Card */}
          <div className="space-y-2 pt-2 border-t border-ink-border/50">
            <span className="text-[10px] font-bold text-gold uppercase tracking-wider block">
              Live Card Preview
            </span>
            <div className="relative h-44 rounded-sm overflow-hidden border border-ink-border bg-ink-surface flex flex-col justify-end p-5">
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={formData.coverImage}
                  alt={formData.name || "Preview"}
                  className="w-full h-full object-cover opacity-40"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      PLACEHOLDER_COVER;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-transparent" />
              </div>

              <div className="absolute top-3.5 right-3.5 z-20 w-7 h-7 rounded-sm bg-ink/80 border border-ink-border flex items-center justify-center text-gold">
                <ArrowUpRight strokeWidth={1.5} className="w-3.5 h-3.5" />
              </div>

              <div className="absolute top-2.5 right-12 font-serif text-4xl font-bold text-white/[0.08] pointer-events-none select-none">
                {formData.japanese || "ジャンル"}
              </div>

              <div className="relative z-10 space-y-1">
                <span className="text-[9px] font-mono tracking-[0.2em] text-gold uppercase block">
                  {formData.japanese || "JAPANESE SCRIPT"}
                </span>
                <h4 className="text-base font-bold text-paper tracking-wider uppercase font-sans">
                  {formData.name || "CATEGORY TITLE"}
                </h4>
                <p className="text-[11px] text-text-muted line-clamp-1">
                  {formData.description || "Category narrative description..."}
                </p>
                <div className="text-[9px] text-paper-muted">
                  <span className="text-gold">CANONICAL: </span>
                  <span>{formData.popularTitle || "Featured Title"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-ink-border">
            {initialGenre && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-xs cursor-pointer transition-all ${
                  confirmDelete
                    ? "bg-vermilion text-paper hover:bg-vermilion-light"
                    : "bg-ink-surface text-vermilion border border-vermilion/40 hover:bg-vermilion/10"
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{confirmDelete ? "Click again to Confirm Delete" : "Delete Category"}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-text-muted hover:text-paper cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 bg-gold hover:bg-gold-light text-ink text-xs font-mono font-bold uppercase tracking-wider rounded-xs cursor-pointer shadow-md transition-transform hover:scale-105"
              >
                <Save className="w-4 h-4" />
                <span>Save Category</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
