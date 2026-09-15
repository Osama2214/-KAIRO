"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

function SectionLoading() {
  return <div role="status" className="min-h-[640px] flex items-center justify-center text-gold">Loading… · جاري التحميل</div>;
}

const sections = {
  boxes: dynamic(() => import("@/components/BoxSets").then((m) => m.BoxSets), { loading: SectionLoading }),
  shop: dynamic(() => import("@/components/ShopShowcase").then((m) => m.ShopShowcase), { loading: SectionLoading }),
  franchises: dynamic(() => import("@/components/home/FranchiseShowcase").then((m) => m.FranchiseShowcase), { loading: SectionLoading }),
  genres: dynamic(() => import("@/components/GenreBento").then((m) => m.GenreBento), { loading: SectionLoading }),
  featured: dynamic(() => import("@/components/FeaturedSeries").then((m) => m.FeaturedSeries), { loading: SectionLoading }),
  discovery: dynamic(() => import("@/components/MangaDiscovery").then((m) => m.MangaDiscovery), { loading: SectionLoading }),
};

/** Download and mount each lower section shortly before it enters the screen. */
export function DeferredHomeSection({ name, anchor, title }: {
  name: keyof typeof sections;
  anchor: string;
  title: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const revealHash = () => { if (window.location.hash === `#${anchor}`) setReady(true); };
    revealHash();
    window.addEventListener("hashchange", revealHash);
    if (!("IntersectionObserver" in window)) {
      const timer = setTimeout(() => setReady(true), 0);
      return () => { clearTimeout(timer); window.removeEventListener("hashchange", revealHash); };
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setReady(true); observer.disconnect(); }
    }, { rootMargin: "600px 0px" });
    observer.observe(element);
    return () => { observer.disconnect(); window.removeEventListener("hashchange", revealHash); };
  }, [anchor]);

  const Section = sections[name];
  return <div ref={ref}>
    {ready ? <Section /> : <section id={anchor} className="min-h-[640px] px-6 py-24 border-t border-ink-border flex flex-col items-center justify-center gap-6">
      <h2 className="font-serif text-2xl text-gold">{title}</h2>
      <button onClick={() => setReady(true)} className="border border-gold/50 px-6 py-3 text-paper">Explore · استكشف</button>
      <noscript><Link href="/manga" prefetch={false}>Browse the catalogue</Link></noscript>
    </section>}
  </div>;
}
