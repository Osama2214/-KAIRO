"use client";

import { useTranslation } from "@/hooks/useTranslation";

/**
 * Shown while a page that looks a product up by id waits for the catalogue.
 *
 * The store starts from the defaults bundled into the JS, which only contain
 * the products that existed when the build was made. Anything a curator has
 * added since is missing until `/api/storefront` lands, so these pages have to
 * wait before concluding a product does not exist — otherwise every new
 * product 404s on a direct visit.
 */
export function CatalogPending() {
  const { t } = useTranslation();
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-5 bg-ink text-paper px-6">
      <span className="font-serif text-3xl text-gold/70 tracking-[0.2em] animate-pulse select-none">蒐集</span>
      <span className="h-px w-32 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-text-muted">{t.common.loading}</span>
    </div>
  );
}
