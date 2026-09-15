# Storefront repair and performance audit

## Findings and implementation plan

1. **Product correctness (critical).** The root layout sends an arbitrary subset of products, but the store marks it complete. Product routes therefore render `notFound()` for existing items. The subset extractor also reads obsolete configuration keys. Replace the subset with a complete, slim catalogue; load long descriptions/sample pages only where needed. Resolve product existence on the server and pass the selected product directly to the view, independent of client hydration.
2. **Failure handling.** Failed catalogue requests currently mark the catalogue loaded, and server errors fall back to demo data that may be cached as a missing product. Preserve empty catalogues, surface infrastructure failures through a retryable error boundary, deduplicate requests, and bound their duration.
3. **Initial mobile transfer.** The first visit preloads three intro images and downloads GSAP behind an opaque cover lasting up to 12 seconds. Keep replay available, and make shopping visible immediately. Load search, cart and reader code only when opened. Load lower home sections as they approach the viewport.
4. **Images.** Five overlapping hero backgrounds download at once, including invisible frames; the desktop cover is preloaded on phones. Use one mobile backdrop, responsive loading priorities, and conservative speculative image fetching. Keep product image optimization.
5. **Data integrity.** Catalogue/detail hydration must not trigger curator autosaves or erase descriptions. Keep authoritative checkout stock/pricing validation. Regression-test fetch failures, empty data, hydration, detail merging and existing commerce helpers.
6. **Validation.** Run lint, TypeScript, unit regressions and production build. Compare production HTTP payloads and inspect direct product visits, client navigation, search, cart, and mobile UI. Record measurements and remaining limitations below.

## Scope

This change repairs the existing Next.js project. It does not publish automatically, migrate production data, or claim measured mobile network performance until a production build can be exercised. A full catalogue search API with cursor pagination is a future scaling option; for the current catalogue, a complete compressed index avoids an extra mobile request and prevents partial inventory from producing wrong results.

## Validation and results

- The public catalogue currently contains 557 products. The slim index used by the initial page is about 66 KB gzip, versus about 193 KB gzip for the old full payload with descriptions and preview pages. A single product detail response is about 0.8 KB gzip.
- The read-only production audit verified all 557 generated product pages, four representative HTTP product visits, the product detail endpoint, and a missing-product route. Existing products returned 200; a missing product returned a streamed 200 with `noindex`, which is the expected Next.js streaming behavior.
- `npm test`: 34 tests passed. `npm run typecheck`: passed. `npm run lint`: passed.
- A production build completed earlier with the real local database configuration and generated 607 routes (557 products plus series). The final repeat build was blocked by the environment's automatic network approval limit while downloading Google Fonts; the source typecheck and lint still pass after the final edits. The build does not modify the database.
