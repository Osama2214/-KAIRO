import { notFound, permanentRedirect } from "next/navigation";
import { getCatalog } from "@/lib/seo";
import { isBook } from "@/lib/variants";
import ShopProduct from "./ShopProduct";

export default async function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { volumes } = await getCatalog();
  const product = volumes.find((item) => item.id === slug);
  if (!product) notFound();
  if (isBook(product)) permanentRedirect(`/manga/${product.id}`);
  return <ShopProduct key={product.id} product={product} />;
}
