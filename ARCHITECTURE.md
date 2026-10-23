# Organic Foods E-Commerce — Architecture

> Living design doc. Status: **v2**, in active development.
> Owner: Rajib. Last updated: 2026-06-25.

---

## 1. Locked decisions

| Area | Decision |
|------|----------|
| Market / payments | **India-first. Razorpay** (UPI, cards, netbanking, wallets) **+ COD** (COD adds an extra surcharge). |
| Persistence | **Everything in MySQL.** Cart is server-side (cart token cookie); no business data lives only in the browser. |
| Catalog | **Products with variants** (e.g. 250g / 500g / 1kg) and **inventory tracking** (stock per variant, decremented on order). Each variant carries an **MRP / compare-at price** for strikethrough + "% off" badges. |
| Merchandising | **Collections** (manual + automated/rule-driven) on top of categories; **related / cross-sell** products; **reviews & ratings** (verified-purchase); **search + filter + sort**; **infinite scroll layered over crawlable paginated URLs** (`?page=N`) so SEO/deep-links survive. |
| Marketing / retention | **Abandoned-cart recovery** (email), **newsletter + announcement bar**, **blog/content** for organic SEO, **wishlist / back-in-stock / recently-viewed**. |
| Accounts | **Guest checkout + optional customer accounts** (email+password): order history, wishlist, verified-purchase reviews. Account is never required to buy. **Admin panel is separately authenticated** with roles. |
| Order tracking | Guest **order lookup (order # + email)** *and* **signed magic-link** to a private order-status page (both, per decision). |
| Notifications | **Email-only for v1** (Resend). SMS/WhatsApp order updates deferred — but an **SMS provider (e.g. MSG91) is still required for COD-OTP**. |
| Community / forums | **Deferred to post-launch.** v1 ships reviews; a full forum (accounts, moderation, reputation) is a later phase. |
| Backend shape | **Next.js fullstack** (App Router + Route Handlers). No separate Express server. |
| Email + invoice | **Resend** for transactional email, **@react-pdf/renderer** for invoice PDFs. |
| Tax & shipping | **Prices are tax-inclusive**, **flat shipping fee**, no GST breakup on invoice (revisit if GST registration is required). |
| Hosting | **Node.js shared server** — `next start` as a long-lived process under **PM2**, MySQL on the same/managed host. |

---

## 2. Tech stack

- **Framework:** Next.js (App Router) + TypeScript, run self-hosted via `next start` + PM2.
- **DB & ORM:** MySQL + Prisma.
- **Validation:** Zod (shared schemas between client forms and server route handlers).
- **Forms:** react-hook-form + `@hookform/resolvers/zod`.
- **Payments:** Razorpay (Orders API + Checkout.js + signed webhooks) + COD.
- **Email:** Resend (transactional **and** marketing: confirmations, abandoned-cart, back-in-stock, newsletter, double opt-in). Reached **only through the notification driver** (§6.14), never via the SDK at call sites — selected by `EMAIL_DRIVER` (`log` | `resend`).
- **PDF:** `@react-pdf/renderer` (pure JS, shared-host friendly).
- **Notifications:** **email-only for v1.** No SMS/WhatsApp order updates yet. Every email **and** SMS is **persisted to a `Notification` outbox table, then dispatched** through a **driver abstraction** (§6.14): `EMAIL_DRIVER` / `SMS_DRIVER` select the backend from `.env`, defaulting to a **`log` driver** that renders to a log file **and** stdout instead of sending. Urgent messages (OTP, confirmation) dispatch inline; the rest are sent by an in-process worker with retry/backoff. The outbox = a production-inspectable audit trail; the `log` default lets us build/test every flow (incl. COD-OTP) **before** signing up for Resend or an SMS provider. No real SMS provider is wired yet (`SMS_DRIVER=log`); MSG91/Twilio slots in later (§6.3) without touching call sites.
- **Auth (admin):** Custom JWT-cookie layer using **`jose`** (resolved — not Auth.js). bcrypt passwords, httpOnly `admin_token` cookie, "remember me" (30-day vs 1-day expiry). Three roles seeded: **Owner** (system, all perms, undeletable), **Super Manager** (all perms except owner management), and custom roles.
- **Auth (customer):** **separate** session + table from admin (`Customer`, argon2/bcrypt). Guest checkout works without an account; offer "create an account" post-order to attach order history. Distinct cookie/trust boundary so customer auth never touches the admin surface.
- **Search:** MySQL **`FULLTEXT`** (name/description/tags) for v1 — no external search service. Facets (category, collection, price range, in-stock) and sort (price, popularity via `ratingAvg`/sales, newest) run as **indexed SQL** `WHERE`/`ORDER BY`. Revisit Meilisearch/Typesense only if the catalog outgrows it.
- **Content/blog:** DB-backed posts authored in admin, rendered **SSG + ISR**; MDX optional for rich posts.
- **State (client):** **Zustand** + `localStorage` for cart and wishlist (lightweight, no Provider wrapper, works seamlessly with App Router). No Redux — Zustand covers all client state needs at ~1KB.
- **UI/animation:** Tailwind CSS v4 + Framer Motion (scroll reveals, add-to-cart, go-to-top, cart drawer). **embla-carousel-react** + autoplay for the home banner carousel. **react-medium-image-zoom** for product image zoom on detail page.
- **Analytics:** Google Tag Manager → GA4 with ecommerce events.
- **Process mgmt / ops:** PM2, `.env`-based config, scheduled jobs via node-cron or PM2 cron.

---

## 3. High-level architecture

```
            ┌──────────────────────────────────────────────┐
            │                Next.js (App Router)            │
            │                                                │
  Browser ──┤  Public site (SSR/SSG + ISR)                   │
            │   • Home (banner, products, contact, footer)   │
            │   • /products, /products/[slug]                │
            │   • /cart, /checkout (client + server cart)    │
            │                                                │
            │  Admin (auth-gated, SSR)                        │
            │   • /admin/dashboard, /orders, /products, ...  │
            │                                                │
            │  Route Handlers (/app/api/*)  ── the "backend" │
            │   • cart, checkout, coupons, payment, webhooks │
            │   • admin CRUD, cache invalidation             │
            └───────────────┬────────────────┬───────────────┘
                            │                │
                      Prisma│          server│ integrations
                            ▼                ▼
                        ┌────────┐   ┌─────────────────────────┐
                        │ MySQL  │   │ Razorpay │ Resend │ GTM  │
                        └────────┘   └─────────────────────────┘
```

**Rendering strategy (SEO-critical):**
- Product list & detail, category, home → **statically generated + ISR**, revalidated by **cache tags**.
- Cart & checkout → **dynamic, never cached**.
- Admin → **dynamic, no cache, auth-gated**.

---

## 4. Suggested folder structure

```
organic-site/
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/                # SQL migration files
│  └─ seed.ts
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                # home: banner carousel + hero + featured + categories + contact
│  │  ├─ not-found.tsx           # branded 404 page
│  │  ├─ error.tsx               # error boundary
│  │  ├─ global-error.tsx        # root layout error fallback
│  │  ├─ products/page.tsx       # list: filter + sort + infinite scroll over ?page=N
│  │  ├─ products/[slug]/page.tsx # detail: gallery+zoom, variants, reviews, related
│  │  ├─ blog/page.tsx
│  │  ├─ blog/[slug]/page.tsx
│  │  ├─ cart/page.tsx
│  │  ├─ checkout/page.tsx
│  │  ├─ wishlist/page.tsx       # Zustand-backed wishlist
│  │  ├─ track/page.tsx          # guest order lookup (order # + email)
│  │  ├─ order/[token]/page.tsx  # magic-link order status
│  │  ├─ order-confirmation/page.tsx
│  │  ├─ (legal)/                # privacy, terms, refund, shipping
│  │  ├─ admin/
│  │  │  ├─ login/page.tsx       # eye toggle, remember me
│  │  │  └─ (panel)/             # layout with AdminSidebar
│  │  │     ├─ page.tsx          # dashboard
│  │  │     ├─ orders/...
│  │  │     ├─ products/...      # CRUD + variants + images + thumbnail
│  │  │     ├─ coupons/...       # CRUD with description
│  │  │     ├─ reviews/...       # moderation queue
│  │  │     ├─ blog/...          # CRUD + image upload
│  │  │     ├─ banners/...       # home carousel management
│  │  │     ├─ newsletter/...
│  │  │     ├─ users/...         # user + role + password management (modals)
│  │  │     └─ settings/...
│  │  ├─ api/
│  │  │  ├─ banners/route.ts          # public: active banners
│  │  │  ├─ cart/route.ts
│  │  │  ├─ checkout/route.ts
│  │  │  ├─ coupons/validate/route.ts
│  │  │  ├─ contact/route.ts
│  │  │  └─ admin/
│  │  │     ├─ auth/route.ts          # login/logout/session
│  │  │     ├─ products/route.ts
│  │  │     ├─ products/[id]/route.ts
│  │  │     ├─ upload/route.ts        # product image upload
│  │  │     ├─ images/[id]/thumbnail/route.ts  # set thumbnail
│  │  │     ├─ banners/route.ts
│  │  │     ├─ banners/[id]/route.ts
│  │  │     ├─ blog/route.ts
│  │  │     ├─ blog/[id]/route.ts
│  │  │     ├─ blog/upload/route.ts   # blog cover image upload
│  │  │     ├─ coupons/route.ts
│  │  │     ├─ coupons/[id]/route.ts
│  │  │     ├─ users/route.ts
│  │  │     ├─ users/[id]/route.ts
│  │  │     └─ ...
│  │  ├─ sitemap.ts
│  │  └─ robots.ts
│  ├─ server/
│  │  ├─ services/               # coupon validation, etc.
│  │  ├─ repositories/           # catalog (read-only storefront queries)
│  │  └─ lib/                    # admin-auth (jose JWT), cache tags, money
│  ├─ store/                     # Zustand stores
│  │  ├─ cart.ts                 # cart + drawer state (localStorage)
│  │  └─ wishlist.ts             # wishlist (localStorage)
│  ├─ schema/                    # Zod schemas (shared client/server)
│  ├─ components/
│  │  ├─ admin/                  # AdminSidebar, ProductForm, CouponForm, BlogForm, InfoTip
│  │  ├─ home/                   # Hero, BannerCarousel, FeatureCards, FeaturedProducts, CategoryStrip, etc.
│  │  ├─ product/                # ProductCard, ProductGallery, VariantSelector, etc.
│  │  ├─ cart/                   # CartDrawer, CartButton, AddToCartButton, CouponsModal
│  │  ├─ wishlist/               # WishlistButton, WishlistNavButton
│  │  ├─ review/                 # ReviewSection
│  │  ├─ layout/                 # Navbar, Footer, StoreShell, PromoStrip, GoToTop
│  │  └─ ui/                     # Container, etc.
│  ├─ lib/                       # fonts, site config, money, cn, cache
│  └─ generated/prisma/          # Prisma generated client
├─ public/
│  └─ uploads/                   # product + blog images
├─ ecosystem.config.js           # PM2 config
├─ prisma.config.ts              # Prisma 7 CLI datasource URL
└─ ARCHITECTURE.md
```

> The `src/server/services` layer means that if you ever extract a standalone Express/mobile API later, the business logic lifts cleanly.

---

## 5. Data model (Prisma sketch)

Core tables. Money stored as **integer paise** (avoid floats).

```prisma
model Product {
  id               Int      @id @default(autoincrement())
  slug             String   @unique
  name             String
  tagline          String?              // shown below product name on cards + detail
  shortDescription String?  @db.Text    // brief copy shown above variant selector on detail page
  description      String   @db.Text    // full description in tabs
  category    Category @relation(fields: [categoryId], references: [id])
  categoryId  Int
  images      ProductImage[]
  variants    ProductVariant[]
  isActive    Boolean  @default(true)
  tags        Json?    // JSON array of tag strings — feeds search + automated collections
  highlights  Json?    // JSON array of highlight strings (e.g. "Cold-pressed | No additives")
  benefits    Json?    // JSON array
  howToUse    String?  @db.Text
  ingredients String?  @db.Text
  nutritionInfo Json?  // JSON key-value map (e.g. { "Protein": "3g", "Fat": "12g" })
  shelfLife   String?
  storage     String?
  isFeatured  Boolean  @default(false)
  // merchandising
  collections  CollectionProduct[]
  reviews      Review[]
  wishlistItems WishlistItem[]
  ratingAvg    Float   @default(0)   // denormalized for sort/badges; recomputed on review approve
  ratingCount  Int     @default(0)
  related      Product[] @relation("RelatedProducts")
  relatedOf    Product[] @relation("RelatedProducts")
  // SEO + full-text search
  metaTitle       String?
  metaDescription String?
  metaKeywords    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  // @@fulltext([name, description, tags])   // MySQL FULLTEXT index for search
}

model ProductImage {
  id          Int     @id @default(autoincrement())
  product     Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  productId   Int
  url         String
  alt         String?
  sortOrder   Int     @default(0)
  isThumbnail Boolean @default(false)   // one per product; shown on cards + cart
  createdAt   DateTime @default(now())
}

model ProductVariant {
  id         Int     @id @default(autoincrement())
  product    Product @relation(fields: [productId], references: [id])
  productId  Int
  label      String  // "500g"
  sku        String  @unique
  pricePaise Int     // tax-inclusive selling price
  mrpPaise   Int?    // compare-at / MRP — show strikethrough + "% off" when mrpPaise > pricePaise
  weightGrams Int?
  stock      Int     @default(0)
  isActive   Boolean @default(true)
  backInStockSubs BackInStockSubscription[]
}

model Category {
  id    Int    @id @default(autoincrement())
  slug  String @unique
  name  String
  products Product[]
}

model Cart {
  id          String   @id @default(cuid())   // cart token in httpOnly cookie
  items       CartItem[]
  couponId    Int?
  // abandoned-cart recovery
  email       String?    // captured early (checkout step 1, or from logged-in customer) to enable recovery
  customerId  Int?
  remindersSent  Int     @default(0)
  lastReminderAt DateTime?
  convertedToOrderId Int?  // set once it becomes an order — stops further reminders
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model CartItem {
  id        Int     @id @default(autoincrement())
  cart      Cart    @relation(fields: [cartId], references: [id])
  cartId    String
  variant   ProductVariant @relation(fields: [variantId], references: [id])
  variantId Int
  qty       Int
}

model Order {
  id            Int      @id @default(autoincrement())
  orderNo       String   @unique           // human-friendly: ORD-2026-000123
  status        OrderStatus @default(PENDING)
  trackingToken String   @unique           // unguessable token for the magic-link status page
  customer      Customer? @relation(fields: [customerId], references: [id])
  customerId    Int?                        // set when a logged-in customer ordered; null for pure guest
  // customer (guest) snapshot
  email         String
  phone         String
  shipName      String
  shipLine1     String
  shipLine2     String?
  shipCity      String
  shipState     String
  shipPincode   String
  // money snapshot (paise)
  subtotalPaise Int
  discountPaise Int    @default(0)
  shippingPaise Int    @default(0)
  codFeePaise   Int    @default(0)
  totalPaise    Int
  couponCode    String?
  paymentMethod PaymentMethod      // RAZORPAY | COD
  paymentStatus PaymentStatus @default(PENDING)
  items         OrderItem[]
  payment       Payment?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model OrderItem {
  id          Int    @id @default(autoincrement())
  order       Order  @relation(fields: [orderId], references: [id])
  orderId     Int
  // snapshot product/variant details at purchase time
  productName String
  variantLabel String
  sku         String
  unitPaise   Int
  qty         Int
  linePaise   Int
}

model Payment {
  id                Int    @id @default(autoincrement())
  order             Order  @relation(fields: [orderId], references: [id])
  orderId           Int    @unique
  provider          String // "razorpay"
  rzpOrderId        String?
  rzpPaymentId      String?
  rzpSignature      String?
  amountPaise       Int
  status            PaymentStatus
  rawWebhook        Json?
}

model Coupon {
  id            Int      @id @default(autoincrement())
  code          String   @unique
  description   String?  @db.Text    // admin-facing description of the coupon purpose/campaign
  type          CouponType  // PERCENT | FLAT | FREE_SHIP
  valuePaise    Int?        // for FLAT
  percent       Int?        // for PERCENT
  minOrderPaise Int      @default(0)
  maxUses       Int?
  usedCount     Int      @default(0)
  perEmailLimit Int?
  startsAt      DateTime?
  expiresAt     DateTime?
  isActive      Boolean  @default(true)
}

model Banner {
  id        Int      @id @default(autoincrement())
  title     String?
  subtitle  String?
  ctaText   String?
  ctaLink   String?
  image     String               // URL (uploaded or pasted)
  sortOrder Int      @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model FeatureCard {                // home page promo grid below the banner carousel
  id        Int      @id @default(autoincrement())
  title     String
  subtitle  String?
  image     String               // URL (uploaded or pasted)
  link      String?              // optional click-through; null = not clickable
  sortOrder Int      @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  // Grid column count (2/3/4) is global, stored on Setting.featureCardGrid.
}

model PromoMessage {              // custom lines for the rotating strip above the navbar
  id        Int      @id @default(autoincrement())
  text      String
  link      String?              // optional click-through; null = not clickable
  sortOrder Int      @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  // Merged at request time with active coupons (auto-labelled) — see §6.12.
}

// ---- RBAC: owner creates staff and grants granular permissions ----

model AdminUser {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  passwordHash String
  name         String
  role         Role     @relation(fields: [roleId], references: [id])
  roleId       Int
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
}

model Role {
  id          Int      @id @default(autoincrement())
  name        String   @unique          // "Owner", "Order Manager", or any custom role
  description String?
  isSystem    Boolean  @default(false)   // the Owner role is system: all-perms, undeletable
  users       AdminUser[]
  permissions RolePermission[]
}

model Permission {
  id    Int    @id @default(autoincrement())
  key   String @unique   // e.g. "orders.update_status"
  label String           // "Update order status"
  group String           // UI grouping: "Orders", "Products", "Settings"...
  roles RolePermission[]
}

model RolePermission {
  role         Role       @relation(fields: [roleId], references: [id])
  roleId       Int
  permission   Permission @relation(fields: [permissionId], references: [id])
  permissionId Int
  @@id([roleId, permissionId])
}

model Setting {                  // single-row config the admin can edit
  id              Int @id @default(1)
  flatShippingPaise Int @default(0)
  freeShipOverPaise Int?          // optional threshold
  codFeePaise       Int @default(0)
  storeEmail        String?
  // storefront content / marketing
  announcementText  String?       // promo/announcement bar copy; null = bar hidden
  announcementHref  String?
  featureCardGrid   Int @default(3) // home FeatureCard grid columns: 2, 3, or 4
  abandonedCartOn   Boolean @default(true)
  codOtpOn          Boolean @default(false)  // COD-OTP toggle (§6.3); off by default
  // analytics / misc as needed
}

// ---- Customer accounts (optional; guest checkout works without one) ----

model Customer {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  passwordHash String?              // null until a password is set (e.g. post-order invite)
  name         String?
  phone        String?
  isActive     Boolean  @default(true)
  orders       Order[]
  reviews      Review[]
  wishlist     WishlistItem[]
  createdAt    DateTime @default(now())
}

// ---- Merchandising & content ----

model Review {
  id          Int       @id @default(autoincrement())
  product     Product   @relation(fields: [productId], references: [id])
  productId   Int
  customer    Customer? @relation(fields: [customerId], references: [id])
  customerId  Int?
  authorName  String                       // snapshot (guest reviews allowed but email-verified)
  rating      Int                          // 1..5
  title       String?
  body        String    @db.Text
  isVerified  Boolean   @default(false)     // true if tied to a delivered order for this product
  status      ReviewStatus @default(PENDING) // moderation gate before it shows
  createdAt   DateTime  @default(now())
  @@index([productId, status])
}

model Collection {
  id          Int      @id @default(autoincrement())
  slug        String   @unique
  name        String
  description String?  @db.Text
  isAutomated Boolean  @default(false)      // true = rule-driven (tag/price/in-stock); false = manual
  rules       Json?                         // automated-collection conditions
  isActive    Boolean  @default(true)
  products    CollectionProduct[]
  metaTitle       String?
  metaDescription String?
}

model CollectionProduct {
  collection   Collection @relation(fields: [collectionId], references: [id])
  collectionId Int
  product      Product    @relation(fields: [productId], references: [id])
  productId    Int
  position     Int        @default(0)       // manual ordering within the collection
  @@id([collectionId, productId])
}

model BlogPost {
  id          Int        @id @default(autoincrement())
  slug        String     @unique
  title       String
  excerpt     String?
  body        String     @db.Text           // markdown / MDX
  coverImage  String?
  status      PostStatus @default(DRAFT)
  publishedAt DateTime?
  metaTitle       String?
  metaDescription String?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

model NewsletterSubscriber {
  id          Int      @id @default(autoincrement())
  email       String   @unique
  isConfirmed Boolean  @default(false)       // double opt-in
  source      String?                        // popup | footer | checkout
  createdAt   DateTime @default(now())
  unsubAt     DateTime?
}

model WishlistItem {
  id         Int      @id @default(autoincrement())
  customer   Customer @relation(fields: [customerId], references: [id])
  customerId Int
  product    Product  @relation(fields: [productId], references: [id])
  productId  Int
  createdAt  DateTime @default(now())
  @@unique([customerId, productId])
}

model BackInStockSubscription {
  id         Int      @id @default(autoincrement())
  variant    ProductVariant @relation(fields: [variantId], references: [id])
  variantId  Int
  email      String
  notifiedAt DateTime?
  createdAt  DateTime @default(now())
  @@unique([variantId, email])
}

// ---- Notification outbox (every email/SMS is persisted here before sending; see §6.14) ----

model Notification {
  id           Int           @id @default(autoincrement())
  channel      NotifChannel                       // EMAIL | SMS
  priority     NotifPriority @default(NORMAL)      // HIGH = dispatched inline (OTP, confirmation); NORMAL/LOW = cron
  status       NotifStatus   @default(PENDING)     // PENDING -> SENDING -> SENT | FAILED
  toAddress    String                             // email address or phone number
  subject      String?                            // email only
  body         String        @db.Text             // rendered message; secrets REDACTED in place once SENT (§6.14)
  template     String?                            // e.g. "order.confirmation", "cod.otp" — traceability
  orderId      Int?                               // trace / regenerate invoice PDF at send time
  attachInvoiceForOrderId Int?                     // when set, worker regenerates + attaches the invoice PDF
  dedupeKey    String?       @unique               // idempotency guard, e.g. "otp:order:123" — re-enqueue is a no-op
  attempts     Int           @default(0)
  maxAttempts  Int           @default(10)          // attempts + backoff span the ~1–2 day retry window
  lastError    String?       @db.Text
  scheduledFor DateTime      @default(now())       // worker skips rows until now >= scheduledFor (backoff)
  sentAt       DateTime?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  @@index([status, scheduledFor])                  // worker's claim query
  @@index([channel, status])
}

enum OrderStatus   { PENDING CONFIRMED PACKED SHIPPED DELIVERED CANCELLED REFUNDED }
enum PaymentStatus { PENDING PAID FAILED REFUNDED }
enum PaymentMethod { RAZORPAY COD }
enum CouponType    { PERCENT FLAT FREE_SHIP }
enum ReviewStatus  { PENDING APPROVED REJECTED }
enum PostStatus    { DRAFT PUBLISHED }
enum NotifChannel  { EMAIL SMS }
enum NotifPriority { HIGH NORMAL LOW }
enum NotifStatus   { PENDING SENDING SENT FAILED }
```

**Key principle:** orders store **snapshots** of price/product details, so later catalog edits never rewrite historical orders or invoices.

---

## 6. Core flows

### 6.1 Cart
- First add-to-cart → server creates `Cart`, sets `cart_token` httpOnly cookie.
- All cart mutations go through `/api/cart` (validated with Zod). Client mirrors state for instant UI but server is source of truth.
- Totals are **always recomputed server-side** at checkout — never trust client-sent prices.

### 6.2 Coupon
- `/api/coupons/validate` checks: active, date window, min order, usage/per-email limits → returns computed discount. Re-validated again at order creation (state may change between apply and pay).

### 6.3 Checkout & payment (the critical path)
1. Customer fills address + chooses method (Razorpay / COD). Zod-validated.
2. Server recomputes: subtotal → coupon discount → shipping (flat, or free over threshold) → **+ COD surcharge if COD** → total.
3. **Stock check + reserve** inside a DB transaction; create `Order` as `PENDING`.
4. **Razorpay path:** create Razorpay Order, return `rzpOrderId` → Checkout.js on client → on success, **server verifies signature** (and the **webhook** is the real source of truth, with idempotency on `rzpPaymentId`) → mark `PAID` + `CONFIRMED` → decrement stock commit → send email + invoice.
5. **COD path:** if **COD-OTP is enabled in admin settings**, verify a phone OTP before the order is accepted (cuts fake COD orders); then mark `CONFIRMED` (payment `PENDING`), decrement stock, send confirmation email. The OTP requirement is a **store setting the admin toggles** (`otp.toggle` permission) — off by default, switch on without code changes. The OTP is a **`HIGH`-priority notification** (§6.14) dispatched inline; if the send fails, the checkout step blocks with a retry prompt (the customer can't proceed without the code).
6. **Idempotency:** a checkout idempotency key prevents double orders on double-click / retry.

### 6.4 Email + invoice
- On `CONFIRMED`: a **`HIGH`-priority notification** (§6.14) carries the order confirmation with **order number** + summary; the worker regenerates the invoice PDF (react-pdf) from the order snapshot at send time and attaches it. A failed send never blocks the order — it just retries.
- Invoice number scheme separate from order number; store generated invoices.

### 6.5 Caching & "clear cache" (admin)
- Public pages tagged: `products`, `product:{slug}`, `categories`.
- Editing a product/category in admin → `revalidateTag()` automatically.
- **Admin "Clear cache" button** → endpoint calling `revalidateTag('products')` / `revalidatePath('/')` etc. Document explicitly **what is cacheable** (catalog, home, category, **collections, blog**) vs **never cached** (cart, checkout, admin, account, any per-user data).

### 6.6 Customer accounts (optional)
- Buying never requires an account — guest checkout is the default path. Accounts are **opt-in**: register from the navbar, or "create an account" offered on the order-confirmation screen (pre-fills from the just-placed order, sets a password).
- Customer session is **fully separate** from admin (own cookie + `Customer` table). An account unlocks: order history, wishlist, faster checkout (saved address), and review attribution.
- When a logged-in customer checks out, `Order.customerId` is set; pure-guest orders leave it null.
- **Admin setting `customerAccounts`:** `OPTIONAL` (default — guest checkout + accounts), `REQUIRED` (must log in to order; enforced in `/api/checkout`, not just the UI), `OFF` (account pages/APIs 404, navbar link hidden, sessions ignored).
- **Login:** email + password, or a 6-digit **email code** (which also signs up a new email). Codes/links are stored only as HMACs (`CustomerToken`) and redacted in the outbox once sent; cooldown 30s, 5/hour per email; 5 bad passwords lock that email for 15 min (in memory — single PM2 process).
- **Session:** `customer_token` JWT signed with a key *derived* from `AUTH_SECRET` (so it can never verify as an admin token). It carries `tokenVersion`, re-checked on every read: password change/reset logs out every other device.
- **Guest-order linking:** past guest orders with the same email attach only once the inbox is proven (verify link, email code, or password reset). The confirmation-page signup links its own order immediately (the tracking token proves it), within 24h of the order.
- **Saved address** fills checkout; the first logged-in order saves it if none exists. **Wishlist** is stored server-side (`CustomerWishlistItem`) while logged in; on login this browser's items are merged in, on logout the local copy is cleared.

### 6.7 Reviews & ratings
- Submit from the product page. **Verified-purchase** = the email/customer has a `DELIVERED` order containing that product → `isVerified = true`.
- All reviews land `PENDING` → **admin moderation** (`APPROVED`/`REJECTED`) before they show — kills spam.
- On approve, recompute and denormalize `Product.ratingAvg` / `ratingCount` (used for sort + badges + JSON-LD `AggregateRating`).

### 6.8 Search, filter, sort & infinite scroll
- **Search:** MySQL `FULLTEXT` over name/description/tags via `/api/search`, with debounced autocomplete.
- **Filter:** category, collection, price range, in-stock, "on sale" (`mrpPaise > pricePaise`) → indexed SQL `WHERE`.
- **Sort:** price ↑/↓, popularity (`ratingAvg`/sales), newest.
- **Pagination:** real crawlable URLs (`/products?page=2`, `rel=prev/next`, canonical) are the source of truth; the **infinite scroll just fetches the next `?page=N`** as you scroll and updates the URL. SEO/deep-link/back-button all keep working; no SEO penalty from a pure JS feed.

### 6.9 Order tracking (guest)
- **Lookup page** `/track`: enter order # + email → server matches both → shows status timeline. (Email acts as the shared secret; rate-limited to stop enumeration.)
- **Magic link:** every confirmation email links to `/order/{trackingToken}` (unguessable per-order token) → private status page, no login. Both paths read the same order-status view.

### 6.10 Abandoned-cart recovery
- Email is captured at checkout step 1 (or from the logged-in customer) → stored on `Cart.email`.
- A **scheduled job** (node-cron, same scheduler as the notification worker §6.14) finds carts with `email` set, items present, `convertedToOrderId = null`, older than N hours, under the reminder cap → enqueues a **`NORMAL`-priority** recovery notification (optionally with a coupon). `remindersSent`/`lastReminderAt` throttle it; converting to an order stops it. Toggle via `Setting.abandonedCartOn`.

### 6.11 Wishlist / back-in-stock / recently-viewed
- **Wishlist:** **Zustand store + localStorage** (`src/store/wishlist.ts`); works without login. Heart icon on product cards and detail page, navbar wishlist button with count badge, dedicated `/wishlist` page. Stored items include variantId, productSlug, name, label, price, image. Syncs to a DB `WishlistItem` when customer accounts are added.
- **Back-in-stock:** on an out-of-stock variant, capture an email → `BackInStockSubscription`; when stock is replenished (admin edit / order cancel), notify subscribers once (`notifiedAt`).
- **Recently-viewed:** **client-side only** (cookie/localStorage list of slugs, rendered as a strip) — no DB model needed.

### 6.12 Newsletter, announcement bar & promo strip
- **Newsletter:** footer/popup capture → `/api/newsletter` → `NewsletterSubscriber` with **double opt-in** (confirm email) before marketing sends; one-click unsubscribe.
- **Announcement bar:** driven by `Setting.announcementText`/`Href`; admin edits copy + link, no deploy. Part of the cached storefront shell (revalidated on settings save).
- **Promo strip:** a thin bar **above the navbar** that fades through one item at a time. `/api/promo-strip` merges active `PromoMessage` rows **and** active/non-expired/non-exhausted coupons, auto-labelling each coupon from its `code`/`type`/`minOrderPaise` (a coupon's `description`, if set, overrides the auto-label). Separate from the announcement bar. `PromoStrip` is a client component (fetches the route, `revalidate = 60`).
- **Feature cards:** `FeatureCard` rows render as a grid **below the banner carousel** on the home page; column count (2/3/4) is the global `Setting.featureCardGrid`. Server-rendered (degrades to hidden if the query fails).

### 6.13 Blog / content
- Admin-authored `BlogPost` (markdown/MDX), `DRAFT` → `PUBLISHED`. Rendered **SSG + ISR**, tagged `blog` / `blog:{slug}`. `Article` JSON-LD + sitemap entries. Primary organic-SEO channel for the organic-foods niche (recipes, sourcing, health).

### 6.14 Notification delivery (outbox + drivers)
Every outbound message — order confirmation, COD-OTP, abandoned-cart, back-in-stock, newsletter/double-opt-in — is **persisted to the `Notification` outbox table first, then dispatched**. Call sites never touch a provider SDK; they call one facade (`notify({ channel, priority, to, template, data })`) which renders the body, writes the row, and — for urgent messages — sends it inline. This gives a single audit trail you can **inspect in the database in production**, plus a retry safety net.

**Dispatch by priority (one table, one code path, timing varies):**
- **`HIGH`** (COD-OTP, order confirmation) → row written, then **dispatched inline in the same request**. The customer doesn't wait on a cron.
- **`NORMAL` / `LOW`** (abandoned-cart, newsletter, back-in-stock) → row written `PENDING`; the **worker** picks it up. No inline send.

**The worker (in-process `node-cron`, same scheduler as the abandoned-cart job §6.10):**
- Runs frequently (≈ every minute). Atomically **claims** a batch: `UPDATE … SET status='SENDING' WHERE status='PENDING' AND scheduledFor <= now()` with row locking (`SELECT … FOR UPDATE SKIP LOCKED`) so **multiple PM2 instances never double-send**.
- Dispatches each via the channel driver → on success `SENT` (+ redact, below); on failure `attempts++`, record `lastError`, set `scheduledFor` to an **exponential backoff**, drop back to `PENDING`.
- **Retry window ("1–2 days"):** `attempts` + backoff schedule span ≈ 24–48 h. When `attempts >= maxAttempts`, the row is marked **`FAILED`** (terminal) and surfaced in the admin Marketing/notifications view.
- **Invoice attachment:** for confirmation rows, `attachInvoiceForOrderId` is set and the worker **regenerates the PDF from the (immutable) order snapshot at send time** — the blob is never stored on the row.

**Immediate (HIGH) send failure:**
- The inline attempt failing just leaves the row `PENDING` → the worker retries it in the background.
- **OTP** additionally **blocks the checkout step** with a "couldn't send code, retry" error — the customer can't proceed without it.
- **Confirmation** never blocks: the order already succeeded; the email simply arrives once a retry lands.

**Sensitive content (OTP codes, magic-link tokens):**
- Stored in the body **only while `PENDING`** (the worker needs it to send). On `SENT`, the OTP/token is **redacted in place** (`••••`) so the audit row records "an OTP was sent to X at T", not a live secret. Magic-link tokens also live on `Order.trackingToken` regardless.

**Drivers (selected from `.env` at runtime; channel- and provider-agnostic):**
- `EMAIL_DRIVER` = `log` (default) | `resend`
- `SMS_DRIVER` = `log` (default; **no real SMS provider wired yet** — MSG91/Twilio slot in here later, §6.3)
- **`log` driver (dev/staging default):** writes the rendered message to **both** `logs/notifications.log` (gitignored, runtime-created) **and stdout** (`npm run dev` / `pm2 logs`). Nothing leaves the server — so every flow incl. COD-OTP and magic-links is exercisable with **zero third-party signup**. Read the OTP/link straight from the log (or the DB row).
- **Real drivers** read credentials from `.env` only (`RESEND_API_KEY`, `EMAIL_FROM`; later `MSG91_*` / `TWILIO_*`). A real driver selected **without** its credentials **fails fast at startup** — never a silent fallback to `log` (a silent fallback in prod = customers get no email and nobody notices).
- Adding Resend, an SMS provider, or WhatsApp later = one new driver file + one env value. No call-site or outbox changes.

**Retention:** a cleanup task purges **`SENT` rows older than 30 days**; **`FAILED` rows are kept** until manually cleared (investigation). Bounded growth, audit window preserved.

**Idempotency:** a `dedupeKey` (e.g. `otp:order:123`, `confirmation:order:123`) makes re-enqueue a no-op — protects against double-click / retry double-sends, complementing the checkout idempotency key (§6.3).

**`.env` contract:**
```bash
# Notifications — drivers chosen here; default 'log' sends nothing real
EMAIL_DRIVER=log            # log | resend
SMS_DRIVER=log              # log   (only driver for v1)
NOTIFICATION_LOG_FILE=logs/notifications.log   # log driver output (also echoed to stdout)
# Required only when a real email driver is selected:
# EMAIL_DRIVER=resend
# RESEND_API_KEY=
# EMAIL_FROM="Organic Foods <orders@example.com>"
```
`.env.example` ships with `EMAIL_DRIVER=log` / `SMS_DRIVER=log` so a fresh clone runs end-to-end with no external accounts.

---

## 7. Admin panel scope (WooCommerce-lite)

- **Dashboard:** revenue (today / 7d / 30d), order count by status, top products, low-stock alerts, recent orders, COD vs prepaid split.
- **Orders:** list + filters (status, method, date), detail view, status transitions, resend email, download invoice, refund flag.
- **Products:** CRUD, variants (with weightGrams), stock, **MRP/compare-at price**, images (with **thumbnail toggle**), **tagline + dual descriptions** (short + full), tags/highlights/benefits/nutrition, active/featured toggle, SEO fields, related-products picker.
- **Collections:** CRUD; manual product picker (with ordering) **or** automated rules (tag/price/in-stock).
- **Reviews:** moderation queue (approve/reject); recompute product rating on approve.
- **Blog:** post CRUD, draft/publish, SEO fields, **cover image upload + URL paste**.
- **Customers:** list accounts, view order history, deactivate.
- **Marketing:** newsletter subscriber list + export, abandoned-cart view, announcement-bar editor.
- **Coupons:** CRUD with all rule fields + **description** for admin context.
- **Banners:** CRUD for home page carousel banners (image upload + URL, title, subtitle, CTA text/link, sort order, active toggle).
- **Feature Cards:** CRUD for the home page promo grid (image upload + URL, title, subtitle, link, sort order, active toggle) + a global 2/3/4 column toggle (`Setting.featureCardGrid`).
- **Promo Strip:** CRUD for `PromoMessage` lines shown in the rotating bar above the navbar; active coupons are merged in automatically (no entry needed).
- **Settings:** flat shipping, free-ship threshold, COD fee, store email, **announcement bar**, **abandoned-cart toggle**, cache controls, analytics IDs.
- *Deliberately excluded vs WooCommerce:* multi-vendor, subscriptions, plugins/extensions marketplace, complex tax matrices, full CRM. **Forums deferred to post-launch.**

### 7.1 Role-based access control (RBAC)

The store owner can create staff accounts and grant **granular permissions** — not just pick from fixed roles.

- **Permissions** are fine-grained capability keys, grouped for the UI. Seeded list:
  - **Dashboard:** `dashboard.view`, `analytics.view`
  - **Orders:** `orders.view`, `orders.edit`, `orders.update_status`, `orders.refund`, `orders.resend_email`
  - **Products:** `products.view`, `products.create`, `products.edit`, `products.delete`, `products.manage_stock`
  - **Merchandising:** `collections.manage`, `reviews.moderate`, `blog.manage`
  - **Marketing:** `marketing.view`, `newsletter.manage`, `announcement.manage`
  - **Customers:** `customers.view`, `customers.manage`
  - **Coupons:** `coupons.view`, `coupons.manage`
  - **Settings:** `settings.manage`, `cache.clear`, `otp.toggle` *(COD-OTP on/off — see §6.3)*
  - **Users:** `users.view`, `users.manage`, `roles.manage`
- **Roles** bundle permissions. The **Owner** role is a system role: holds every permission, cannot be edited or deleted. The owner can create any number of custom roles (e.g. "Order Manager" = orders.* + dashboard.view) and assign one to each staff member.
- **Enforcement is two-layered and server-authoritative:**
  1. **Server:** every admin Route Handler calls `requirePermission('orders.update_status')`; missing permission → 403. Never rely on the UI alone.
  2. **UI:** `useHasPermission(key)` hides/disables actions the user can't perform, so staff only see what they're allowed to do.
- Permission checks read from the session/role at request time, so revoking a permission takes effect immediately (no stale client state grants access).

---

## 8. SEO & analytics

- **Metadata API** per page (title/description/canonical/OpenGraph).
- **Structured data (JSON-LD):** `Product` + `Offer` (price, availability) **+ `AggregateRating` from approved reviews**, `BreadcrumbList`, `Organization`, **`Article` on blog posts**, `ItemList` on collection pages.
- **Crawlable pagination:** product/collection lists expose real `?page=N` URLs with `rel=prev/next` + canonicals; infinite scroll sits on top (§6.8) so the JS feed never costs indexability.
- **Collection & blog pages** are SSG+ISR and first-class SEO landing pages (high-intent keywords like "buy organic cold-pressed oil").
- **`sitemap.ts`** (all products/categories/**collections/blog posts**) + **`robots.ts`**.
- Semantic HTML, `next/image` with proper `alt`, fast LCP on banner.
- **GTM container** + **GA4** with ecommerce events: `view_item`, `add_to_cart`, `begin_checkout`, `add_payment_info`, `purchase`.
- **Cookie consent** banner gating analytics (good practice; required for some regions).

---

## 8.1 UX quality bar — "smooth like Shopify"

This is a first-class requirement, not polish-at-the-end. Concretely:

- **Instant navigation:** `next/link` prefetching, route transitions, and SSG pages so moving between catalog pages feels immediate.
- **Optimistic UI:** add-to-cart, qty changes, and coupon apply update the UI instantly, then reconcile with the server — no full-page reloads.
- **Skeletons, not spinners:** skeleton loaders for product grids/detail while data streams in; use React Suspense + streaming.
- **No layout shift (CLS≈0):** reserve image dimensions via `next/image`, stable layouts so nothing jumps.
- **Micro-interactions:** Framer Motion for the banner, scroll-reveal of product sections, add-to-cart fly/badge bump, cart drawer slide-in, animated go-to-top, button/hover states.
- **Fast LCP:** optimize the hero banner image (priority load, modern formats), minimal blocking JS.
- **Feedback everywhere:** toasts for success/error, inline form validation (react-hook-form + Zod), disabled+spinner states on submit.
- **Mobile-first & responsive:** responsive navbar with animated mobile menu, touch-friendly targets, smooth drawer.
- **Accessibility:** keyboard nav, focus states, ARIA on interactive components, `prefers-reduced-motion` respected.
- **Performance budget:** track Core Web Vitals (LCP/CLS/INP) in GA4; keep bundle lean (code-split admin away from storefront).

## 9. Security & ops

- All inputs Zod-validated at the route boundary; Prisma parameterizes SQL.
- **Never trust client prices/totals** — recompute server-side.
- Razorpay **webhook signature verification** + secret; idempotent handling.
- Admin: hashed passwords (argon2/bcrypt), role checks in middleware + per-route, rate-limit login.
- Rate-limit + spam-protect contact form & checkout (hCaptcha/Turnstile).
- Secrets in `.env` (never committed); separate keys for test/live Razorpay & Resend.
- **Notification outbox (§6.14):** rows hold rendered messages that can contain **OTPs, magic-link tokens, emails/phones**. Live secrets exist only while a row is `PENDING`; once `SENT` the OTP/token is **redacted in place**. Retention purges `SENT` after 30 days. The worker claims rows with row-level locking (`FOR UPDATE SKIP LOCKED`) so **multiple PM2 instances can't double-send**.
- **Notification `log` driver:** writes the same rendered content to `logs/notifications.log`. That file is **gitignored**, kept out of any bundle, **not redacted**, and is a **dev/staging tool only**; production uses a real driver. Treat the log dir as sensitive (don't ship it, don't world-read it).
- **MySQL backups** (scheduled dump) + retention.
- Error monitoring (Sentry) + structured logs.
- Resend domain auth (SPF/DKIM) for deliverability (when `EMAIL_DRIVER=resend`).

---

## 10. Phased roadmap (manager view)

**Phase 0 — Foundations (week 1)**
Repo, Next.js+TS, Tailwind, Prisma schema + migrations, seed, env config, PM2 deploy skeleton, CI lint/build.

**Phase 1 — Catalog & storefront (MVP-visible)**
Home (banner/products/contact/footer), product list/detail with **MRP/discount badges**, **collections**, **search + filter + sort + infinite scroll**, **related products**, responsive navbar, go-to-top, animations, SEO basics. SSG+ISR.

**Phase 2 — Cart & checkout**
Server cart (with **email capture** for recovery), address form, coupon apply, shipping/COD-fee logic, order creation (transactional + stock), **trackingToken**.

**Phase 3 — Payments & fulfillment**
Razorpay order+webhook+verification, COD (+OTP), **notification outbox + in-process worker + driver abstraction (`log` default)** (§6.14), confirmation email, invoice PDF, **guest order tracking (lookup + magic link)**. (Real Resend/SMS drivers swap in by env when credentials exist.)

**Phase 4 — Customer accounts & engagement**
Optional customer auth (register/login, order history), **reviews & moderation**, **wishlist**, **back-in-stock**, **newsletter (double opt-in) + announcement bar**, **abandoned-cart recovery job**, **blog**.

**Phase 5 — Admin panel**
Auth + roles, dashboard, orders, products/variants/stock/MRP, collections, reviews moderation, blog, customers, marketing, coupons, settings, cache controls.

**Phase 6 — Polish & launch**
GTM/GA4 ecommerce events, structured data (incl. `AggregateRating`/`Article`), sitemap/robots, legal pages, performance pass, backups, monitoring, load/UAT.

**Post-launch (deferred):** community **forum**, SMS/WhatsApp order updates, courier/pincode integration (Shiprocket/Delhivery), GST if registered.

---

## 11. Status of open questions

**Resolved**
- ✅ **COD abuse:** phone OTP, **toggleable from admin settings** (off by default).
- ✅ **Payment-failure stock:** reserve-then-release-on-timeout for prepaid orders (no permanent lock from abandoned payments).
- ✅ **Order/price snapshots, coupon engine, integer-paise money, ISR cache scope, GA4+structured-data SEO, backups+monitoring:** all in scope (§5, §6, §8, §9).
- ✅ **RBAC:** owner-managed roles + granular permissions (§7.1).
- ✅ **Customer accounts:** guest checkout **+ optional** email/password accounts — overturns the old "guest-only" stance to enable reviews/wishlist (§6.6).
- ✅ **Merchandising:** MRP/compare-at price, collections (manual + automated), related/cross-sell, reviews+ratings, search/filter/sort, crawlable infinite scroll (§5, §6.7–6.8).
- ✅ **Retention/marketing:** abandoned-cart recovery, newsletter + announcement bar, blog, wishlist/back-in-stock/recently-viewed (§6.10–6.13).
- ✅ **Order tracking:** guest lookup (order # + email) **and** magic-link both in scope (§6.9).
- ✅ **Forums:** **deferred to post-launch** — v1 ships reviews instead (§7, roadmap).
- ✅ **Notifications:** **email-only for v1**; SMS/WhatsApp order updates deferred. Every message is **persisted to a `Notification` outbox table, then dispatched** via a **driver abstraction** (§6.14) — `EMAIL_DRIVER`/`SMS_DRIVER` in `.env`, defaulting to a **`log` driver** (writes to `logs/notifications.log` + stdout). HIGH (OTP, confirmation) sends inline; the rest go via an in-process `node-cron` worker with exponential backoff over a ~1–2 day retry window, then `FAILED`. Secrets redacted on send; `SENT` purged after 30d, `FAILED` kept. Missing real-driver creds = **fail fast at startup** (no silent fallback). The DB outbox is the **production-inspectable audit trail**; Resend / an SMS provider drop in by changing one env var. No real SMS provider wired yet.

**Legal/policy pages — to build (Indian e-commerce + Razorpay activation requirement)**
Razorpay will not go live without these, and Indian consumer-protection norms expect them:
- Privacy Policy
- Terms & Conditions / Terms of Use
- Refund & Cancellation Policy
- Shipping & Delivery Policy
- Contact Us (business name, address, email, phone)
- *(Recommended)* About Us
> Build the pages + routes now with placeholder copy; replace with reviewed legal copy before launch.

- ✅ **Admin auth:** resolved — custom JWT-cookie layer using `jose`. bcrypt passwords, httpOnly cookie, remember-me support. Owner + Super Manager + custom roles (§7.1).
- ✅ **Design:** "Verdant" brand — forest green (#24503a), cream (#faf8f3), honey (#d9923f) palette. Fraunces display font + Inter body. Leaf SVG favicon. Tailwind v4 `@theme` tokens.
- ✅ **State management:** Zustand + localStorage (not Redux). Cart drawer, wishlist — all client-side stores.
- ✅ **Product detail UX:** tagline, dual descriptions, image gallery with zoom (react-medium-image-zoom), thumbnail selection, wishlist button, 5-star ratings.
- ✅ **Home page carousel:** admin-managed banners via embla-carousel-react with autoplay, prev/next, dot indicators.
- ✅ **Error pages:** custom 404, error boundary, global error — all branded.
- ✅ **Admin layout:** `StoreShell` component hides public navbar/footer on admin routes (including login).

**Still open (deferred)**
1. **GST** — currently prices tax-inclusive, no GST breakup on invoices. If you register for GST, we add GSTIN/HSN + tax breakup. Confirm so we don't retrofit later.
2. **Product images** — shared-server disk (simple, must be backed up) vs external bucket/CDN (better SEO/perf).
3. **Shipping later** — pincode serviceability checks / courier integration (Shiprocket/Delhivery)?
```
