# AnimeVerse

Online store for manga, box sets, figures and posters — https://www.animeverse-store.com

## Stack

| Part | Service | Account |
|---|---|---|
| App | Next.js on Vercel (project `kairo`) | developer account, to move to the store's team on Pro |
| Database | Neon Postgres (`animeversestore`, Frankfurt) | animeversestore.eg@gmail.com |
| Images | Cloudflare R2 bucket `animeverse-media`, served at `media.animeverse-store.com` | animeversestore.eg@gmail.com |
| Domain | `animeverse-store.com` registered at Hostinger, DNS on Cloudflare | animeversestore.eg@gmail.com |
| Google sign-in | Google Cloud project `AnimeVerse`, client `AnimeVerse Web` | animeversestore.eg@gmail.com |
| Email | Gmail App Password on animeversestore.eg@gmail.com | — |

## Environment variables

Set in Vercel (Production) and in `.env.local` for development:

`DATABASE_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`, `R2_PUBLIC_HOSTNAME`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_APP_URL`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_SESSION_SECRET`, `PATRON_SESSION_SECRET`, `ADMIN_PIN`

`.env.local` points at the live accounts: changes made from localhost change the real store.

## Development

```bash
npm install
npm run dev
```

Checks:

```bash
npx tsc --noEmit
npm run lint
node --import ./scripts/tests/alias-loader.mjs --test scripts/tests/*.test.mts
```

## Maintenance scripts

- `scripts/build-japanese-font.mjs --apply` — rebuild the Japanese font subset after adding new kanji/kana to the site.
- `scripts/reset-admin-pin.mjs` — clear a forgotten admin PIN so it is rebuilt from `ADMIN_PIN`.
- `scripts/reset-shop-state.mjs` — remove trial orders, non-admin accounts and coupons, and reset stock (for launch).
