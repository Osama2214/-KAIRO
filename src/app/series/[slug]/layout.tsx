import type { Metadata } from "next";
import { getCatalog, absoluteImage, metaDescription, SITE_URL } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
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
    `${entry.title} by ${entry.author} — ${entry.totalVolumes} volumes in the MANGA WORLD archive.`
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
