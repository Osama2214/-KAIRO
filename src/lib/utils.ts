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
  volume: { volumeNumber: number; format?: string },
  isArabic: boolean
): string {
  if (volume.format === "Box Set") return isArabic ? "طقم كامل" : "BOX SET";
  if (volume.format === "Deluxe Edition") return isArabic ? "فاخر" : "DELUXE";
  const number = volume.volumeNumber < 10 ? `0${volume.volumeNumber}` : String(volume.volumeNumber);
  return `${isArabic ? "المجلد" : "VOL."} ${number}`;
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
