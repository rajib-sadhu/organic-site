// Database seed — idempotent. Run with `npm run db:seed` (after db:deploy/migrate).
// Uses relative imports (tsx does not resolve the `@/*` tsconfig alias).
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PERMISSIONS } from "../src/lib/permissions";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
const prisma = new PrismaClient({ adapter });

async function seedRbac() {
  // 1. Permissions
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { label: p.label, group: p.group },
      create: p,
    });
  }
  const allPerms = await prisma.permission.findMany();

  // 2. Owner role — system role, holds every permission, cannot be deleted.
  const owner = await prisma.role.upsert({
    where: { name: "Owner" },
    update: { isSystem: true, description: "Full access. System role." },
    create: { name: "Owner", isSystem: true, description: "Full access. System role." },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: owner.id } });
  await prisma.rolePermission.createMany({
    data: allPerms.map((perm) => ({ roleId: owner.id, permissionId: perm.id })),
  });

  // 3. Example custom role to demonstrate granular grants.
  const orderMgrKeys = [
    "dashboard.view",
    "orders.view",
    "orders.edit",
    "orders.update_status",
    "orders.resend_email",
  ];
  const orderMgr = await prisma.role.upsert({
    where: { name: "Order Manager" },
    update: { description: "Handles orders only." },
    create: { name: "Order Manager", description: "Handles orders only." },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: orderMgr.id } });
  await prisma.rolePermission.createMany({
    data: allPerms
      .filter((perm) => orderMgrKeys.includes(perm.key))
      .map((perm) => ({ roleId: orderMgr.id, permissionId: perm.id })),
  });

  // 4. Owner admin user (credentials from env).
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@organic.test";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const name = process.env.SEED_ADMIN_NAME ?? "Store Owner";
  const passwordHash = bcrypt.hashSync(password, 10);
  await prisma.adminUser.upsert({
    where: { email },
    update: { name, roleId: owner.id, isActive: true },
    create: { email, name, passwordHash, roleId: owner.id },
  });
  console.log(`  ✓ RBAC seeded. Owner login: ${email}`);
}

async function seedSettings() {
  await prisma.setting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      storeName: "Organic Foods",
      storeEmail: process.env.EMAIL_FROM ?? null,
      flatShippingPaise: 4900, // ₹49 flat shipping
      freeShipOverPaise: 49900, // free over ₹499
      codFeePaise: 3000, // ₹30 extra for COD
      codOtpRequired: false,
      gstEnabled: false,
    },
  });
  console.log("  ✓ Settings seeded.");
}

type SeedProduct = {
  slug: string;
  name: string;
  description: string;
  featured?: boolean;
  variants: { label: string; pricePaise: number; stock: number }[];
};

const CATALOG: { category: string; slug: string; products: SeedProduct[] }[] = [
  {
    category: "Grains & Pulses",
    slug: "grains-pulses",
    products: [
      {
        slug: "organic-basmati-rice",
        name: "Organic Basmati Rice",
        description: "Aromatic, long-grain basmati grown without synthetic pesticides.",
        featured: true,
        variants: [
          { label: "500g", pricePaise: 12000, stock: 50 },
          { label: "1kg", pricePaise: 22000, stock: 40 },
          { label: "5kg", pricePaise: 99000, stock: 15 },
        ],
      },
      {
        slug: "organic-toor-dal",
        name: "Organic Toor Dal",
        description: "Protein-rich split pigeon peas, unpolished and chemical-free.",
        variants: [
          { label: "500g", pricePaise: 9000, stock: 60 },
          { label: "1kg", pricePaise: 17000, stock: 35 },
        ],
      },
    ],
  },
  {
    category: "Cold-Pressed Oils",
    slug: "cold-pressed-oils",
    products: [
      {
        slug: "cold-pressed-coconut-oil",
        name: "Cold-Pressed Coconut Oil",
        description: "Wood-pressed virgin coconut oil. Cooking and skincare grade.",
        featured: true,
        variants: [
          { label: "250ml", pricePaise: 18000, stock: 45 },
          { label: "500ml", pricePaise: 33000, stock: 30 },
          { label: "1L", pricePaise: 62000, stock: 20 },
        ],
      },
    ],
  },
  {
    category: "Honey & Sweeteners",
    slug: "honey-sweeteners",
    products: [
      {
        slug: "raw-forest-honey",
        name: "Raw Forest Honey",
        description: "Unprocessed, unheated wild honey harvested from forest hives.",
        featured: true,
        variants: [
          { label: "250g", pricePaise: 25000, stock: 40 },
          { label: "500g", pricePaise: 45000, stock: 25 },
        ],
      },
    ],
  },
];

async function seedCatalog() {
  for (let c = 0; c < CATALOG.length; c++) {
    const cat = CATALOG[c];
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.category, sortOrder: c },
      create: { slug: cat.slug, name: cat.category, sortOrder: c },
    });

    for (const p of cat.products) {
      const product = await prisma.product.upsert({
        where: { slug: p.slug },
        update: {
          name: p.name,
          description: p.description,
          categoryId: category.id,
          isFeatured: p.featured ?? false,
          metaTitle: p.name,
          metaDescription: p.description,
        },
        create: {
          slug: p.slug,
          name: p.name,
          description: p.description,
          categoryId: category.id,
          isFeatured: p.featured ?? false,
          metaTitle: p.name,
          metaDescription: p.description,
        },
      });

      for (const v of p.variants) {
        const sku = `${p.slug}-${v.label}`.toUpperCase().replace(/[^A-Z0-9]+/g, "-");
        await prisma.productVariant.upsert({
          where: { sku },
          update: { pricePaise: v.pricePaise, stock: v.stock, label: v.label },
          create: {
            sku,
            label: v.label,
            pricePaise: v.pricePaise,
            stock: v.stock,
            productId: product.id,
          },
        });
      }
    }
  }
  console.log("  ✓ Catalog seeded.");
}

async function seedCoupons() {
  await prisma.coupon.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: {
      code: "WELCOME10",
      type: "PERCENT",
      percent: 10,
      minOrderPaise: 0,
      isActive: true,
    },
  });
  await prisma.coupon.upsert({
    where: { code: "FREESHIP" },
    update: {},
    create: {
      code: "FREESHIP",
      type: "FREE_SHIP",
      minOrderPaise: 30000, // ₹300+
      isActive: true,
    },
  });
  console.log("  ✓ Coupons seeded.");
}

async function main() {
  console.log("Seeding database...");
  await seedRbac();
  await seedSettings();
  await seedCatalog();
  await seedCoupons();
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
