import { notFound, permanentRedirect } from "next/navigation";
import { getCatalog } from "@/lib/seo";
import { isMerch } from "@/lib/variants";
import MangaDetail from "./MangaDetail";

export default async function MangaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { volumes } = await getCatalog();
  const volume = volumes.find((item) => item.id === slug);
  if (!volume) notFound();
  if (isMerch(volume)) permanentRedirect(`/shop/${volume.id}`);
  return <MangaDetail key={volume.id} volume={volume} />;
}
