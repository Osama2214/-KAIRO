import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { getCatalog, absoluteImage, metaDescription, SITE_URL } from "@/lib/seo";
import { isBook, isMerch, variantRow, withVariantSummary } from "@/lib/variants";
import { effectivePrice } from "@/lib/pricing";
import type { MangaVolume } from "@/data/manga";

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

// Same caching as the manga product pages: prerendered, refreshed every 30s,
// and a product added after the build still renders on first visit.
export const revalidate = 30;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const { volumes } = await getCatalog();
  return volumes.filter(isMerch).map((item) => ({ slug: item.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { volumes } = await getCatalog();
  const product = volumes.find((item) => item.id === slug && isMerch(item));
  if (!product) return { title: "Product not found", robots: { index: false, follow: true } };

  const type = product.productType === "figure" ? "Figure" : "Poster";
  const franchise = product.merch?.franchise;
  const title = franchise ? `${product.title} — ${franchise} ${type}` : `${product.title} — ${type}`;
  const description = metaDescription(product.synopsis, `${product.title}, an anime ${type.toLowerCase()} from the ANIMEVERSE shop.`);
  const image = absoluteImage(product.coverImage);

  return {
    title,
    description,
    alternates: { canonical: `/shop/${product.id}` },
    openGraph: { type: "website", title, description, url: `/shop/${product.id}`, images: [{ url: image, alt: product.title }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

/** One schema.org Offer per variant, priced as checkout would price it now. */
function offersFor(product: MangaVolume) {
  const now = Date.now();
  return (product.variants || []).map((variant) => {
    const row = variantRow(product, variant);
    return {
      "@type": "Offer",
      name: variant.label,
      sku: row.id,
      url: `${SITE_URL}/shop/${product.id}`,
      priceCurrency: "EGP",
      price: effectivePrice(row, now),
      availability: row.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    };
  });
}

export default async function ShopProductLayout({ params, children }: Props) {
  const { slug } = await params;
  const { volumes } = await getCatalog();
  const item = volumes.find((entry) => entry.id === slug);

  // A book opened under /shop belongs on its manga page.
  if (item && isBook(item)) permanentRedirect(`/manga/${item.id}`);

  const product = item ? withVariantSummary(item) : null;
  const offers = product ? offersFor(product) : [];

  // One Product with one Offer per variant, rendered on the server so crawlers
  // see every size's price and availability.
  const jsonLd = product && offers.length > 0 && {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: [product.coverImage, ...(product.gallery || [])].filter(Boolean).map((src) => absoluteImage(src)),
    description: metaDescription(product.synopsis, product.title),
    sku: product.id,
    category: product.productType === "figure" ? "Figures" : "Posters",
    ...(product.merch?.manufacturer ? { brand: { "@type": "Brand", name: product.merch.manufacturer } } : {}),
    ...(product.reviewCount > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.reviewCount } }
      : {}),
    offers:
      offers.length === 1
        ? offers[0]
        : {
            "@type": "AggregateOffer",
            priceCurrency: "EGP",
            lowPrice: Math.min(...offers.map((o) => o.price)),
            highPrice: Math.max(...offers.map((o) => o.price)),
            offerCount: offers.length,
            offers,
          },
  };

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      )}
      {children}
    </>
  );
}
