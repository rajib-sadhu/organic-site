@AGENTS.md

# Organic Foods — project guide

Guest-checkout e-commerce store for organic foods (India). Full design in **ARCHITECTURE.md** — read it before non-trivial work.

## Stack override (IMPORTANT)

This project does **NOT** use the Neocore/NeoUI stack from the global CLAUDE.md. It uses:
**Next.js 16 (App Router) + TypeScript + Tailwind v4 + Prisma 7 + MySQL + Zod + react-hook-form.**
Backend = Next.js Route Handlers (no Express). Hosted on a Node.js shared server via PM2.
Ignore Neocore/Mantle/Atmos conventions here.

## Key conventions

- **Money:** integer **paise** everywhere. Use `@/lib/money`. Never floats.
- **Prisma 7:** driver-adapter model. Client imported from `@/generated/prisma/client`; singleton in `@/lib/prisma`. CLI URL lives in `prisma.config.ts`; schema datasource has no `url`.
- **Orders are server-authoritative** (MySQL). Recompute all totals server-side — never trust client prices.
- **RBAC:** permission catalog in `@/lib/permissions`. Owner role = all perms, system, undeletable. Enforce server-side per route + hide in UI.
- **Caching:** catalog/home cacheable via tags in `@/lib/cache`; cart/checkout/admin never cached.
- **Layers:** `src/server/services` (logic), `src/server/repositories` (Prisma), Route Handlers (HTTP only), `src/schema` (Zod).

## Commands

- `npm run dev` — dev server
- `npm run db:migrate` / `db:deploy` — migrations (needs DATABASE_URL)
- `npm run db:seed` — seed permissions, owner, sample catalog
- `npm run db:studio` — Prisma Studio
- `npm run build && npm run start` — production (via PM2: `ecosystem.config.js`)
