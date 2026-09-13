import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Label for the badge that sits on a product card.
 *
 * Numbered volumes read "VOL. 07"; a box set has no volume number of its own,
 * so it says what it is instead of claiming a position in the run.
 */
export function volumeBadgeLabel(
  volume: { volumeNumber: number; format?: string; productType?: string },
  isArabic: boolean
): string {
  if (volume.productType === "figure") return isArabic ? "فيجر" : "FIGURE";
  if (volume.productType === "poster") return isArabic ? "بوستر" : "POSTER";
  if (volume.format === "Box Set") return isArabic ? "طقم كامل" : "BOX SET";
  if (volume.format === "Deluxe Edition") return isArabic ? "فاخر" : "DELUXE";
  const number = volume.volumeNumber < 10 ? `0${volume.volumeNumber}` : String(volume.volumeNumber);
  return `${isArabic ? "المجلد" : "VOL."} ${number}`;
}

/**
 * The fields a cart line, order line or wishlist entry carries — enough to
 * describe it without the catalogue.
 */
export interface LineLike {
  id?: string;
  volumeId?: string;
  title?: string;
  seriesTitle?: string;
  volumeNumber?: number | string;
  format?: string;
  productType?: string;
  parentId?: string;
  variantLabel?: string;
  variantLabelAr?: string;
}

function isMerchLine(line: LineLike): boolean {
  return (
    line.productType === "figure" ||
    line.productType === "poster" ||
    Boolean(line.parentId || line.variantLabel) ||
    // Variant row ids are "productId~sku"; no book id contains "~".
    String(line.volumeId || line.id || "").includes("~")
  );
}

/**
 * How a purchased item is named everywhere it is listed — cart, checkout,
 * order history, invoices, emails.
 *
 * Books keep "Series — Vol. N"; a figure or poster has no series or volume
 * number, so it reads "Title — A3" with its type in place of the format.
 */
export function describeLine(line: LineLike, isArabic = false): { eyebrow: string; title: string; detail: string } {
  if (isMerchLine(line)) {
    const variant = (isArabic && line.variantLabelAr) || line.variantLabel || "";
    const type = line.productType === "figure" ? (isArabic ? "فيجر" : "Figure") : (isArabic ? "بوستر" : "Poster");
    return {
      eyebrow: type,
      title: variant ? `${line.title || ""} — ${variant}` : line.title || "",
      detail: type,
    };
  }
  // Books are named exactly as they were before figures and posters existed.
  return {
    eyebrow: line.seriesTitle || "",
    title: `${isArabic ? "المجلد" : "Vol."} ${line.volumeNumber ?? ""} — ${line.title || ""}`,
    detail: line.format || "",
  };
}

/** Where a catalogue product's page lives. */
export function productHref(product: { id: string; productType?: string }): string {
  return product.productType === "figure" || product.productType === "poster" ? `/shop/${product.id}` : `/manga/${product.id}`;
}

/** Where a purchased item's product page lives. */
export function lineHref(line: LineLike): string {
  if (isMerchLine(line)) {
    const id = line.parentId || String(line.volumeId || line.id || "").split("~")[0];
    return `/shop/${id}`;
  }
  return `/manga/${line.volumeId || line.id}`;
}

export function formatPrice(price: number): string {
  const val = typeof price === "number" && !isNaN(price) ? price : 0;
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}
