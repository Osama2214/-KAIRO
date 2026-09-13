import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { getCatalog, absoluteImage, metaDescription, SITE_URL, breadcrumbJsonLd, jsonLdHtml } from "@/lib/seo";
import { effectivePrice } from "@/lib/pricing";
import { detailsOf } from "@/lib/catalogDetails";
import { CatalogDetailsSeed } from "@/components/CatalogDetailsSeed";
import { isBook, isMerch } from "@/lib/variants";

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

/**
 * The page itself is a client component, so its metadata lives here. Every
 * product URL previously served the site-wide title and description, which
 * left Google with nothing to distinguish one volume from another.
 */
/**
 * Without these a `[slug]` route is rebuilt from scratch on every request: no
 * `x-nextjs-cache` header, and measured at 0.29-0.84s to first byte against a
 * static page's 0.006s. The catalogue changes only when a curator saves, so
 * these pages are prerendered at build time and refreshed on the same 30s
 * window the rest of the site uses.
 *
 * `dynamicParams` keeps a product added after the build reachable — it renders
 * on demand the first time, then caches like the others.
 */
export const revalidate = 30;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const { volumes } = await getCatalog();
  return volumes.filter(isBook).map((volume) => ({ slug: volume.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { volumes } = await getCatalog();
  const volume = volumes.find((item) => item.id === slug);

  if (!volume) {
    return { title: "Volume not found", robots: { index: false, follow: true } };
  }

  const title = `${volume.seriesTitle} — ${volume.title}`;
  const description = metaDescription(
    volume.synopsis,
    `${volume.title} by ${volume.author}. ${volume.format} edition, available from the ANIMEVERSE archive.`
  );
  const image = absoluteImage(volume.coverImage);

  return {
    title,
    description,
    alternates: { canonical: `/manga/${volume.id}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/manga/${volume.id}`,
      images: [{ url: image, alt: `${volume.title} cover` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function MangaVolumeLayout({ params, children }: Props) {
  const { slug } = await params;
  const { volumes } = await getCatalog();
  const volume = volumes.find((item) => item.id === slug);

  // Figures and posters have their own product page; an old or hand-typed
  // /manga link to one is sent there instead of rendering as a book.
  if (volume && isMerch(volume)) permanentRedirect(`/shop/${volume.id}`);

  // Product structured data, rendered on the server so crawlers can read price
  // and availability without executing the storefront's JavaScript.
  const jsonLd = volume && {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${volume.seriesTitle} — ${volume.title}`,
    image: [absoluteImage(volume.coverImage)],
    description: metaDescription(volume.synopsis, volume.title),
    sku: volume.id,
    ...(volume.isbn ? { gtin13: volume.isbn } : {}),
    brand: { "@type": "Brand", name: volume.seriesTitle },
    author: { "@type": "Person", name: volume.author },
    ...(volume.genre?.length ? { category: volume.genre.join(", ") } : {}),
    // No aggregateRating: the star ratings are not collected from real
    // customer reviews, and marking them up would break Google's review policy.
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/manga/${volume.id}`,
      priceCurrency: "EGP",
      price: effectivePrice(volume),
      itemCondition: "https://schema.org/NewCondition",
      availability: volume.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@id": `${SITE_URL}/#store` },
    },
  };
  const breadcrumbs =
    volume &&
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Manga", path: "/manga" },
      ...(volume.seriesSlug ? [{ name: volume.seriesTitle, path: `/series/${volume.seriesSlug}` }] : []),
      { name: volume.title, path: `/manga/${volume.id}` },
    ]);

  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml([jsonLd, breadcrumbs]) }} />}
      {volume && <CatalogDetailsSeed details={[detailsOf(volume)]} />}
      {children}
    </>
  );
}
