// Database seed — idempotent. Run with `npm run db:seed` (after db:deploy/migrate).
// Uses relative imports (tsx does not resolve the `@/*` tsconfig alias).
import "dotenv/config";
import bcrypt from "bcryptjs";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";
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

// ---------------------------------------------------------------------------
// Catalog seed — realistic Indian organic food products
// ---------------------------------------------------------------------------

const IMG = (id: string) =>
  `https://images.unsplash.com/${id}?w=800&h=800&fit=crop&q=80`;

type SeedVariant = {
  label: string;
  pricePaise: number;
  mrpPaise?: number;
  stock: number;
  weightGrams?: number;
};

type SeedProduct = {
  slug: string;
  name: string;
  tagline: string;
  shortDescription: string;
  description: string;
  featured?: boolean;
  tags?: string[];
  highlights?: string[];
  benefits?: string[];
  howToUse?: string;
  ingredients?: string;
  nutritionInfo?: Record<string, string>;
  shelfLife?: string;
  storage?: string;
  images: { url: string; alt: string }[];
  variants: SeedVariant[];
};

type SeedCategory = {
  category: string;
  slug: string;
  products: SeedProduct[];
};

const CATALOG: SeedCategory[] = [
  // ── Grains & Millets ─────────────────────────────────────────────────
  {
    category: "Grains & Millets",
    slug: "grains-millets",
    products: [
      {
        slug: "organic-basmati-rice",
        name: "Organic Basmati Rice",
        tagline: "Aged long-grain perfection from the foothills of the Himalayas",
        shortDescription:
          "Premium aged basmati rice, grown organically in the Dehradun valley. Each grain elongates to nearly twice its length when cooked.",
        description:
          "Our organic basmati rice is sourced directly from certified farms in the Dehradun valley of Uttarakhand. Aged for 12 months in traditional granaries, each grain cooks up fluffy, separate, and incredibly aromatic. Free from synthetic pesticides, chemical fertilizers, and GMOs. The naturally nutty aroma and delicate flavor make it perfect for biryanis, pulaos, and everyday meals. FSSAI certified and tested for zero pesticide residue.",
        featured: true,
        tags: ["BESTSELLER", "CERTIFIED_ORGANIC"],
        highlights: [
          "12-month aged for maximum aroma",
          "Pesticide-residue free — lab tested",
          "Grains elongate 1.8x on cooking",
          "FSSAI & India Organic certified",
        ],
        benefits: [
          "Low glycemic index compared to regular rice",
          "Good source of B vitamins",
          "Naturally gluten-free",
          "Easy to digest",
        ],
        howToUse:
          "Rinse 1 cup rice 2–3 times. Soak for 30 minutes. Boil with 1.5 cups water for 15–18 minutes. Fluff with fork and serve.",
        ingredients: "100% Organic Basmati Rice (Oryza sativa)",
        nutritionInfo: {
          "Serving Size": "100g (uncooked)",
          Calories: "348 kcal",
          Protein: "8.5g",
          Carbohydrates: "77g",
          Fat: "0.6g",
          Fiber: "1.0g",
          Iron: "1.2mg",
        },
        shelfLife: "18 months from date of packaging",
        storage: "Store in a cool, dry place in an airtight container. Keep away from moisture.",
        images: [
          { url: IMG("photo-1586201375761-83865001e31c"), alt: "Organic basmati rice grains close-up" },
          { url: IMG("photo-1536304993881-ff6e9eefa2a6"), alt: "Basmati rice in a traditional container" },
        ],
        variants: [
          { label: "1 kg", pricePaise: 22500, mrpPaise: 27500, stock: 80, weightGrams: 1000 },
          { label: "5 kg", pricePaise: 99900, mrpPaise: 125000, stock: 30, weightGrams: 5000 },
          { label: "10 kg", pricePaise: 185000, mrpPaise: 240000, stock: 15, weightGrams: 10000 },
        ],
      },
      {
        slug: "organic-brown-rice",
        name: "Organic Brown Rice",
        tagline: "Whole grain goodness with the bran intact",
        shortDescription:
          "Unpolished brown rice retaining the nutrient-rich bran and germ layers. A fibre-rich alternative to white rice.",
        description:
          "Our organic brown rice is minimally processed to retain the outer bran layer, packing significantly more fibre, magnesium, and B vitamins than polished white rice. Grown in the fertile plains of Chhattisgarh without chemical inputs. The slightly chewy texture and earthy, nutty flavor pair beautifully with dals, curries, and stir-fries. Ideal for health-conscious families looking to improve their daily grain intake.",
        featured: false,
        tags: ["HIGH_FIBER"],
        highlights: [
          "Unpolished — retains bran & germ",
          "3× more fibre than white rice",
          "Rich in magnesium & selenium",
          "Sourced from Chhattisgarh farms",
        ],
        benefits: [
          "Supports healthy digestion",
          "Helps regulate blood sugar levels",
          "Rich in antioxidants",
          "Promotes heart health",
        ],
        howToUse:
          "Soak for 1 hour. Cook 1 cup rice in 2.5 cups water for 35–40 minutes. Let rest 10 minutes before opening the lid.",
        ingredients: "100% Organic Brown Rice (Oryza sativa)",
        nutritionInfo: {
          "Serving Size": "100g (uncooked)",
          Calories: "362 kcal",
          Protein: "7.5g",
          Carbohydrates: "76g",
          Fat: "2.7g",
          Fiber: "3.4g",
          Magnesium: "143mg",
        },
        shelfLife: "12 months from date of packaging",
        storage: "Store in a cool, dry place. Refrigerate after opening during summer months.",
        images: [
          { url: IMG("photo-1589302168068-964664d93dc0"), alt: "Organic brown rice grains" },
        ],
        variants: [
          { label: "1 kg", pricePaise: 17500, mrpPaise: 21000, stock: 60, weightGrams: 1000 },
          { label: "5 kg", pricePaise: 79900, mrpPaise: 95000, stock: 25, weightGrams: 5000 },
        ],
      },
      {
        slug: "organic-ragi-flour",
        name: "Organic Ragi Flour (Finger Millet)",
        tagline: "The ancient supergrain of South India",
        shortDescription:
          "Stone-ground ragi flour from Karnataka. Loaded with calcium and iron — a nutritional powerhouse for all ages.",
        description:
          "Ragi (finger millet) has been a staple of South Indian diets for centuries and is now recognised globally as a superfood. Our ragi flour is stone-ground from whole organic finger millet sourced from smallholder farms in Hassan district, Karnataka. The slow stone-grinding process preserves the natural nutrients and imparts a distinctive earthy flavor. Perfect for making ragi mudde, dosa, roti, porridge, and baked goods. Exceptionally rich in calcium — ideal for growing children, pregnant women, and the elderly.",
        featured: true,
        tags: ["SUPERFOOD", "NEW_ARRIVAL"],
        highlights: [
          "Stone-ground from whole ragi grains",
          "3× more calcium than milk per serving",
          "Naturally gluten-free",
          "Karnataka origin — Hassan district",
        ],
        benefits: [
          "Strengthens bones and teeth",
          "Excellent source of plant-based iron",
          "Helps manage diabetes — low GI",
          "Aids weight management",
        ],
        howToUse:
          "For porridge: Mix 2 tbsp flour in cold water, add to 1 cup boiling water, stir for 5 minutes. For roti: Knead with warm water, roll and cook on tawa.",
        ingredients: "100% Organic Finger Millet Flour (Eleusine coracana)",
        nutritionInfo: {
          "Serving Size": "100g",
          Calories: "328 kcal",
          Protein: "7.3g",
          Carbohydrates: "72g",
          Fat: "1.3g",
          Fiber: "3.6g",
          Calcium: "344mg",
          Iron: "3.9mg",
        },
        shelfLife: "6 months from date of packaging",
        storage: "Store in an airtight container in a cool, dry place. Refrigerate in humid conditions.",
        images: [
          { url: IMG("photo-1633101143189-d28a58810351"), alt: "Organic ragi millet grains" },
          { url: IMG("photo-1634666328718-ad6af3112aff"), alt: "Ragi flour in a bowl" },
        ],
        variants: [
          { label: "500 g", pricePaise: 9900, mrpPaise: 12000, stock: 70, weightGrams: 500 },
          { label: "1 kg", pricePaise: 17900, mrpPaise: 22000, stock: 50, weightGrams: 1000 },
        ],
      },
    ],
  },

  // ── Pulses & Lentils ─────────────────────────────────────────────────
  {
    category: "Pulses & Lentils",
    slug: "pulses-lentils",
    products: [
      {
        slug: "organic-toor-dal",
        name: "Organic Toor Dal (Arhar)",
        tagline: "The everyday dal of Indian kitchens — now chemical-free",
        shortDescription:
          "Unpolished split pigeon peas rich in protein and dietary fibre. A staple for dal fry, sambar, and rasam.",
        description:
          "Our organic toor dal is sourced from rain-fed farms in Madhya Pradesh where pigeon peas have been cultivated for generations. Unlike polished supermarket dal, our unpolished toor dal retains its natural oils and nutrients. It cooks down into a rich, creamy consistency that's perfect for classic Indian preparations like dal tadka, sambar, dal fry, and rasam. Each batch is hand-sorted and cleaned. No artificial polishing, no oil coating, no chemical preservatives.",
        featured: false,
        tags: ["PROTEIN_RICH"],
        highlights: [
          "Unpolished — no oil coating",
          "22% protein content",
          "Hand-sorted and cleaned",
          "Madhya Pradesh origin",
        ],
        benefits: [
          "Excellent plant-based protein source",
          "Rich in folic acid — great for pregnancy",
          "High in dietary fibre",
          "Low fat, nutrient-dense",
        ],
        howToUse:
          "Wash and soak for 30 minutes. Pressure cook with 3× water for 3–4 whistles. Season with ghee, cumin, mustard seeds, and curry leaves.",
        ingredients: "100% Organic Split Pigeon Peas (Cajanus cajan)",
        nutritionInfo: {
          "Serving Size": "100g (uncooked)",
          Calories: "343 kcal",
          Protein: "22.3g",
          Carbohydrates: "62.8g",
          Fat: "1.7g",
          Fiber: "5.1g",
          "Folic Acid": "456μg",
        },
        shelfLife: "12 months from date of packaging",
        storage: "Store in an airtight container in a cool, dry place away from direct sunlight.",
        images: [
          { url: IMG("photo-1586201375799-47cd24c3f595"), alt: "Organic toor dal in a bowl" },
        ],
        variants: [
          { label: "500 g", pricePaise: 9500, stock: 80, weightGrams: 500 },
          { label: "1 kg", pricePaise: 17900, mrpPaise: 20000, stock: 60, weightGrams: 1000 },
          { label: "5 kg", pricePaise: 82500, mrpPaise: 95000, stock: 20, weightGrams: 5000 },
        ],
      },
      {
        slug: "organic-moong-dal",
        name: "Organic Moong Dal (Split Green Gram)",
        tagline: "Light, nourishing, and the easiest dal to digest",
        shortDescription:
          "Split and dehusked moong beans — the lightest dal, ideal for kids, the elderly, and anyone recovering from illness.",
        description:
          "Moong dal is regarded in Ayurveda as the most sattvic (pure) and easily digestible of all pulses. Our organic moong dal is sourced from Rajasthan's arid farms, where the crop thrives naturally with minimal water. Split and dehusked to cook quickly, it produces a mild, slightly sweet dal that's gentle on the stomach. Perfect for khichdi, dal, soups, and cheela (savoury pancakes). A go-to protein source for babies starting solids, post-surgery recovery diets, and everyday family meals.",
        featured: false,
        tags: ["EASY_DIGEST"],
        highlights: [
          "Ayurveda-recommended — most digestible pulse",
          "Cooks in under 20 minutes",
          "Rajasthan origin — low water footprint",
          "No chemical processing",
        ],
        benefits: [
          "Extremely easy to digest",
          "Rich in protein and potassium",
          "Good for weight management",
          "Safe for infants (6 months+)",
        ],
        howToUse:
          "Wash well. No soaking needed. Boil 1 cup dal in 3 cups water for 15–20 minutes until soft. Temper with ghee and spices.",
        ingredients: "100% Organic Split Moong Beans (Vigna radiata)",
        nutritionInfo: {
          "Serving Size": "100g (uncooked)",
          Calories: "347 kcal",
          Protein: "24.5g",
          Carbohydrates: "59.9g",
          Fat: "1.2g",
          Fiber: "4.1g",
          Potassium: "843mg",
        },
        shelfLife: "12 months from date of packaging",
        storage: "Keep in an airtight container. Store in a cool, dry place.",
        images: [
          { url: IMG("photo-1590616270818-f08142f85c6b"), alt: "Organic moong dal close-up" },
        ],
        variants: [
          { label: "500 g", pricePaise: 10500, stock: 75, weightGrams: 500 },
          { label: "1 kg", pricePaise: 19500, mrpPaise: 22000, stock: 55, weightGrams: 1000 },
        ],
      },
    ],
  },

  // ── Cold-Pressed Oils ────────────────────────────────────────────────
  {
    category: "Cold-Pressed Oils",
    slug: "cold-pressed-oils",
    products: [
      {
        slug: "cold-pressed-coconut-oil",
        name: "Cold-Pressed Virgin Coconut Oil",
        tagline: "Wood-pressed from fresh Kerala coconuts — cooking, skin, and hair",
        shortDescription:
          "Traditional wood-pressed (chekku) virgin coconut oil from Kerala. Multi-purpose — use for cooking, skin moisturising, and hair care.",
        description:
          "Our virgin coconut oil is extracted from fresh, mature coconuts using the traditional chekku (wood press) method in Kerala. Unlike refined coconut oil, this cold-pressed oil retains its natural lauric acid, medium-chain triglycerides (MCTs), and the characteristic mild coconut aroma. The oil is unbleached, undeodorized, and free from any chemical solvents. It solidifies below 25°C — a sign of purity. Excellent for South Indian cooking, oil pulling, baby massage, and as a natural hair conditioner.",
        featured: true,
        tags: ["BESTSELLER", "MULTI_USE"],
        highlights: [
          "Traditional chekku wood-pressed",
          "50% lauric acid content",
          "Unrefined, unbleached, no solvents",
          "Kerala origin — Kozhikode district",
        ],
        benefits: [
          "Rich in MCTs for quick energy",
          "Natural antimicrobial properties",
          "Excellent skin moisturiser",
          "Promotes healthy hair growth",
        ],
        howToUse:
          "Cooking: Use as your regular cooking oil for South Indian dishes. Hair: Warm slightly and massage into scalp 30 min before wash. Skin: Apply directly as a moisturiser.",
        ingredients: "100% Cold-Pressed Virgin Coconut Oil (Cocos nucifera)",
        nutritionInfo: {
          "Serving Size": "15ml (1 tbsp)",
          Calories: "120 kcal",
          "Total Fat": "14g",
          "Saturated Fat": "12g",
          "Lauric Acid": "6.6g",
          "Trans Fat": "0g",
        },
        shelfLife: "12 months from date of extraction",
        storage: "Store at room temperature away from direct sunlight. Oil solidifies below 25°C — this is normal.",
        images: [
          { url: IMG("photo-1474979266404-7eaacbcd87c5"), alt: "Cold-pressed coconut oil in a glass jar" },
          { url: IMG("photo-1560769680-ba2f3767c785"), alt: "Fresh coconuts and oil" },
        ],
        variants: [
          { label: "500 ml", pricePaise: 34900, mrpPaise: 42000, stock: 40, weightGrams: 460 },
          { label: "1 L", pricePaise: 64900, mrpPaise: 79000, stock: 25, weightGrams: 920 },
        ],
      },
      {
        slug: "cold-pressed-mustard-oil",
        name: "Cold-Pressed Mustard Oil (Kachi Ghani)",
        tagline: "Pungent, pure, and straight from the kolhu",
        shortDescription:
          "Traditional kachi ghani (cold-pressed) mustard oil from Rajasthan. The bold, pungent flavour that defines North Indian cooking.",
        description:
          "True kachi ghani mustard oil has a sharp, pungent aroma and a distinctive heat that's irreplaceable in North and East Indian cuisine. Our oil is extracted from organically grown black mustard seeds (Brassica nigra) using a traditional wooden kolhu at low temperatures, preserving the natural allyl isothiocyanate that gives mustard oil its signature kick. Perfect for tadkas, pickles (achar), fish curries, and paranthas. Also widely used in Bihar, Bengal, and Odisha as a hair and body massage oil.",
        featured: false,
        tags: ["TRADITIONAL"],
        highlights: [
          "Kachi ghani — wooden kolhu pressed",
          "Black mustard seeds from Rajasthan",
          "High smoke point (250°C)",
          "Rich in omega-3 (alpha-linolenic acid)",
        ],
        benefits: [
          "Heart-healthy monounsaturated fats",
          "Natural antibacterial properties",
          "Stimulates appetite and digestion",
          "Traditional remedy for joint pain",
        ],
        howToUse:
          "Cooking: Heat until it smokes slightly, then reduce heat before adding ingredients. Pickle: Use raw for authentic achar. Massage: Warm and apply for body massage.",
        ingredients: "100% Cold-Pressed Black Mustard Seed Oil (Brassica nigra)",
        nutritionInfo: {
          "Serving Size": "15ml (1 tbsp)",
          Calories: "124 kcal",
          "Total Fat": "14g",
          "MUFA": "8.3g",
          "PUFA": "2.9g",
          "Omega-3 (ALA)": "0.8g",
        },
        shelfLife: "9 months from date of extraction",
        storage: "Store in a cool, dark place. Keep bottle tightly closed after each use.",
        images: [
          { url: IMG("photo-1610547939489-73202bc6afda"), alt: "Cold-pressed mustard oil in bottle" },
        ],
        variants: [
          { label: "500 ml", pricePaise: 22900, stock: 50, weightGrams: 460 },
          { label: "1 L", pricePaise: 42900, mrpPaise: 49900, stock: 30, weightGrams: 920 },
        ],
      },
      {
        slug: "cold-pressed-sesame-oil",
        name: "Cold-Pressed Sesame Oil (Gingelly)",
        tagline: "The golden oil of Ayurveda — nourishing inside and out",
        shortDescription:
          "Traditional wood-pressed sesame oil (til oil) from Tamil Nadu. Revered in Ayurveda for its warming and nourishing properties.",
        description:
          "Sesame oil (gingelly / til oil) is one of the oldest oils known to mankind and holds a special place in Ayurveda as a warming, grounding oil. Our cold-pressed sesame oil is made from white sesame seeds sourced from Tamil Nadu, extracted using a traditional wooden press (marachekku). The result is a light golden oil with a mild, nutty aroma that enhances the flavour of chutneys, dosa batters, and traditional South Indian dishes. Also extensively used for abhyanga (Ayurvedic oil massage), oil pulling, and baby massage.",
        featured: false,
        tags: ["AYURVEDIC"],
        highlights: [
          "Marachekku (wood-pressed) extraction",
          "White sesame seeds — Tamil Nadu origin",
          "Rich in sesamol — a powerful antioxidant",
          "Dual-use: cooking and wellness",
        ],
        benefits: [
          "Rich in vitamin E and antioxidants",
          "Supports bone health (high in zinc and calcium)",
          "Traditional Ayurvedic massage oil",
          "Good for oral health (oil pulling)",
        ],
        howToUse:
          "Cooking: Use for tempering, chutneys, and pickles. Massage: Warm slightly and massage into skin. Oil pulling: Swish 1 tbsp in mouth for 15 minutes on empty stomach.",
        ingredients: "100% Cold-Pressed White Sesame Seed Oil (Sesamum indicum)",
        nutritionInfo: {
          "Serving Size": "15ml (1 tbsp)",
          Calories: "120 kcal",
          "Total Fat": "14g",
          "MUFA": "5.4g",
          "PUFA": "5.6g",
          "Vitamin E": "1.4mg",
        },
        shelfLife: "9 months from date of extraction",
        storage: "Store in a cool, dark place away from direct sunlight and heat.",
        images: [
          { url: IMG("photo-1552592074-ea7a91b851b3"), alt: "Sesame seeds and oil" },
          { url: IMG("photo-1675275131387-fd1871c3c648"), alt: "Cold-pressed sesame oil bottle" },
        ],
        variants: [
          { label: "500 ml", pricePaise: 29900, mrpPaise: 35000, stock: 35, weightGrams: 460 },
          { label: "1 L", pricePaise: 54900, mrpPaise: 65000, stock: 20, weightGrams: 920 },
        ],
      },
    ],
  },

  // ── Ghee & Dairy ─────────────────────────────────────────────────────
  {
    category: "Ghee & Dairy",
    slug: "ghee-dairy",
    products: [
      {
        slug: "a2-cow-ghee",
        name: "A2 Desi Cow Ghee (Bilona Method)",
        tagline: "Hand-churned from A2 milk using the 5,000-year-old bilona process",
        shortDescription:
          "Premium A2 ghee made from Gir cow milk using the traditional bilona (hand-churned curd) method. Rich, granular, and deeply aromatic.",
        description:
          "Our A2 ghee is made exclusively from the milk of grass-fed Gir cows in Gujarat. The traditional bilona process involves curdling the whole milk, hand-churning the curd to extract makkhan (white butter), and then slow-cooking it over a wood fire until it transforms into golden, granular ghee. This labour-intensive process yields just 1 litre of ghee from ~30 litres of milk, but the result is incomparably rich — with a deep golden colour, grainy texture, and intoxicating aroma. Used in Ayurvedic medicine for thousands of years, A2 ghee is believed to strengthen digestion, nourish tissues, and boost immunity.",
        featured: true,
        tags: ["PREMIUM", "BESTSELLER"],
        highlights: [
          "Gir cow A2 milk — Gujarat origin",
          "Bilona (hand-churned curd) method",
          "~30L milk per 1L ghee yield",
          "Wood-fire slow-cooked",
        ],
        benefits: [
          "Rich in fat-soluble vitamins A, D, E, K",
          "Contains butyric acid — supports gut health",
          "High smoke point (252°C) — ideal for Indian cooking",
          "Lactose and casein free",
        ],
        howToUse:
          "Add a spoonful to hot dal, rice, or rotis. Use as your primary cooking fat for tadkas and frying. Take 1 tsp on an empty stomach for Ayurvedic benefits.",
        ingredients: "100% Pure A2 Cow Ghee (from Gir cow milk)",
        nutritionInfo: {
          "Serving Size": "15g (1 tbsp)",
          Calories: "135 kcal",
          "Total Fat": "15g",
          "Saturated Fat": "9g",
          "Vitamin A": "108μg",
          Cholesterol: "36mg",
        },
        shelfLife: "12 months from date of manufacturing",
        storage: "Store at room temperature. Always use a clean, dry spoon. Does not require refrigeration.",
        images: [
          { url: IMG("photo-1573812461383-e5f8b759d12e"), alt: "A2 desi cow ghee in glass jar" },
          { url: IMG("photo-1707425197195-240b7ad69047"), alt: "Traditional ghee preparation" },
        ],
        variants: [
          { label: "250 ml", pricePaise: 44900, mrpPaise: 52000, stock: 30, weightGrams: 225 },
          { label: "500 ml", pricePaise: 84900, mrpPaise: 99000, stock: 20, weightGrams: 450 },
          { label: "1 L", pricePaise: 159900, mrpPaise: 189000, stock: 10, weightGrams: 900 },
        ],
      },
    ],
  },

  // ── Honey & Sweeteners ───────────────────────────────────────────────
  {
    category: "Honey & Sweeteners",
    slug: "honey-sweeteners",
    products: [
      {
        slug: "raw-forest-honey",
        name: "Raw Wild Forest Honey",
        tagline: "Unprocessed, unheated wild honey from the forests of Sundarbans",
        shortDescription:
          "100% raw, unprocessed wild honey harvested by traditional honey hunters from the Sundarban mangrove forests of West Bengal.",
        description:
          "This wild forest honey is collected by Moulis (traditional honey hunters) from the Sundarban mangrove forests of West Bengal. Unlike commercial honey, it is never heated, pasteurised, or ultra-filtered — preserving the natural enzymes, pollen, propolis, and antioxidants that make raw honey a superfood. The flavour varies subtly with the season, reflecting the diverse flora of the Sundarbans — from Khalsi and Goran blossoms to wild mangrove flowers. Expect a rich, complex flavour with a slightly dark amber colour. Crystallisation is natural and a sign of purity.",
        featured: true,
        tags: ["RAW", "WILD_HARVESTED"],
        highlights: [
          "Wild-harvested from Sundarban forests",
          "Never heated above 40°C",
          "Contains natural pollen and enzymes",
          "Supports Mouli tribal livelihoods",
        ],
        benefits: [
          "Natural cough and cold remedy",
          "Rich in antioxidants and enzymes",
          "Boosts immunity",
          "Aids wound healing when applied topically",
        ],
        howToUse:
          "Take 1–2 tsp daily on an empty stomach with warm (not hot) water. Use as a natural sweetener in smoothies, tea, or over yoghurt. Never heat above 40°C to preserve enzymes.",
        ingredients: "100% Raw Wild Forest Honey (multifloral)",
        nutritionInfo: {
          "Serving Size": "21g (1 tbsp)",
          Calories: "64 kcal",
          Carbohydrates: "17g",
          Sugars: "17g",
          Protein: "0.1g",
          Fat: "0g",
        },
        shelfLife: "24 months from date of harvest (honey does not truly expire)",
        storage: "Store at room temperature away from direct sunlight. Do not refrigerate. Crystallisation is natural — gently warm the jar in lukewarm water to reliquefy.",
        images: [
          { url: IMG("photo-1587049352851-8d4e89133924"), alt: "Raw forest honey in glass jar" },
          { url: IMG("photo-1613548058193-1cd24c1bebcf"), alt: "Honey with honeycomb" },
        ],
        variants: [
          { label: "250 g", pricePaise: 29900, mrpPaise: 35000, stock: 45, weightGrams: 250 },
          { label: "500 g", pricePaise: 54900, mrpPaise: 65000, stock: 30, weightGrams: 500 },
          { label: "1 kg", pricePaise: 99900, mrpPaise: 120000, stock: 15, weightGrams: 1000 },
        ],
      },
      {
        slug: "organic-jaggery-powder",
        name: "Organic Jaggery Powder (Gur)",
        tagline: "Traditional unrefined cane sweetener — iron-rich and chemical-free",
        shortDescription:
          "Fine-ground organic jaggery from Maharashtra sugarcane. A mineral-rich, unrefined alternative to white sugar.",
        description:
          "Jaggery (gur) has been India's traditional sweetener for centuries, long before refined sugar entered our kitchens. Our organic jaggery powder is made from fresh sugarcane juice sourced from certified organic farms in Kolhapur, Maharashtra. The juice is boiled in open iron pans using traditional methods — no chemicals, no sulphur, no lime added. The resulting jaggery is then sun-dried and powdered for easy use. Unlike white sugar, jaggery retains the natural iron, potassium, magnesium, and other minerals from the cane juice. Perfect for sweets, tea, payasam, and everyday cooking.",
        featured: false,
        tags: ["TRADITIONAL", "IRON_RICH"],
        highlights: [
          "Chemical-free — no sulphur or lime",
          "Iron pan processed (adds dietary iron)",
          "Kolhapur, Maharashtra origin",
          "Direct sugar replacement in recipes",
        ],
        benefits: [
          "Rich in iron — helps prevent anaemia",
          "Contains potassium and magnesium",
          "Aids digestion after meals",
          "Lower glycemic load than refined sugar",
        ],
        howToUse:
          "Use as a 1:1 replacement for sugar in tea, coffee, milk, and desserts. Dissolve in warm water for syrups. Add to laddoo, chikki, and payasam recipes.",
        ingredients: "100% Organic Sugarcane Jaggery (Saccharum officinarum)",
        nutritionInfo: {
          "Serving Size": "20g",
          Calories: "76 kcal",
          Carbohydrates: "19.4g",
          Sugars: "18.5g",
          Iron: "2.2mg",
          Potassium: "56mg",
          Calcium: "16mg",
        },
        shelfLife: "12 months from date of packaging",
        storage: "Store in an airtight container in a cool, dry place. Jaggery absorbs moisture — keep the container sealed.",
        images: [
          { url: IMG("photo-1576394435759-02a2674ff6e0"), alt: "Organic jaggery powder" },
          { url: IMG("photo-1775817590687-f1da5d70d9ad"), alt: "Traditional jaggery blocks" },
        ],
        variants: [
          { label: "500 g", pricePaise: 12900, stock: 65, weightGrams: 500 },
          { label: "1 kg", pricePaise: 22900, mrpPaise: 27000, stock: 40, weightGrams: 1000 },
        ],
      },
    ],
  },

  // ── Spices & Masalas ─────────────────────────────────────────────────
  {
    category: "Spices & Masalas",
    slug: "spices-masalas",
    products: [
      {
        slug: "organic-turmeric-powder",
        name: "Organic Turmeric Powder (Haldi)",
        tagline: "High-curcumin Lakadong turmeric from Meghalaya",
        shortDescription:
          "Premium Lakadong turmeric with 7–9% curcumin content — among the highest in the world. Deep orange colour, potent flavour.",
        description:
          "Not all turmeric is created equal. Our organic turmeric powder is made from the prized Lakadong variety, grown in the Jaintia Hills of Meghalaya at 4,000 ft elevation. Lakadong turmeric naturally contains 7–9% curcumin — compared to just 2–3% in common varieties — making it one of the most potent turmerics available anywhere. The deep orange colour and intense earthy-peppery flavour are immediately noticeable. We stone-grind the dried rhizomes without any colour additives or fillers. Every batch is lab-tested for curcumin content and purity. Perfect for cooking, golden milk (haldi doodh), and Ayurvedic preparations.",
        featured: true,
        tags: ["HIGH_CURCUMIN", "PREMIUM"],
        highlights: [
          "Lakadong variety — 7–9% curcumin",
          "Meghalaya origin, 4,000 ft elevation",
          "Stone-ground, no fillers or colour added",
          "Lab-tested curcumin content",
        ],
        benefits: [
          "Powerful anti-inflammatory",
          "Strong antioxidant properties",
          "Supports joint health",
          "Boosts immunity naturally",
        ],
        howToUse:
          "Cooking: Use ¼–½ tsp per dish. Golden milk: Simmer ½ tsp in warm milk with a pinch of black pepper (enhances absorption by 2000%). Face mask: Mix with honey and yoghurt.",
        ingredients: "100% Organic Lakadong Turmeric Powder (Curcuma longa)",
        nutritionInfo: {
          "Serving Size": "5g (1 tsp)",
          Calories: "15 kcal",
          Carbohydrates: "3.2g",
          Protein: "0.4g",
          Fat: "0.1g",
          Curcumin: "350–450mg",
        },
        shelfLife: "24 months from date of packaging",
        storage: "Store in an airtight container away from light and moisture. Turmeric stains — handle with care.",
        images: [
          { url: IMG("photo-1615485500834-bc10199bc727"), alt: "Organic turmeric powder in bowl" },
          { url: IMG("photo-1606951444141-e5533feb55be"), alt: "Turmeric root and powder" },
        ],
        variants: [
          { label: "100 g", pricePaise: 14900, mrpPaise: 17500, stock: 90, weightGrams: 100 },
          { label: "250 g", pricePaise: 32900, mrpPaise: 39000, stock: 55, weightGrams: 250 },
          { label: "500 g", pricePaise: 59900, mrpPaise: 72000, stock: 30, weightGrams: 500 },
        ],
      },
      {
        slug: "organic-cumin-seeds",
        name: "Organic Cumin Seeds (Jeera)",
        tagline: "Bold, aromatic jeera from the fields of Gujarat",
        shortDescription:
          "Whole organic cumin seeds with an intense, earthy aroma. The backbone spice of Indian tadkas and masala blends.",
        description:
          "Cumin (jeera) is arguably the most essential spice in Indian cooking — the sizzle of cumin seeds in hot ghee is the opening note of thousands of recipes. Our organic cumin seeds are sourced from the Unjha region of Gujarat, India's cumin capital, where the arid climate produces seeds with maximum essential oil content. These seeds have a rich, warm, earthy aroma with a slightly bitter, peppery flavour. Hand-cleaned and sorted for uniformity. Perfect for tempering (tadka), raitas, chaats, and as a base for spice blends.",
        featured: false,
        tags: ["ESSENTIAL_SPICE"],
        highlights: [
          "Unjha, Gujarat origin — India's cumin capital",
          "High essential oil content",
          "Hand-cleaned and sorted",
          "Bold, uniform seeds",
        ],
        benefits: [
          "Aids digestion and reduces bloating",
          "Rich in iron",
          "Contains thymol — supports immunity",
          "Traditional remedy for acidity",
        ],
        howToUse:
          "Tadka: Crackle ½ tsp in hot oil or ghee before adding other ingredients. Toast lightly in a dry pan for enhanced flavour. Grind fresh for spice blends.",
        ingredients: "100% Organic Whole Cumin Seeds (Cuminum cyminum)",
        nutritionInfo: {
          "Serving Size": "5g (1 tsp)",
          Calories: "19 kcal",
          Protein: "0.9g",
          Carbohydrates: "2.2g",
          Fat: "0.7g",
          Iron: "3.3mg",
        },
        shelfLife: "24 months from date of packaging",
        storage: "Store whole seeds in an airtight container away from heat and moisture. Grind only before use for best flavour.",
        images: [
          { url: IMG("photo-1701189975842-591ebd1e26a2"), alt: "Organic cumin seeds" },
        ],
        variants: [
          { label: "100 g", pricePaise: 7900, stock: 100, weightGrams: 100 },
          { label: "250 g", pricePaise: 17900, mrpPaise: 21000, stock: 60, weightGrams: 250 },
          { label: "500 g", pricePaise: 32900, mrpPaise: 39000, stock: 35, weightGrams: 500 },
        ],
      },
      {
        slug: "organic-black-pepper",
        name: "Organic Black Pepper (Kali Mirch)",
        tagline: "The King of Spices — whole Malabar peppercorns",
        shortDescription:
          "Premium whole Malabar black pepper from the spice gardens of Wayanad, Kerala. Pungent, aromatic, and bold.",
        description:
          "Black pepper has been called the 'King of Spices' for good reason — it has been the most traded spice in human history and remains the most used spice worldwide. Our organic Malabar black pepper comes from the spice gardens of Wayanad district in Kerala, where pepper has been cultivated for over 2,000 years. These whole peppercorns are vine-ripened, sun-dried, and hand-sorted for bold, uniform berries. The piperine content (the compound that gives pepper its heat) is naturally high, delivering a sharp, warming bite with complex woody and citrus undertones. Crush or grind fresh for the best flavour.",
        featured: false,
        tags: ["PREMIUM", "KING_OF_SPICES"],
        highlights: [
          "Malabar variety — Wayanad, Kerala",
          "High piperine content (5%+)",
          "Vine-ripened, sun-dried",
          "Hand-sorted uniform peppercorns",
        ],
        benefits: [
          "Enhances nutrient absorption (especially curcumin)",
          "Stimulates digestive enzymes",
          "Rich in antioxidants",
          "Natural metabolism booster",
        ],
        howToUse:
          "Crack or grind fresh over dishes just before serving. Add whole to biryanis, soups, and stocks. Combine with turmeric for enhanced curcumin absorption.",
        ingredients: "100% Organic Whole Black Peppercorns (Piper nigrum)",
        nutritionInfo: {
          "Serving Size": "5g (1 tsp ground)",
          Calories: "13 kcal",
          Protein: "0.5g",
          Carbohydrates: "3.3g",
          Fat: "0.2g",
          Piperine: "250mg",
        },
        shelfLife: "36 months from date of packaging (whole peppercorns)",
        storage: "Store whole peppercorns in an airtight glass jar away from heat and light. Grind only when needed.",
        images: [
          { url: IMG("photo-1591801058986-9e28e68670f7"), alt: "Organic black peppercorns" },
          { url: IMG("photo-1506085621370-98b475435879"), alt: "Whole black pepper close-up" },
        ],
        variants: [
          { label: "100 g", pricePaise: 12900, mrpPaise: 15000, stock: 85, weightGrams: 100 },
          { label: "250 g", pricePaise: 28900, mrpPaise: 35000, stock: 45, weightGrams: 250 },
        ],
      },
    ],
  },

  // ── Dry Fruits & Nuts ────────────────────────────────────────────────
  {
    category: "Dry Fruits & Nuts",
    slug: "dry-fruits-nuts",
    products: [
      {
        slug: "premium-california-almonds",
        name: "Premium Almonds (Badam)",
        tagline: "Crunchy, wholesome California almonds — handpicked grade",
        shortDescription:
          "Large, crunchy California almonds (NP variety). A daily handful for brain health, energy, and glowing skin.",
        description:
          "Our premium almonds are sourced from California's Central Valley, the world's largest almond-producing region. These are the NP (Nonpareil) variety — known for their smooth, flat shape, light colour, and satisfying crunch. Each batch is hand-graded to ensure uniform size and zero defects. Almonds are one of the most nutrient-dense nuts available — rich in vitamin E, healthy monounsaturated fats, magnesium, and protein. Enjoy them raw, soaked overnight (for easier digestion), roasted, or as almond milk. A perfect daily snack for the whole family.",
        featured: true,
        tags: ["BESTSELLER", "BRAIN_FOOD"],
        highlights: [
          "California Nonpareil (NP) variety",
          "Hand-graded for uniform quality",
          "Rich in Vitamin E (26mg per 100g)",
          "Zero additives — raw and natural",
        ],
        benefits: [
          "Excellent for brain health and memory",
          "Promotes heart health",
          "Rich source of vitamin E — great for skin",
          "Helps manage blood sugar levels",
        ],
        howToUse:
          "Eat 8–10 almonds daily. Soak overnight for easier digestion and enhanced nutrient absorption. Blend into almond milk or add to smoothies, muesli, and desserts.",
        ingredients: "100% Raw California Almonds (Prunus dulcis)",
        nutritionInfo: {
          "Serving Size": "30g (~23 almonds)",
          Calories: "173 kcal",
          Protein: "6.3g",
          "Total Fat": "14.9g",
          Carbohydrates: "6.5g",
          Fiber: "3.5g",
          "Vitamin E": "7.8mg",
          Magnesium: "81mg",
        },
        shelfLife: "12 months from date of packaging",
        storage: "Store in an airtight container in a cool, dry place. Refrigerate for extended freshness.",
        images: [
          { url: IMG("photo-1608797178974-15b35a64ede9"), alt: "Premium almonds close-up" },
          { url: IMG("photo-1615485737457-f07082c77813"), alt: "Almonds in a bowl" },
        ],
        variants: [
          { label: "250 g", pricePaise: 29900, mrpPaise: 35000, stock: 50, weightGrams: 250 },
          { label: "500 g", pricePaise: 54900, mrpPaise: 65000, stock: 35, weightGrams: 500 },
          { label: "1 kg", pricePaise: 99900, mrpPaise: 120000, stock: 15, weightGrams: 1000 },
        ],
      },
      {
        slug: "goan-cashews-w240",
        name: "Whole Cashews W240 (Kaju)",
        tagline: "Premium Goan cashews — the gold standard of Indian kaju",
        shortDescription:
          "Large, whole W240 grade cashews from Goa. Creamy, buttery, and perfect for snacking, sweets, and cooking.",
        description:
          "Goa has been synonymous with premium cashews since the Portuguese introduced the cashew tree to India over 400 years ago. Our W240 grade whole cashews are among the finest — the 'W' stands for 'whole' and '240' means there are approximately 240 kernels per pound, indicating a large, premium size. Each cashew is ivory-white, plump, and unbroken. The flavour is rich, buttery, and mildly sweet with a satisfying crunch. Perfect for eating raw, light roasting, making kaju katli, adding to biryanis, or grinding into cashew cream for gravies.",
        featured: false,
        tags: ["PREMIUM"],
        highlights: [
          "W240 grade — large whole kernels",
          "Goan origin — 400-year cashew heritage",
          "No salt, no oil, no roasting",
          "Ivory-white, unbroken kernels",
        ],
        benefits: [
          "Rich in healthy monounsaturated fats",
          "Good source of copper and zinc",
          "Provides plant-based protein",
          "Contains magnesium for bone health",
        ],
        howToUse:
          "Eat raw as a snack. Light roast with a pinch of salt for enhanced flavour. Grind into cashew cream for rich curries. Use in kaju katli, barfi, and other sweets.",
        ingredients: "100% Whole Cashew Kernels, W240 grade (Anacardium occidentale)",
        nutritionInfo: {
          "Serving Size": "30g",
          Calories: "166 kcal",
          Protein: "5.4g",
          "Total Fat": "13.2g",
          Carbohydrates: "8.9g",
          Fiber: "1.0g",
          Copper: "0.6mg",
          Zinc: "1.7mg",
        },
        shelfLife: "9 months from date of packaging",
        storage: "Store in an airtight container in a cool, dry place. Refrigerate after opening.",
        images: [
          { url: IMG("photo-1615485925873-7ecbbe90a866"), alt: "Whole cashew nuts" },
          { url: IMG("photo-1626697556426-8a55a8af4999"), alt: "Premium cashews close-up" },
        ],
        variants: [
          { label: "250 g", pricePaise: 32900, mrpPaise: 38000, stock: 40, weightGrams: 250 },
          { label: "500 g", pricePaise: 62900, mrpPaise: 72000, stock: 25, weightGrams: 500 },
          { label: "1 kg", pricePaise: 119900, mrpPaise: 139000, stock: 12, weightGrams: 1000 },
        ],
      },
      {
        slug: "organic-quinoa-seeds",
        name: "Organic White Quinoa Seeds",
        tagline: "The complete protein grain — all 9 essential amino acids",
        shortDescription:
          "Organic white quinoa grown in Uttarakhand. A gluten-free superfood with complete protein — perfect for salads, bowls, and pulao.",
        description:
          "Quinoa has rapidly become one of the most popular health foods worldwide, and for good reason — it's one of the very few plant foods that contains all 9 essential amino acids, making it a 'complete protein'. Our organic quinoa is grown in the cool highlands of Uttarakhand, where Indian farmers have successfully adapted this Andean superfood to local conditions. These white quinoa seeds cook fluffy with a mild, slightly nutty flavour and a satisfying pop. Extremely versatile — use it as a rice substitute, in salads, breakfast bowls, upma-style preparations, or even in dosa batter for added nutrition.",
        featured: false,
        tags: ["SUPERFOOD", "GLUTEN_FREE"],
        highlights: [
          "Complete protein — all 9 essential amino acids",
          "Grown in Uttarakhand",
          "Naturally gluten-free",
          "Pre-washed — no bitter saponin coating",
        ],
        benefits: [
          "High in protein and fibre",
          "Excellent for weight management",
          "Rich in iron and magnesium",
          "Suitable for celiac and gluten-sensitive diets",
        ],
        howToUse:
          "Rinse briefly. Cook 1 cup quinoa in 2 cups water for 15 minutes until water is absorbed and grains are translucent with visible germ ring. Fluff with a fork.",
        ingredients: "100% Organic White Quinoa Seeds (Chenopodium quinoa)",
        nutritionInfo: {
          "Serving Size": "100g (uncooked)",
          Calories: "368 kcal",
          Protein: "14.1g",
          Carbohydrates: "64.2g",
          Fat: "6.1g",
          Fiber: "7.0g",
          Iron: "4.6mg",
          Magnesium: "197mg",
        },
        shelfLife: "18 months from date of packaging",
        storage: "Store in an airtight container in a cool, dry place.",
        images: [
          { url: IMG("photo-1615865417491-9941019fbc00"), alt: "Organic quinoa seeds in a bowl" },
        ],
        variants: [
          { label: "500 g", pricePaise: 24900, mrpPaise: 29000, stock: 45, weightGrams: 500 },
          { label: "1 kg", pricePaise: 44900, mrpPaise: 55000, stock: 25, weightGrams: 1000 },
        ],
      },
    ],
  },

  // ── Tea & Beverages ──────────────────────────────────────────────────
  {
    category: "Tea & Beverages",
    slug: "tea-beverages",
    products: [
      {
        slug: "organic-green-tea",
        name: "Organic Whole Leaf Green Tea",
        tagline: "Handpicked Darjeeling green tea — the Champagne of teas",
        shortDescription:
          "Single-estate organic green tea from Darjeeling. Light, floral, and packed with antioxidants.",
        description:
          "Darjeeling is the world's most prestigious tea-growing region, and our organic green tea comes from a single estate in the Makaibari Tea Garden at 5,000 ft elevation. The tender two-leaves-and-a-bud are hand-plucked during the first flush (spring) and minimally processed to halt oxidation, preserving the delicate green colour and maximum catechin content. The brew is light golden-green with a smooth, floral, almost muscatel character — no bitterness when brewed correctly. Rich in EGCG (epigallocatechin gallate), the powerful antioxidant that gives green tea its celebrated health benefits.",
        featured: false,
        tags: ["SINGLE_ESTATE", "FIRST_FLUSH"],
        highlights: [
          "Makaibari estate, Darjeeling — 5,000 ft",
          "First flush, hand-plucked",
          "Whole leaf — not dust or fannings",
          "High EGCG catechin content",
        ],
        benefits: [
          "Rich in antioxidants (EGCG)",
          "Boosts metabolism naturally",
          "Supports mental clarity and focus",
          "Promotes heart health",
        ],
        howToUse:
          "Use 1 tsp per cup. Heat water to 75–80°C (not boiling — boiling water makes green tea bitter). Steep for 2–3 minutes. Can be re-steeped 2–3 times.",
        ingredients: "100% Organic Green Tea Leaves (Camellia sinensis)",
        nutritionInfo: {
          "Serving Size": "2g (1 cup brewed)",
          Calories: "2 kcal",
          Caffeine: "25–35mg",
          EGCG: "~50mg",
          "L-Theanine": "~8mg",
        },
        shelfLife: "24 months from date of packaging",
        storage: "Store in an airtight, opaque container away from moisture, light, and strong odours. Do not refrigerate.",
        images: [
          { url: IMG("photo-1582650859079-ee63913ecb84"), alt: "Organic green tea leaves" },
          { url: IMG("photo-1557182307-a2fd5bcafedd"), alt: "Green tea brew in cup" },
        ],
        variants: [
          { label: "50 g", pricePaise: 19900, mrpPaise: 24000, stock: 60, weightGrams: 50 },
          { label: "100 g", pricePaise: 34900, mrpPaise: 42000, stock: 40, weightGrams: 100 },
          { label: "250 g", pricePaise: 79900, mrpPaise: 95000, stock: 20, weightGrams: 250 },
        ],
      },
      {
        slug: "tulsi-herbal-tea",
        name: "Tulsi Herbal Tea (Caffeine-Free)",
        tagline: "The sacred herb of India — brewed for calm and immunity",
        shortDescription:
          "A soothing, caffeine-free herbal infusion of three tulsi varieties — Rama, Krishna, and Vana tulsi. Nature's adaptogen.",
        description:
          "Tulsi (Holy Basil) is revered in Indian tradition as the 'Queen of Herbs' and has been used in Ayurveda for over 5,000 years. Our tulsi herbal tea is a unique blend of three tulsi varieties: Rama Tulsi (green leaf, mild and mellow), Krishna Tulsi (purple leaf, crisp and peppery), and Vana Tulsi (wild forest tulsi, aromatic and robust). Together they create a well-rounded, adaptogenic brew that helps the body cope with stress while supporting respiratory health and immunity. Completely caffeine-free, making it perfect for any time of day — especially as a calming evening ritual.",
        featured: false,
        tags: ["CAFFEINE_FREE", "AYURVEDIC"],
        highlights: [
          "Blend of 3 tulsi varieties — Rama, Krishna, Vana",
          "100% caffeine-free",
          "Adaptogenic — helps manage stress",
          "Organically grown in Lucknow, UP",
        ],
        benefits: [
          "Natural stress reliever (adaptogen)",
          "Supports respiratory health",
          "Boosts immunity",
          "Aids digestion and detoxification",
        ],
        howToUse:
          "Place 1 tsp in a cup. Pour freshly boiled water. Steep for 5–7 minutes (stronger than green tea). Enjoy plain or with honey and lemon. Safe to drink 2–3 cups daily.",
        ingredients: "Organic Rama Tulsi leaves, Organic Krishna Tulsi leaves, Organic Vana Tulsi leaves",
        nutritionInfo: {
          "Serving Size": "2g (1 cup brewed)",
          Calories: "0 kcal",
          Caffeine: "0mg",
          Eugenol: "present (natural compound)",
        },
        shelfLife: "18 months from date of packaging",
        storage: "Store in an airtight container away from moisture, heat, and strong odours.",
        images: [
          { url: IMG("photo-1602943543714-cf535b048440"), alt: "Herbal tulsi tea leaves" },
        ],
        variants: [
          { label: "50 g", pricePaise: 14900, mrpPaise: 17500, stock: 55, weightGrams: 50 },
          { label: "100 g", pricePaise: 27900, mrpPaise: 32000, stock: 35, weightGrams: 100 },
        ],
      },
    ],
  },

  // ── Superfoods ───────────────────────────────────────────────────────
  {
    category: "Superfoods",
    slug: "superfoods",
    products: [
      {
        slug: "organic-chia-seeds",
        name: "Organic Chia Seeds",
        tagline: "Tiny seeds, mighty nutrition — the ultimate omega-3 plant source",
        shortDescription:
          "Raw organic chia seeds rich in omega-3, fibre, and protein. Soak, sprinkle, or blend into your daily routine.",
        description:
          "Chia seeds may be tiny, but they're among the most nutrient-dense foods on the planet. Our organic chia seeds are sourced from certified farms and packed fresh to preserve their exceptional nutritional profile. Just 2 tablespoons deliver 5g of omega-3 fatty acids (ALA), 10g of fibre, and 4g of protein. Chia seeds absorb up to 12× their weight in water, forming a gel that keeps you full longer and aids digestion. They're virtually tasteless, making them the easiest superfood to add to any meal — smoothies, yoghurt, oatmeal, salads, or even roti dough.",
        featured: false,
        tags: ["SUPERFOOD", "OMEGA_3"],
        highlights: [
          "Highest plant source of omega-3 (ALA)",
          "Absorbs 12× its weight in water",
          "11g fibre per 28g serving",
          "Raw, unprocessed, no additives",
        ],
        benefits: [
          "Excellent omega-3 source for vegetarians",
          "Promotes satiety and weight management",
          "Supports digestive health",
          "Good for bone health (calcium + phosphorus)",
        ],
        howToUse:
          "Soak 1–2 tbsp in water or milk for 15 minutes until gel forms (chia pudding). Sprinkle dry over salads, smoothie bowls, or yoghurt. Add to dough for rotis or pancakes.",
        ingredients: "100% Organic Black Chia Seeds (Salvia hispanica)",
        nutritionInfo: {
          "Serving Size": "28g (2 tbsp)",
          Calories: "138 kcal",
          Protein: "4.7g",
          "Total Fat": "8.7g",
          "Omega-3 (ALA)": "5.1g",
          Carbohydrates: "12.3g",
          Fiber: "10.6g",
          Calcium: "177mg",
        },
        shelfLife: "24 months from date of packaging",
        storage: "Store in an airtight container in a cool, dry place. No refrigeration needed.",
        images: [
          { url: IMG("photo-1607664608695-45aaa6d621fc"), alt: "Organic chia seeds close-up" },
          { url: IMG("photo-1602948750761-97ea79ee42ec"), alt: "Chia seeds in a bowl" },
        ],
        variants: [
          { label: "200 g", pricePaise: 16900, mrpPaise: 20000, stock: 55, weightGrams: 200 },
          { label: "500 g", pricePaise: 34900, mrpPaise: 42000, stock: 35, weightGrams: 500 },
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
          tagline: p.tagline,
          shortDescription: p.shortDescription,
          description: p.description,
          categoryId: category.id,
          isFeatured: p.featured ?? false,
          tags: p.tags ?? [],
          highlights: p.highlights ?? [],
          benefits: p.benefits ?? [],
          howToUse: p.howToUse ?? null,
          ingredients: p.ingredients ?? null,
          nutritionInfo: p.nutritionInfo ?? Prisma.JsonNull,
          shelfLife: p.shelfLife ?? null,
          storage: p.storage ?? null,
          metaTitle: p.name,
          metaDescription: p.shortDescription,
        },
        create: {
          slug: p.slug,
          name: p.name,
          tagline: p.tagline,
          shortDescription: p.shortDescription,
          description: p.description,
          categoryId: category.id,
          isFeatured: p.featured ?? false,
          tags: p.tags ?? [],
          highlights: p.highlights ?? [],
          benefits: p.benefits ?? [],
          howToUse: p.howToUse ?? null,
          ingredients: p.ingredients ?? null,
          nutritionInfo: p.nutritionInfo ?? Prisma.JsonNull,
          shelfLife: p.shelfLife ?? null,
          storage: p.storage ?? null,
          metaTitle: p.name,
          metaDescription: p.shortDescription,
        },
      });

      // Upsert images — delete old ones first, then recreate
      await prisma.productImage.deleteMany({ where: { productId: product.id } });
      for (let i = 0; i < p.images.length; i++) {
        await prisma.productImage.create({
          data: {
            productId: product.id,
            url: p.images[i].url,
            alt: p.images[i].alt,
            sortOrder: i,
            isThumbnail: i === 0,
          },
        });
      }

      // Upsert variants
      for (const v of p.variants) {
        const sku = `${p.slug}-${v.label}`.toUpperCase().replace(/[^A-Z0-9]+/g, "-");
        await prisma.productVariant.upsert({
          where: { sku },
          update: {
            pricePaise: v.pricePaise,
            mrpPaise: v.mrpPaise ?? null,
            stock: v.stock,
            label: v.label,
            weightGrams: v.weightGrams ?? null,
          },
          create: {
            sku,
            label: v.label,
            pricePaise: v.pricePaise,
            mrpPaise: v.mrpPaise ?? null,
            stock: v.stock,
            weightGrams: v.weightGrams ?? null,
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
      description: "Get 10% off on your first order! No minimum order value.",
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
      description: "Free shipping on orders above ₹300.",
      type: "FREE_SHIP",
      minOrderPaise: 30000, // ₹300+
      isActive: true,
    },
  });
  await prisma.coupon.upsert({
    where: { code: "ORGANIC100" },
    update: {},
    create: {
      code: "ORGANIC100",
      description: "Flat ₹100 off on orders above ₹999. Limited time offer!",
      type: "FLAT",
      valuePaise: 10000, // ₹100
      minOrderPaise: 99900, // ₹999+
      isActive: true,
    },
  });
  console.log("  ✓ Coupons seeded.");
}

async function seedPromoMessages() {
  // PromoMessage has no natural unique key, so match on text: create if missing,
  // never touch an existing row (admins may have edited or deactivated it).
  const messages = [
    { text: "🚚 Free delivery on orders above ₹300", link: null },
    { text: "🌿 100% certified organic · Farm-fresh, no chemicals", link: "/products" },
    { text: "💵 Cash on Delivery available across India", link: null },
    { text: "📖 New on the blog: healthy recipes & organic living tips", link: "/blog" },
  ];
  for (const [i, m] of messages.entries()) {
    const existing = await prisma.promoMessage.findFirst({ where: { text: m.text } });
    if (!existing) {
      await prisma.promoMessage.create({ data: { ...m, sortOrder: i, isActive: true } });
    }
  }
  console.log("  ✓ Promo messages seeded.");
}

async function main() {
  console.log("Seeding database...");
  await seedRbac();
  await seedSettings();
  await seedCatalog();
  await seedCoupons();
  await seedPromoMessages();
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
