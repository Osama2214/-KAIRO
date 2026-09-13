import type { MangaVolume, ProductType, ProductVariant } from "@/data/manga";

/**
 * Figures and posters: one product, several purchasable variants.
 *
 * The storefront payload keeps a figure or poster as a single record with a
 * `variants` list, because that is what the curator edits and the shopper sees.
 * Checkout, though, reserves stock one catalogue row at a time, and that path
 * is atomic, bundle-aware and already proven. So rather than teach it about
 * variants, every variant is written out as its own catalogue row with id
 * `productId~sku`, carrying its own price and stock. The product itself gets
 * no row: it cannot be bought without picking an option.
 *
 * Everything here is pure and shared by the server and the browser, so both
 * sides derive the same rows and the same "from" price.
 */

export const VARIANT_SEPARATOR = "~";
export const MAX_VARIANTS = 20;
/** Matches the id length the reservation path accepts. */
export const MAX_ROW_ID_LENGTH = 64;
const SKU_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function productTypeOf(item: Pick<MangaVolume, "productType"> | null | undefined): ProductType {
  const type = item?.productType;
  return type === "figure" || type === "poster" ? type : "book";
}

export function isMerch(item: Pick<MangaVolume, "productType"> | null | undefined): boolean {
  return productTypeOf(item) !== "book";
}

export function isBook(item: Pick<MangaVolume, "productType"> | null | undefined): boolean {
  return productTypeOf(item) === "book";
}

export function variantRowId(productId: string, sku: string): string {
  return `${productId}${VARIANT_SEPARATOR}${sku}`;
}

/** The product a catalogue row or cart line belongs to. */
export function parentIdOf(rowId: string): string {
  const at = String(rowId).indexOf(VARIANT_SEPARATOR);
  return at === -1 ? String(rowId) : String(rowId).slice(0, at);
}

/** A variant's own catalogue row: the product's fields with the variant's price and stock. */
export function variantRow(product: MangaVolume, variant: ProductVariant): MangaVolume {
  const { variants: _variants, ...rest } = product;
  void _variants;
  return {
    ...rest,
    id: variantRowId(product.id, variant.sku),
    parentId: product.id,
    variantSku: variant.sku,
    variantLabel: variant.label,
    variantLabelAr: variant.labelAr,
    price: Number(variant.price) || 0,
    originalPrice: variant.originalPrice ? Number(variant.originalPrice) : undefined,
    stock: Math.max(0, Math.floor(Number(variant.stock) || 0)),
    // The variant's own photo, when the curator linked one, is what its cart
    // line and order show.
    coverImage: variant.image || product.coverImage,
    // A bundle is a book concept; a variant row never carries one.
    bundleOf: undefined,
  };
}

/**
 * Every row checkout can reserve: books as they are, and one row per variant
 * of each figure or poster.
 */
export function toCatalogRows(items: MangaVolume[]): MangaVolume[] {
  const rows: MangaVolume[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    if (!isMerch(item)) {
      rows.push(item);
      continue;
    }
    for (const variant of item.variants || []) rows.push(variantRow(item, variant));
  }
  return rows;
}

/**
 * The product-level numbers a card shows: the cheapest variant's price (with
 * its list price) and the stock across all variants. Books are returned as-is.
 */
export function withVariantSummary<T extends MangaVolume>(item: T): T {
  if (!isMerch(item)) return item;
  const variants = item.variants || [];
  if (variants.length === 0) return { ...item, stock: 0 };
  const cheapest = variants.reduce((best, v) => (Number(v.price) < Number(best.price) ? v : best), variants[0]);
  return {
    ...item,
    price: Number(cheapest.price) || 0,
    originalPrice: cheapest.originalPrice ? Number(cheapest.originalPrice) : undefined,
    stock: variants.reduce((sum, v) => sum + Math.max(0, Math.floor(Number(v.stock) || 0)), 0),
  };
}

/**
 * Writes authoritative per-row stock back into each product's variants, then
 * refreshes the product summary. Rows missing from the map keep their stored
 * stock.
 */
export function applyVariantStock<T extends MangaVolume>(items: T[], stockById: Map<string, number>): T[] {
  return items.map((item) => {
    if (!isMerch(item)) return item;
    const variants = (item.variants || []).map((variant) => {
      const live = stockById.get(variantRowId(item.id, variant.sku));
      return live === undefined ? variant : { ...variant, stock: live };
    });
    return withVariantSummary({ ...item, variants });
  });
}

/** Looks up any purchasable row — a book or a variant — by its row id. */
export function indexCatalogRows(items: MangaVolume[]): Map<string, MangaVolume> {
  return new Map(toCatalogRows(items).map((row) => [row.id, row]));
}

/**
 * Problems with a single product, as short curator-facing messages. An empty
 * list means the product can be saved.
 */
export function validateProduct(item: MangaVolume): string[] {
  const errors: string[] = [];
  const name = item?.title || item?.id || "A product";
  if (!item?.id || typeof item.id !== "string") return ["A product is missing its id."];
  if (item.id.includes(VARIANT_SEPARATOR)) errors.push(`${name}: the id cannot contain "${VARIANT_SEPARATOR}".`);

  if (!isMerch(item)) {
    if (item.variants && item.variants.length > 0) errors.push(`${name}: only figures and posters have variants.`);
    return errors;
  }

  if (Array.isArray(item.bundleOf) && item.bundleOf.length > 0) errors.push(`${name}: a figure or poster cannot be a box set.`);
  const variants = Array.isArray(item.variants) ? item.variants : [];
  if (variants.length === 0) errors.push(`${name}: add at least one variant.`);
  if (variants.length > MAX_VARIANTS) errors.push(`${name}: no more than ${MAX_VARIANTS} variants.`);

  const seen = new Set<string>();
  for (const variant of variants) {
    const sku = String(variant?.sku || "");
    const label = variant?.label || sku || "a variant";
    if (!SKU_PATTERN.test(sku)) errors.push(`${name}: "${label}" needs a code of lowercase letters, digits and dashes.`);
    if (seen.has(sku)) errors.push(`${name}: the code "${sku}" is used twice.`);
    seen.add(sku);
    if (variantRowId(item.id, sku).length > MAX_ROW_ID_LENGTH) errors.push(`${name}: the id and code "${sku}" are too long together.`);
    if (!String(variant?.label || "").trim()) errors.push(`${name}: every variant needs a name.`);
    const price = Number(variant?.price);
    if (!Number.isFinite(price) || price < 0) errors.push(`${name}: "${label}" has an invalid price.`);
    const original = variant?.originalPrice;
    if (original !== undefined && original !== null && (!Number.isFinite(Number(original)) || Number(original) < 0)) {
      errors.push(`${name}: "${label}" has an invalid before-discount price.`);
    }
    const stock = Number(variant?.stock);
    if (!Number.isInteger(stock) || stock < 0) errors.push(`${name}: "${label}" needs a whole-number stock of zero or more.`);
    if (variant?.image !== undefined && typeof variant.image !== "string") errors.push(`${name}: "${label}" has an invalid photo.`);
  }
  return errors;
}

/**
 * Whole-catalogue checks the server runs before a save: every product valid,
 * ids unique, and box sets built only from books.
 */
export function validateCatalogue(items: MangaVolume[]): string[] {
  const errors: string[] = [];
  const byId = new Map<string, MangaVolume>();
  for (const item of items) {
    const id = String(item?.id || "");
    if (id && byId.has(id)) errors.push(`The id "${id}" is used by more than one product.`);
    if (id) byId.set(id, item);
    errors.push(...validateProduct(item));
  }
  for (const item of items) {
    for (const memberId of item?.bundleOf || []) {
      const member = byId.get(String(memberId));
      if (member && isMerch(member)) {
        errors.push(`${item.title || item.id}: a box set can only contain books.`);
        break;
      }
    }
  }
  return errors;
}
