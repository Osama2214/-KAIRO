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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
