import type { Metadata } from "next";
import { getCatalog, absoluteImage, metaDescription, SITE_URL } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

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
  const { series } = await getCatalog();
  return series.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { series } = await getCatalog();
  const entry = series.find((item) => item.slug === slug);

  if (!entry) {
    return { title: "Series not found", robots: { index: false, follow: true } };
  }

  const title = `${entry.title} (${entry.japaneseTitle})`;
  const description = metaDescription(
    entry.description,
    `${entry.title} by ${entry.author} — ${entry.totalVolumes} volumes in the ANIMEVERSE archive.`
  );
  const image = absoluteImage(entry.bannerImage || entry.featuredImage);

  return {
    title,
    description,
    alternates: { canonical: `/series/${entry.slug}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/series/${entry.slug}`,
      images: [{ url: image, alt: `${entry.title} artwork` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function SeriesLayout({ params, children }: Props) {
  const { slug } = await params;
  const { series } = await getCatalog();
  const entry = series.find((item) => item.slug === slug);

  const jsonLd = entry && {
    "@context": "https://schema.org",
    "@type": "BookSeries",
    name: entry.title,
    alternateName: entry.romajiTitle || entry.japaneseTitle,
    url: `${SITE_URL}/series/${entry.slug}`,
    image: absoluteImage(entry.bannerImage || entry.featuredImage),
    description: metaDescription(entry.description, entry.title),
    author: { "@type": "Person", name: entry.author },
    genre: entry.genres,
    numberOfItems: entry.totalVolumes,
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
