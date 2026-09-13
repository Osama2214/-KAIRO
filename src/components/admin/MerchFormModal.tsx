"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Plus, Save, Timer, Trash2, X } from "lucide-react";
import type { MangaVolume, MerchDetails, ProductSpec, ProductVariant } from "@/data/manga";
import { CustomNumberInput } from "@/components/ui/CustomNumberInput";
import { ImageUploadInput } from "@/components/ImageUploadInput";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { MAX_VARIANTS, validateProduct, VARIANT_SEPARATOR, withVariantSummary } from "@/lib/variants";
import { PLACEHOLDER_COVER } from "@/config/mediaDefaults";
import { CustomSelect } from "@/components/CustomSelect";
import { buildFranchises, franchiseKey } from "@/lib/franchise";

const OTHER_FRANCHISE = "__other__";

type MerchType = "figure" | "poster";

const inputClass = "w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-sm font-sans";
const labelClass = "block text-text-muted mb-1.5 min-h-[20px] flex items-end";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function Section({ index, title, children }: { index: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-4 pb-2 border-b border-ink-border/50 text-[11px] uppercase tracking-[0.18em] font-bold text-paper">
        <span className="text-gold/70">{index}.</span> {title}
      </h3>
      {children}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  rtl,
  required,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  rtl?: boolean;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col justify-end">
      <label className={labelClass}>{label}</label>
      <input
        type="text"
        dir={rtl ? "rtl" : undefined}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={inputClass}
      />
    </div>
  );
}

/** ISO instant <-> datetime-local value, in local time. */
function toLocalInputValue(iso: string | undefined): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  return new Date(ms - new Date(ms).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function fromLocalInputValue(value: string): string | undefined {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined;
}

function MerchFormDialog({
  initialProduct,
  initialType,
  onClose,
  onSave,
}: {
  initialProduct?: MangaVolume | null;
  initialType: MerchType;
  onClose: () => void;
  onSave: (product: MangaVolume) => void;
}) {
  useModalScrollLock(true);
  const volumes = useStorefrontStore((state) => state.volumes);
  const isEdit = Boolean(initialProduct);

  const [type, setType] = useState<MerchType>(
    initialProduct?.productType === "figure" || initialProduct?.productType === "poster" ? initialProduct.productType : initialType
  );
  const [title, setTitle] = useState(initialProduct?.title || "");
  const [customId, setCustomId] = useState(initialProduct?.id || "");
  const [merch, setMerch] = useState<MerchDetails>(initialProduct?.merch || {});
  const [variants, setVariants] = useState<ProductVariant[]>(
    initialProduct?.variants?.length ? initialProduct.variants : [{ sku: "", label: "", price: 0, stock: 0 }]
  );
  const [coverImage, setCoverImage] = useState(initialProduct?.coverImage || PLACEHOLDER_COVER);
  const [gallery, setGallery] = useState<string[]>(initialProduct?.gallery || []);
  const [synopsis, setSynopsis] = useState(initialProduct?.synopsis || "");
  const [synopsisAr, setSynopsisAr] = useState(initialProduct?.synopsisAr || "");
  const [promo, setPromo] = useState(initialProduct?.promo);
  const [isFeatured, setIsFeatured] = useState(Boolean(initialProduct?.isFeatured));
  const [comingSoon, setComingSoon] = useState(Boolean(initialProduct?.comingSoon));
  const [rating, setRating] = useState<number>(initialProduct?.rating ?? 0);
  const [reviewCount, setReviewCount] = useState<number>(initialProduct?.reviewCount ?? 0);
  const [errors, setErrors] = useState<string[]>([]);

  const setMerchField = <K extends keyof MerchDetails>(key: K, value: MerchDetails[K]) =>
    setMerch((prev) => ({ ...prev, [key]: value }));

  // The franchise is picked from what the store already sells — every series,
  // plus anime that so far only have figures/posters — so a product always
  // matches its series by name. "Other" allows a brand-new anime.
  const seriesList = useStorefrontStore((state) => state.series);
  const franchises = useMemo(() => {
    const list = buildFranchises(volumes, seriesList);
    const known = new Set(list.map((f) => f.key));
    // Series with nothing in stock yet are still valid choices.
    for (const s of seriesList) {
      const key = franchiseKey(s.title);
      if (key && !known.has(key)) list.push({ key, name: s.title, image: "", seriesSlug: s.slug, bookCount: 0, merchCount: 0, href: "" });
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [volumes, seriesList]);
  const franchiseOptions = useMemo(
    () => [
      ...franchises.map((f) => ({ value: f.key, label: f.name, badge: f.seriesSlug ? "SERIES" : "SHOP" })),
      { value: OTHER_FRANCHISE, label: "Other — new anime…" },
    ],
    [franchises]
  );
  const [otherMode, setOtherMode] = useState(false);
  const currentKey = franchiseKey(merch.franchise);
  const matched = franchises.find((f) => f.key === currentKey);
  const franchiseChoice = otherMode || (!matched && currentKey) ? OTHER_FRANCHISE : matched?.key || "";
  const linkedSeries = matched?.seriesSlug ? seriesList.find((s) => s.slug === matched.seriesSlug) : undefined;
  const chooseFranchise = (value: string) => {
    if (value === OTHER_FRANCHISE) {
      setOtherMode(true);
      if (matched) setMerch((prev) => ({ ...prev, franchise: "", franchiseAr: "" }));
      return;
    }
    const picked = franchises.find((f) => f.key === value);
    if (!picked) return;
    setOtherMode(false);
    setMerch((prev) => ({
      ...prev,
      franchise: picked.name,
      // Keep a hand-typed Arabic name for the same anime; otherwise reuse the
      // one other products of this anime already use.
      franchiseAr: franchiseKey(prev.franchise) === picked.key && prev.franchiseAr ? prev.franchiseAr : picked.nameAr || "",
    }));
  };

  // The id is fixed once saved: catalogue rows, carts and orders refer to it.
  // Used only when the name has no latin letters to build an id from.
  const [fallbackSuffix] = useState(() => Math.random().toString(36).slice(2, 8));
  const productId = useMemo(() => {
    if (isEdit) return initialProduct!.id;
    const base = slugify(customId || title) || `${type}-${fallbackSuffix}`;
    const prefixed = base.startsWith(`${type}-`) ? base : `${type}-${base}`;
    let candidate = prefixed;
    let n = 2;
    while (volumes.some((v) => v.id === candidate)) candidate = `${prefixed}-${n++}`;
    return candidate;
  }, [isEdit, initialProduct, customId, title, type, volumes, fallbackSuffix]);

  const updateVariant = (index: number, patch: Partial<ProductVariant>) =>
    setVariants((prev) =>
      prev.map((variant, i) => {
        if (i !== index) return variant;
        const next = { ...variant, ...patch };
        // A new variant's code follows its name until it has been saved once.
        const saved = initialProduct?.variants?.some((v) => v.sku === variant.sku && variant.sku);
        if (patch.label !== undefined && !saved) {
          // A name with no latin letters (e.g. Arabic) still needs a code, so
          // fall back to a numbered one the admin can change below.
          let sku = slugify(patch.label) || variant.sku || `option-${index + 1}`;
          const taken = new Set(prev.filter((_, j) => j !== index).map((v) => v.sku));
          for (let n = 2; taken.has(sku); n++) sku = `${slugify(patch.label) || "option"}-${n}`;
          next.sku = sku;
        }
        return next;
      })
    );
  const moveVariant = (index: number, delta: number) =>
    setVariants((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  // The photos an option can be linked to: the main photo, then the extras.
  const photos = [coverImage, ...gallery].map((src) => (src || "").trim()).filter(Boolean);

  const specs = merch.specs || [];
  const updateSpec = (index: number, patch: Partial<ProductSpec>) =>
    setMerchField("specs", specs.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const summary = withVariantSummary({ productType: type, variants } as MangaVolume);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Only the fields that belong to this type are stored.
    const cleanMerch: MerchDetails = {
      franchise: merch.franchise?.trim() || undefined,
      franchiseAr: merch.franchiseAr?.trim() || undefined,
      ...(type === "figure"
        ? {
            manufacturer: merch.manufacturer?.trim() || undefined,
            character: merch.character?.trim() || undefined,
            characterAr: merch.characterAr?.trim() || undefined,
            heightCm: merch.heightCm && merch.heightCm > 0 ? Number(merch.heightCm) : undefined,
            material: merch.material?.trim() || undefined,
            materialAr: merch.materialAr?.trim() || undefined,
            scale: merch.scale?.trim() || undefined,
          }
        : {
            paperType: merch.paperType?.trim() || undefined,
            paperTypeAr: merch.paperTypeAr?.trim() || undefined,
            finish: merch.finish?.trim() || undefined,
            finishAr: merch.finishAr?.trim() || undefined,
          }),
      specs: specs.filter((s) => s.label.trim() && s.value.trim()),
    };

    const cleanVariants = variants.map((v) => ({
      sku: v.sku.trim(),
      label: v.label.trim(),
      labelAr: v.labelAr?.trim() || undefined,
      price: Number(v.price),
      originalPrice: v.originalPrice ? Number(v.originalPrice) : undefined,
      stock: Number(v.stock),
      // Only keep a link to a photo that is still on the product.
      image: v.image && photos.includes(v.image) ? v.image : undefined,
    }));

    const product: MangaVolume = withVariantSummary({
      ...(initialProduct || {}),
      id: productId,
      productType: type,
      format: type === "figure" ? "Figure" : "Poster",
      title: title.trim(),
      merch: cleanMerch,
      variants: cleanVariants,
      coverImage: coverImage || PLACEHOLDER_COVER,
      gallery: gallery.map((g) => g.trim()).filter(Boolean),
      synopsis: synopsis.trim(),
      synopsisAr: synopsisAr.trim(),
      promo: promo?.percent && promo?.endsAt ? { ...promo, percent: Number(promo.percent) } : undefined,
      isFeatured,
      comingSoon,
      isTrending: false,
      isNewRelease: false,
      rating: Math.max(0, Math.min(5, Number(rating) || 0)),
      reviewCount: Math.max(0, Math.floor(Number(reviewCount) || 0)),
      // Book-only fields, kept empty so every surface that reads them is safe.
      volumeNumber: 0,
      seriesSlug: "",
      seriesTitle: "",
      japaneseTitle: "",
      author: "",
      artist: "",
      pages: 0,
      isbn: "",
      genre: [],
      previewPages: [],
      bundleOf: undefined,
      publishDate: initialProduct?.publishDate || new Date().toISOString().split("T")[0],
      price: 0,
      stock: 0,
    });

    const problems = [
      ...(!product.title ? ["Give the product a name."] : []),
      ...validateProduct(product),
    ];
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }
    onSave(product);
    onClose();
  };

  return (
    <div data-lenis-prevent role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto overscroll-contain">
      <div className="relative w-full max-w-3xl bg-ink-surface border border-ink-border rounded-sm shadow-2xl my-8 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink">
          <h2 className="font-cinzel text-lg font-bold text-paper">
            {isEdit ? `Edit ${type === "figure" ? "Figure" : "Poster"}: ${initialProduct!.title}` : `Add New ${type === "figure" ? "Figure" : "Poster"}`}
          </h2>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-paper hover:bg-ink-elevated rounded-sm transition-colors cursor-pointer" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form data-lenis-prevent onSubmit={handleSubmit} className="px-6 py-7 space-y-9 max-h-[75vh] overflow-y-auto overscroll-contain text-xs font-mono">
          {errors.length > 0 && (
            <div role="alert" className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xs space-y-1">
              {errors.map((error, i) => (
                <p key={i} className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </p>
              ))}
            </div>
          )}

          <Section index="01" title="Product Type & Identity">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-4">
              <div className="md:col-span-4 flex flex-col justify-end">
                <label className={labelClass}>Type *</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["figure", "poster"] as MerchType[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      disabled={isEdit}
                      onClick={() => setType(option)}
                      className={`h-10 rounded-sm border text-[11px] font-bold uppercase tracking-wider transition-colors ${
                        type === option ? "bg-gold text-ink border-gold" : "bg-ink text-text-muted border-ink-border hover:text-paper"
                      } ${isEdit ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
                    >
                      {option === "figure" ? "Figure" : "Poster"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-8">
                <TextField label="Product Name *" value={title} onChange={setTitle} placeholder={type === "figure" ? "e.g. Satoru Gojo — Jujutsu Kaisen" : "e.g. Naruto Uzumaki Sage Mode Poster"} required />
              </div>
              <div className="md:col-span-6">
                <label className={labelClass}>Anime / Series</label>
                <CustomSelect
                  options={franchiseOptions}
                  value={franchiseChoice}
                  onChange={chooseFranchise}
                  placeholder="Choose an anime…"
                  fullWidth
                  buttonClassName="h-10"
                />
                {franchiseChoice === OTHER_FRANCHISE && (
                  <input
                    type="text"
                    value={merch.franchise || ""}
                    onChange={(e) => setMerchField("franchise", e.target.value)}
                    placeholder="New anime name (English), e.g. Chainsaw Man"
                    className={`${inputClass} mt-2`}
                    autoFocus
                  />
                )}
                {linkedSeries && (
                  <p className="mt-1.5 text-[10px] font-mono text-text-muted">
                    Shown on the {linkedSeries.title} series page and its Shop by Franchise card.
                  </p>
                )}
              </div>
              <div className="md:col-span-6">
                <TextField label="الأنمي (عربي)" value={merch.franchiseAr} onChange={(v) => setMerchField("franchiseAr", v)} placeholder="مثال: ناروتو" rtl />
              </div>
              <div className="md:col-span-12">
                <label className={labelClass}>Product ID {isEdit ? "(fixed)" : "(optional — generated from the name)"}</label>
                <input
                  type="text"
                  value={isEdit ? productId : customId}
                  disabled={isEdit}
                  onChange={(e) => setCustomId(e.target.value.replace(new RegExp(VARIANT_SEPARATOR, "g"), ""))}
                  placeholder={productId}
                  className={`${inputClass} font-mono text-gold ${isEdit ? "opacity-70 cursor-not-allowed" : ""}`}
                />
                <p className="mt-1 text-[10px] text-text-muted">Page link: /shop/{productId}</p>
              </div>
            </div>
          </Section>

          <Section index="02" title="Specifications">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
              {type === "figure" ? (
                <>
                  <TextField label="Character (English)" value={merch.character} onChange={(v) => setMerchField("character", v)} placeholder="e.g. Satoru Gojo" />
                  <TextField label="الشخصية (عربي)" value={merch.characterAr} onChange={(v) => setMerchField("characterAr", v)} placeholder="مثال: ساتورو غوجو" rtl />
                  <TextField label="Manufacturer" value={merch.manufacturer} onChange={(v) => setMerchField("manufacturer", v)} placeholder="e.g. Banpresto" />
                  <div className="flex flex-col justify-end">
                    <label className={labelClass}>Height (cm)</label>
                    <CustomNumberInput
                      min={0}
                      step="any"
                      className="h-10"
                      value={merch.heightCm ?? ""}
                      onChange={(e) => setMerchField("heightCm", e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="e.g. 18"
                    />
                  </div>
                  <TextField label="Material (English)" value={merch.material} onChange={(v) => setMerchField("material", v)} placeholder="e.g. PVC / ABS" />
                  <TextField label="الخامة (عربي)" value={merch.materialAr} onChange={(v) => setMerchField("materialAr", v)} placeholder="مثال: PVC" rtl />
                  <TextField label="Scale" value={merch.scale} onChange={(v) => setMerchField("scale", v)} placeholder="e.g. 1/7 or Non-scale" />
                </>
              ) : (
                <>
                  <TextField label="Paper Type (English)" value={merch.paperType} onChange={(v) => setMerchField("paperType", v)} placeholder="e.g. 250gsm art paper" />
                  <TextField label="نوع الورق (عربي)" value={merch.paperTypeAr} onChange={(v) => setMerchField("paperTypeAr", v)} placeholder="مثال: ورق آرت 250 جم" rtl />
                  <TextField label="Finish (English)" value={merch.finish} onChange={(v) => setMerchField("finish", v)} placeholder="e.g. Matte" />
                  <TextField label="التشطيب (عربي)" value={merch.finishAr} onChange={(v) => setMerchField("finishAr", v)} placeholder="مثال: مطفي" rtl />
                </>
              )}
            </div>

            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Extra specs (optional)</span>
                <button
                  type="button"
                  onClick={() => setMerchField("specs", [...specs, { label: "", value: "" }])}
                  className="flex items-center gap-1 text-[11px] text-text-muted hover:text-gold uppercase tracking-wider cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add spec
                </button>
              </div>
              {specs.map((spec, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                  <input className={`${inputClass} col-span-3`} value={spec.label} onChange={(e) => updateSpec(index, { label: e.target.value })} placeholder="Label (e.g. Includes)" />
                  <input className={`${inputClass} col-span-3`} value={spec.value} onChange={(e) => updateSpec(index, { value: e.target.value })} placeholder="Value (e.g. Stand)" />
                  <input dir="rtl" className={`${inputClass} col-span-3`} value={spec.labelAr || ""} onChange={(e) => updateSpec(index, { labelAr: e.target.value })} placeholder="الاسم" />
                  <input dir="rtl" className={`${inputClass} col-span-2`} value={spec.valueAr || ""} onChange={(e) => updateSpec(index, { valueAr: e.target.value })} placeholder="القيمة" />
                  <button
                    type="button"
                    onClick={() => setMerchField("specs", specs.filter((_, i) => i !== index))}
                    className="col-span-1 h-10 flex items-center justify-center text-text-muted hover:text-vermilion cursor-pointer"
                    aria-label="Remove spec"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </Section>

          <Section index="03" title={type === "poster" ? "Sizes, Prices & Stock" : "Editions, Prices & Stock"}>
            <p className="mb-3 text-[10px] text-text-muted leading-relaxed">
              Each {type === "poster" ? "size" : "edition"} is sold on its own, with its own price and stock. Shoppers pick one on the product page.
            </p>
            <div className="space-y-2">
              <div className="hidden md:grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-text-muted px-1">
                <span className="col-span-2">Name *</span>
                <span className="col-span-2">الاسم</span>
                <span className="col-span-2">Price *</span>
                <span className="col-span-2">Before discount</span>
                <span className="col-span-2">Stock *</span>
                <span className="col-span-2 text-end">Order</span>
              </div>
              {variants.map((variant, index) => (
                <div key={index} className="grid grid-cols-2 md:grid-cols-12 gap-2 items-center p-2 md:p-0 border md:border-0 border-ink-border rounded-sm">
                  <input className={`${inputClass} md:col-span-2`} value={variant.label} onChange={(e) => updateVariant(index, { label: e.target.value })} placeholder={type === "poster" ? "A3" : "Standard"} />
                  <input dir="rtl" className={`${inputClass} md:col-span-2`} value={variant.labelAr || ""} onChange={(e) => updateVariant(index, { labelAr: e.target.value })} placeholder={type === "poster" ? "A3" : "عادي"} />
                  <div className="md:col-span-2">
                    <CustomNumberInput step="any" min={0} className="h-10" inputClassName="text-gold font-bold" value={variant.price || ""} onChange={(e) => updateVariant(index, { price: parseFloat(e.target.value) || 0 })} placeholder="EGP" />
                  </div>
                  <div className="md:col-span-2">
                    <CustomNumberInput step="any" min={0} className="h-10" inputClassName="text-text-muted" value={variant.originalPrice ?? ""} onChange={(e) => updateVariant(index, { originalPrice: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="EGP" />
                  </div>
                  <div className="md:col-span-2">
                    <CustomNumberInput min={0} step={1} className="h-10" value={variant.stock} onChange={(e) => updateVariant(index, { stock: parseInt(e.target.value, 10) || 0 })} />
                  </div>
                  <div className="md:col-span-2 flex items-center justify-end gap-1">
                    <button type="button" onClick={() => moveVariant(index, -1)} disabled={index === 0} className="p-2 text-text-muted hover:text-paper disabled:opacity-30 cursor-pointer" aria-label="Move up">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => moveVariant(index, 1)} disabled={index === variants.length - 1} className="p-2 text-text-muted hover:text-paper disabled:opacity-30 cursor-pointer" aria-label="Move down">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => setVariants(variants.filter((_, i) => i !== index))} disabled={variants.length === 1} className="p-2 text-text-muted hover:text-vermilion disabled:opacity-30 cursor-pointer" aria-label="Remove">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <label className="col-span-2 md:col-span-12 flex items-center gap-2 text-[10px] text-text-muted/70 -mt-1 px-1">
                    <span>code:</span>
                    {initialProduct?.variants?.some((v) => v.sku === variant.sku && variant.sku) ? (
                      // Saved codes are fixed: carts and orders refer to them.
                      <span className="text-text-muted">{variant.sku}</span>
                    ) : (
                      <input
                        value={variant.sku}
                        onChange={(e) =>
                          setVariants((prev) =>
                            prev.map((v, i) => (i === index ? { ...v, sku: slugify(e.target.value) || e.target.value.toLowerCase() } : v))
                          )
                        }
                        placeholder="e.g. a3"
                        className="h-6 w-32 bg-ink border border-ink-border text-paper px-2 rounded-xs font-mono text-[10px] focus:border-gold outline-none"
                      />
                    )}
                  </label>
                  {/* Link this option to one of the product's photos. */}
                  <div className="col-span-2 md:col-span-12 flex flex-wrap items-center gap-1.5 px-1 pb-1">
                    <span className="text-[10px] text-text-muted/70 me-1">photo:</span>
                    <button
                      type="button"
                      onClick={() => setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, image: undefined } : v)))}
                      className={`h-9 px-2 rounded-xs border text-[10px] cursor-pointer ${!variant.image ? "border-gold text-gold" : "border-ink-border text-text-muted hover:text-paper"}`}
                    >
                      Default
                    </button>
                    {photos.map((src, photoIndex) => (
                      <button
                        key={`${src}-${photoIndex}`}
                        type="button"
                        onClick={() => setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, image: src } : v)))}
                        className={`w-9 h-9 rounded-xs overflow-hidden border-2 cursor-pointer ${variant.image === src ? "border-gold" : "border-ink-border opacity-70 hover:opacity-100"}`}
                        title={photoIndex === 0 ? "Main photo" : `Extra photo ${photoIndex}`}
                        aria-label={photoIndex === 0 ? "Main photo" : `Extra photo ${photoIndex}`}
                      >
                        <img src={src} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                    {photos.length <= 1 && (
                      <span className="text-[10px] text-text-muted/60">Add extra photos below to link one here.</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                disabled={variants.length >= MAX_VARIANTS}
                onClick={() => setVariants([...variants, { sku: "", label: "", price: variants[variants.length - 1]?.price || 0, stock: 0 }])}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-ink border border-ink-border hover:border-gold text-text-muted hover:text-gold rounded-sm uppercase tracking-wider cursor-pointer disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" /> Add {type === "poster" ? "size" : "edition"}
              </button>
              <span className="text-[11px] text-gold">
                From {summary.price.toFixed(2)} EGP · {summary.stock} units in total
              </span>
            </div>
          </Section>

          <Section index="04" title="Limited-Time Offer">
            <div className="p-4 bg-ink/50 border border-ink-border/70 rounded-sm space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-text-muted">
                  <Timer strokeWidth={1.6} className="w-3.5 h-3.5 text-vermilion/80" /> Applies to every {type === "poster" ? "size" : "edition"}
                </span>
                {promo?.endsAt && (
                  <button type="button" onClick={() => setPromo(undefined)} className="text-[10px] uppercase tracking-wider text-text-muted hover:text-vermilion cursor-pointer">
                    Remove offer
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col justify-end">
                  <label className="block text-text-muted mb-1.5">Discount %</label>
                  <CustomNumberInput
                    min={0}
                    max={90}
                    step={1}
                    className="h-10"
                    inputClassName="text-vermilion font-bold"
                    value={promo?.percent ?? ""}
                    onChange={(e) => {
                      const percent = parseInt(e.target.value, 10);
                      setPromo(Number.isFinite(percent) && percent > 0 ? { ...(promo || { endsAt: "" }), percent } : undefined);
                    }}
                    placeholder="e.g. 20"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="block text-text-muted mb-1.5">Starts (optional)</label>
                  <input type="datetime-local" value={toLocalInputValue(promo?.startsAt)} onChange={(e) => setPromo({ ...(promo || { percent: 0, endsAt: "" }), startsAt: fromLocalInputValue(e.target.value) })} className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs" />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="block text-text-muted mb-1.5">Ends *</label>
                  <input type="datetime-local" value={toLocalInputValue(promo?.endsAt)} onChange={(e) => setPromo({ ...(promo || { percent: 0 }), endsAt: fromLocalInputValue(e.target.value) || "" })} className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-xs" />
                </div>
              </div>
            </div>
          </Section>

          <Section index="05" title="Photos">
            <div className="space-y-5">
              <ImageUploadInput
                label="Main Photo"
                value={coverImage}
                onChange={setCoverImage}
                placeholder="https://... or upload from your PC (Rec: 1000 × 1333 px)"
                required
                aspectRatio="cover"
                recommendedDimensions="1000 × 1333 px (3:4 portrait)"
                helpText="Shown on cards and first on the product page"
              />
              {gallery.map((src, index) => (
                <div key={index} className="relative">
                  <ImageUploadInput
                    label={`Extra Photo ${index + 1}`}
                    value={src}
                    onChange={(url) => setGallery(gallery.map((g, i) => (i === index ? url : g)))}
                    placeholder="https://... or upload from your PC"
                    aspectRatio="cover"
                    recommendedDimensions="1000 × 1333 px (3:4 portrait)"
                  />
                  <button
                    type="button"
                    onClick={() => setGallery(gallery.filter((_, i) => i !== index))}
                    className="absolute top-0 end-0 text-[10px] uppercase tracking-wider text-text-muted hover:text-vermilion cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={gallery.length >= 8}
                onClick={() => setGallery([...gallery, ""])}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-ink border border-ink-border hover:border-gold text-text-muted hover:text-gold rounded-sm uppercase tracking-wider cursor-pointer disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" /> Add photo
              </button>
            </div>
          </Section>

          <Section index="06" title="Description">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className={labelClass}>Description (English)</label>
                <textarea rows={4} value={synopsis} onChange={(e) => setSynopsis(e.target.value)} className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none resize-y" />
              </div>
              <div className="flex flex-col">
                <label className={labelClass}>الوصف بالعربية</label>
                <textarea rows={4} dir="rtl" value={synopsisAr} onChange={(e) => setSynopsisAr(e.target.value)} className="w-full bg-ink border border-ink-border text-paper px-3 py-2 rounded-sm focus:border-gold outline-none font-sans resize-y" />
              </div>
            </div>
          </Section>

          <Section index="07" title="Visibility & Rating">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex items-center gap-2.5 p-3 border border-gold/30 rounded-sm bg-gold/5 cursor-pointer hover:border-gold/60 md:col-span-1">
                <input type="checkbox" checked={comingSoon} onChange={(e) => setComingSoon(e.target.checked)} className="accent-gold w-4 h-4 cursor-pointer" />
                <span className="text-paper">Coming soon — visible, wishlist only</span>
              </label>
              <label className="flex items-center gap-2.5 p-3 border border-ink-border rounded-sm bg-ink cursor-pointer hover:border-gold/50 md:col-span-1">
                <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="accent-gold w-4 h-4 cursor-pointer" />
                <span className="text-paper">Featured (shown first)</span>
              </label>
              <div className="flex flex-col justify-end">
                <label className="block text-text-muted mb-1.5">Rating (0–5)</label>
                <CustomNumberInput step={0.1} min={0} max={5} className="h-10" value={rating} onChange={(e) => setRating(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="flex flex-col justify-end">
                <label className="block text-text-muted mb-1.5">Review count</label>
                <CustomNumberInput step={1} min={0} className="h-10" value={reviewCount} onChange={(e) => setReviewCount(parseInt(e.target.value, 10) || 0)} />
              </div>
            </div>
          </Section>

          <div className="flex items-center justify-end gap-3 pt-5 border-t border-ink-border">
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-ink-border text-text-muted hover:text-paper rounded-sm uppercase tracking-wider transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-gold hover:bg-gold-muted text-ink font-bold rounded-sm uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-gold/15">
              <Save className="w-4 h-4" />
              <span>Save {type === "figure" ? "Figure" : "Poster"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function MerchFormModal({
  isOpen,
  onClose,
  onSave,
  initialProduct,
  initialType = "figure",
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: MangaVolume) => void;
  initialProduct?: MangaVolume | null;
  initialType?: MerchType;
}) {
  if (!isOpen) return null;
  return (
    <MerchFormDialog
      key={initialProduct?.id || `new-${initialType}`}
      initialProduct={initialProduct}
      initialType={initialType}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
