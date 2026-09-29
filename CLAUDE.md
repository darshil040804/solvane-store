# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Stack

Next.js 16 (App Router, `src/` dir) · React 19 · Tailwind CSS v4 (via `@tailwindcss/postcss`, no `tailwind.config`) · Drizzle ORM on Neon serverless Postgres · Better Auth (email + password).

Next.js 16 differs from older versions — per AGENTS.md, check `node_modules/next/dist/docs/` (`01-app/`, `03-architecture/`) before using Next APIs. Example already in the code: route props use the generated global types like `LayoutProps<"/">` / `PageProps<...>`, which come from `next typegen`.

## Commands

```bash
npm run dev          # dev server on http://localhost:3000
npm run build
npm run lint         # eslint (flat config, eslint-config-next)
npm run typecheck    # next typegen && tsc --noEmit

npm run db:generate  # drizzle-kit: generate SQL migrations from src/db/schema.ts into ./drizzle
npm run db:migrate   # apply migrations
npm run db:push      # push schema directly (no migration files)
npm run db:studio
npm run db:seed      # load the sample catalog (src/db/seed-data.ts); idempotent, upserts by slug

npm run auth:generate  # Better Auth CLI -> writes src/db/auth-schema.ts from src/lib/auth/index.ts
```

There is no test framework set up yet.

## Environment

Copy `.env.example` to `.env.local`. Required: `DATABASE_URL` (Neon), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`. `drizzle.config.ts` loads `.env.local` then `.env`. `src/db/index.ts` throws at import time if `DATABASE_URL` is missing, so anything importing `@/db` or `@/lib/auth` fails without it.

## Architecture

- **DB** — `src/db/index.ts` exports a single `db` (drizzle `neon-http` driver, HTTP — no interactive transactions). `src/db/schema.ts` is the single schema entry point for both drizzle-kit and the Better Auth adapter; all table modules must be re-exported from it.
- **Catalog** — tables in `src/db/catalog-schema.ts`: `categories` 1─< `products` 1─< `product_images` (ordered by `position`, 0 = card image) and `product_stock` (one row per size with `quantity`; unsized products have a single `ONE_SIZE` row). Prices are integer cents (`price_cents`). Pages read the catalog only through `src/lib/products.ts` (server-only, React `cache`), which maps rows to the `Product` view model (total stock, `sizes` with `inStock`). Editorial homepage content stays in `src/lib/content.ts`. Home and product pages use `revalidate = 60`; `next build` needs `DATABASE_URL`.
- **Auth** — server instance in `src/lib/auth/index.ts` (`auth`), browser client in `src/lib/auth/client.ts` (`authClient`), mounted at `src/app/api/auth/[...all]/route.ts`. `nextCookies()` must remain the last entry in `plugins`.
- **Auth schema workflow** — the Better Auth tables don't exist yet. After changing auth config/plugins: run `npm run auth:generate` (writes `src/db/auth-schema.ts`), re-export it from `src/db/schema.ts`, then `npm run db:generate` + `db:migrate` (or `db:push`).
- Import alias: `@/*` → `src/*`.
