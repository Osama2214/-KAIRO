import "server-only";

import type { MangaVolume, Series } from "@/data/manga";
import { getCatalog, getStoreProfile, SITE_NAME, SITE_URL } from "@/lib/seo";
import { priceVolume } from "@/lib/pricing";
import { isBook, isMerch, variantRow, withVariantSummary } from "@/lib/variants";
import { productHref } from "@/lib/utils";

/**
 * Plain-text descriptions of the store for AI assistants (the llms.txt
 * convention). When someone asks ChatGPT, Claude or Perplexity where to buy a
 * manga or a figure in Egypt, the assistant fetches pages and reads them; a
 * page built from a large client bundle is hard to read, while these files say
 * in a few kilobytes what the store sells, what it costs and where to link.
 */

const egp = (value: number) => `EGP ${Math.round(value).toLocaleString("en-US")}`;

function priceLine(item: MangaVolume, now: number): string {
  const priced = priceVolume(item, now);
  const was = priced.wasPrice ?? priced.listPrice;
  const from = isMerch(item) && (item.variants?.length || 0) > 1 ? "from " : "";
  return `${from}${egp(priced.price)}${was && was > priced.price ? ` (was ${egp(was)})` : ""}`;
}

function stockWord(item: MangaVolume): string {
  return item.stock > 0 ? "in stock" : "sold out";
}

async function load() {
  const [{ volumes, series }, profile] = await Promise.all([getCatalog(), getStoreProfile()]);
  const products = volumes.map(withVariantSummary);
  return { products, series, profile, now: Date.now() };
}

function header(profile: Awaited<ReturnType<typeof getStoreProfile>>): string[] {
  return [
    `# ${SITE_NAME}`,
    "",
    "> Online store in Egypt for original English-language manga volumes, complete manga box sets, anime figures and anime posters. Prices in Egyptian pounds (EGP), delivery to every governorate in Egypt, cash on delivery.",
    "",
    `- Website: ${SITE_URL}`,
    ...(profile.email ? [`- Email: ${profile.email}`] : []),
    ...(profile.phone ? [`- Phone / WhatsApp: ${profile.phone}`] : []),
    ...profile.sameAs.map((url) => `- Social: ${url}`),
    "- Languages: English and Arabic",
    "",
  ];
}

function seriesLines(series: Series[], products: MangaVolume[]): string[] {
  return series
    .map((entry) => {
      const books = products.filter((p) => isBook(p) && p.seriesSlug === entry.slug);
      const volumes = books.filter((b) => b.format !== "Box Set");
      const box = books.find((b) => b.format === "Box Set");
      const merch = products.filter((p) => isMerch(p) && (p.merch?.franchise || "").toLowerCase() === entry.title.toLowerCase());
      return { entry, volumes, box, merch };
    })
    .filter(({ volumes, box, merch }) => volumes.length || box || merch.length)
    .sort((a, b) => b.volumes.length - a.volumes.length)
    .map(({ entry, volumes, box, merch }) => {
      const parts = [
        volumes.length ? `${volumes.length} volumes` : "",
        box ? "complete box set" : "",
        merch.length ? `${merch.length} ${merch.length === 1 ? "figure/poster" : "figures/posters"}` : "",
      ].filter(Boolean);
      return `- [${entry.title}](${SITE_URL}/series/${entry.slug}): ${entry.author} — ${parts.join(", ")}`;
    });
}

/** /llms.txt — the short overview with links. */
export async function buildLlmsTxt(): Promise<string> {
  const { products, series, profile, now } = await load();
  const volumes = products.filter((p) => isBook(p) && p.format !== "Box Set");
  const boxes = products.filter((p) => isBook(p) && p.format === "Box Set");
  const merch = products.filter(isMerch);
  const typical = volumes.length ? priceVolume(volumes[0], now).price : 0;

  return [
    ...header(profile),
    "## What the store sells",
    "",
    `- ${volumes.length} individual manga volumes (English editions${typical ? `, most around ${egp(typical)} each` : ""})`,
    `- ${boxes.length} complete series box sets`,
    `- ${merch.length} anime figures and posters, many with size or edition options`,
    "",
    "## Main pages",
    "",
    `- [All manga volumes](${SITE_URL}/manga): filter by series, genre, format, price`,
    `- [Series](${SITE_URL}/series): every series with its volumes and box set`,
    `- [Collectibles — figures & posters](${SITE_URL}/shop)`,
    `- [Figures](${SITE_URL}/shop?type=figure)`,
    `- [Posters](${SITE_URL}/shop?type=poster)`,
    `- [Privacy policy](${SITE_URL}/privacy)`,
    `- [Terms of sale, returns and exchanges](${SITE_URL}/terms)`,
    "",
    "## Series",
    "",
    ...seriesLines(series, products),
    "",
    "## Full catalogue",
    "",
    `- [Every product with price, availability and link](${SITE_URL}/llms-full.txt)`,
    "",
  ].join("\n");
}

/** /llms-full.txt — every product, one line each. */
export async function buildLlmsFullTxt(): Promise<string> {
  const { products, series, profile, now } = await load();
  const lines: string[] = [...header(profile)];

  for (const entry of series) {
    const books = products
      .filter((p) => isBook(p) && p.seriesSlug === entry.slug)
      .sort((a, b) => (a.format === "Box Set" ? 1 : 0) - (b.format === "Box Set" ? 1 : 0) || Number(a.volumeNumber) - Number(b.volumeNumber));
    if (!books.length) continue;
    lines.push(`## ${entry.title} (manga by ${entry.author})`, "");
    if (entry.description) lines.push(entry.description.replace(/\s+/g, " ").trim(), "");
    for (const book of books) {
      const name = book.format === "Box Set" ? `${book.title} (box set)` : `Vol. ${book.volumeNumber}: ${book.title}`;
      lines.push(`- [${name}](${SITE_URL}${productHref(book)}) — ${priceLine(book, now)}, ${stockWord(book)}`);
    }
    lines.push("");
  }

  const merch = products.filter(isMerch);
  if (merch.length) {
    lines.push("## Figures and posters", "");
    for (const item of merch) {
      const type = item.productType === "figure" ? "figure" : "poster";
      const options = (item.variants || []).map((v) => `${v.label} ${egp(priceVolume(variantRow(item, v), now).price)}`).join(", ");
      lines.push(
        `- [${item.title}](${SITE_URL}${productHref(item)}) — ${item.merch?.franchise ? `${item.merch.franchise} ` : ""}${type}, ${priceLine(item, now)}, ${stockWord(item)}${options ? ` (options: ${options})` : ""}`
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}
