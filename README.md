# Organic Foods — E-Commerce

Guest-checkout store for organic foods (India). Next.js 16 (App Router) + TypeScript +
Tailwind v4 + Prisma 7 + MySQL. Razorpay + COD. See **[ARCHITECTURE.md](./ARCHITECTURE.md)**
for the full design.

## Prerequisites

- Node.js 20+
- A MySQL server (8.x) you can connect to

## First-time setup

1. **Install deps**
   ```bash
   npm install
   ```

2. **Create the database** (once), e.g.:
   ```sql
   CREATE DATABASE organic_site CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

3. **Configure env** — edit `.env` and set a real `DATABASE_URL`:
   ```
   DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/organic_site"
   ```
   Also set `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` for the owner account.

4. **Apply migrations + seed**
   ```bash
   npm run db:deploy   # applies prisma/migrations (or: npm run db:migrate)
   npm run db:seed     # permissions, Owner role, owner login, sample catalog, settings
   ```

5. **Run**
   ```bash
   npm run dev         # http://localhost:3000
   ```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server |
| `npm run build` | `prisma generate` + production build |
| `npm run start` | Start production server (`next start`) |
| `npm run db:migrate` | Create/apply a dev migration |
| `npm run db:deploy` | Apply existing migrations (prod/CI) |
| `npm run db:seed` | Seed the database (idempotent) |
| `npm run db:studio` | Prisma Studio |
| `npm run db:reset` | Drop, re-migrate, re-seed (DEV ONLY) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## Production (Node.js shared server)

```bash
npm ci
npm run build
npx prisma migrate deploy
pm2 start ecosystem.config.js     # first deploy
pm2 reload organic-site           # subsequent deploys
```

## Project layout

```
prisma/            schema.prisma, migrations, seed.ts
src/
  app/             routes (storefront + admin) and Route Handlers (/api)
  server/          services (logic), repositories (Prisma), lib (integrations)
  schema/          Zod schemas (shared client/server)
  components/       UI
  lib/             prisma client, money, permissions, cache tags
  generated/prisma generated Prisma client (gitignored)
```

## Status

**Phase 0 complete** (foundations). Next: Phase 1 — catalog & storefront. See the roadmap
in ARCHITECTURE.md §10.
