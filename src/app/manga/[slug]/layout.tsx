import type { Metadata } from "next";
import { getCatalog, absoluteImage, metaDescription, SITE_URL } from "@/lib/seo";

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
  return volumes.map((volume) => ({ slug: volume.id }));
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
    ...(volume.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: volume.rating,
            reviewCount: volume.reviewCount,
          },
        }
      : {}),
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/manga/${volume.id}`,
      priceCurrency: "EGP",
      price: volume.price,
      availability: volume.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\u003c") }}
        />
      )}
      {children}
    </>
  );
}
