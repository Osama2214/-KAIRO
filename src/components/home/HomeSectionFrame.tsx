"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LiveEditButton } from "@/components/admin/LiveEditButton";
import type { HomeExtrasConfig } from "@/store/useStorefrontStore";

/** The New Releases frame and header, shared by the home sections added with the shop. */
export function HomeSectionFrame({
  id,
  section,
  badge,
  headline,
  isArabic,
  isRTL,
  link,
  children,
}: {
  id: string;
  section: keyof HomeExtrasConfig;
  badge: string;
  headline: string;
  isArabic: boolean;
  isRTL: boolean;
  link?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="py-24 px-6 md:px-12 bg-ink border-t border-ink-border/60">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 pb-4 border-b border-ink-border/70 gap-4">
          <div>
            <span className="text-[11px] font-mono tracking-[0.25em] text-gold uppercase block mb-1">{badge}</span>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-paper font-sans">{headline}</h2>
              <LiveEditButton
                target={{ type: "home-extras", section }}
                label={isArabic ? "تعديل القسم" : "Edit Section"}
                variant="floating"
                size="xs"
              />
            </div>
          </div>
          {link && (
            <Link
              href={link.href}
              className="flex items-center gap-2 text-xs font-mono tracking-widest text-text-muted hover:text-paper transition-colors group"
            >
              <span>{link.label}</span>
              <ArrowRight strokeWidth={1.4} className={`w-3.5 h-3.5 transition-transform ${isRTL ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"}`} />
            </Link>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

/** Rows of four: never leave a ragged last row once there is a full one. */
export function fullRows<T>(items: T[], max: number): T[] {
  const capped = items.slice(0, Math.max(4, Math.min(12, Number(max) || 8)));
  return capped.length >= 4 ? capped.slice(0, capped.length - (capped.length % 4)) : capped;
}
