// Development seed: shop platform — categories, products, reviews
// Only runs in non-production environments via seed.ts

import { db } from "../client"
import { companies } from "../schema/companies"
import { companyGroups } from "../schema/groups"
import { productCategories, products } from "../schema/finance"
import { productReviews } from "../schema/shop"
import { eq, sql } from "drizzle-orm"

const SHOP_COMPANY_SLUG = "prv-shop-demo"

interface ShopSeedResult {
  companyId: string
  categoryCount: number
  productCount: number
  reviewCount: number
}

const CATEGORIES = [
  {
    slug: "tamplarie",
    name: "Carpentry",
    description: "Doors, windows, PVC/aluminum profiles",
    sortOrder: 1,
  },
  {
    slug: "sanitare",
    name: "Plumbing",
    description: "Sanitary fixtures, faucets, installations",
    sortOrder: 2,
  },
  {
    slug: "electrice",
    name: "Electrical",
    description: "Cables, outlets, switches, panels",
    sortOrder: 3,
  },
  {
    slug: "pardoseli",
    name: "Flooring",
    description: "Tiles, parquet, carpet, linoleum",
    sortOrder: 4,
  },
  {
    slug: "vopsele",
    name: "Paints & Primers",
    description: "Washable paints, primers, lacquers, plaster",
    sortOrder: 5,
  },
  {
    slug: "scule",
    name: "Tools & Accessories",
    description: "Power tools, accessories, consumables",
    sortOrder: 6,
  },
] as const

type CategorySlug = (typeof CATEGORIES)[number]["slug"]

const PRODUCTS: Array<{
  categorySlug: CategorySlug
  sku: string
  name: string
  description: string
  price: string
  unit: string
  stock: number
  tags: string[]
}> = [
  // Carpentry
  {
    categorySlug: "tamplarie",
    sku: "TAM-001",
    name: "Interior Oak Door 200x80",
    description: "Solid oak interior door, natural finish, hinges included",
    price: "850.00",
    unit: "buc",
    stock: 12,
    tags: ["usa", "interior", "stejar"],
  },
  {
    categorySlug: "tamplarie",
    sku: "TAM-002",
    name: "PVC Window 100x120 Double Glazed",
    description: "PVC window 5-chamber profile, Low-E thermal glass, handles included",
    price: "1250.00",
    unit: "buc",
    stock: 8,
    tags: ["fereastra", "pvc", "termoizolant"],
  },
  // Sanitare
  {
    categorySlug: "sanitare",
    sku: "SAN-001",
    name: "Acrylic Bathtub 170x70",
    description: "Rectangular reinforced acrylic bathtub, adjustable feet included",
    price: "950.00",
    unit: "buc",
    stock: 6,
    tags: ["cada", "baie", "acril"],
  },
  {
    categorySlug: "sanitare",
    sku: "SAN-002",
    name: "Thermostatic Shower Set Chrome",
    description:
      "Thermostatic faucet with handheld shower and 30cm rain shower head, polished chrome",
    price: "680.00",
    unit: "set",
    stock: 15,
    tags: ["baterie", "dus", "crom", "termostat"],
  },
  // Electrice
  {
    categorySlug: "electrice",
    sku: "ELC-001",
    name: "Cablu CYY-F 3x2.5mm 100m",
    description: "Cablu electric flexibil CYY-F 3x2.5mm², rola 100m, NF-EN 50525",
    price: "320.00",
    unit: "rola",
    stock: 25,
    tags: ["cablu", "electric", "cyy"],
  },
  {
    categorySlug: "electrice",
    sku: "ELC-002",
    name: "Tablou electric 24 module IP65",
    description: "24-module electrical distribution panel, IP65 protection, surface mount",
    price: "185.00",
    unit: "buc",
    stock: 18,
    tags: ["tablou", "electric", "ip65"],
  },
  // Pardoseli
  {
    categorySlug: "pardoseli",
    sku: "PAR-001",
    name: "Anthracite Porcelain Tile 60x60",
    description: "Rectified tile 60x60cm, matte anthracite grey, PEI 4 wear class",
    price: "65.00",
    unit: "mp",
    stock: 200,
    tags: ["gresie", "portelanata", "60x60", "antracit"],
  },
  {
    categorySlug: "pardoseli",
    sku: "PAR-002",
    name: "Parchet laminat stejar deschis AC5 8mm",
    description:
      "Laminate flooring 8mm, AC5 class, light oak pattern, click system, scratch-resistant",
    price: "45.00",
    unit: "mp",
    stock: 350,
    tags: ["parchet", "laminat", "stejar", "ac5"],
  },
  // Vopsele
  {
    categorySlug: "vopsele",
    sku: "VOP-001",
    name: "Premium White Washable Paint 15L",
    description: "Superior interior washable paint, matte white, excellent coverage, 1L/6m²",
    price: "185.00",
    unit: "galeata",
    stock: 40,
    tags: ["vopsea", "lavabila", "interior", "alba"],
  },
  {
    categorySlug: "vopsele",
    sku: "VOP-002",
    name: "Grund universal interior/exterior 5L",
    description: "Universal penetrating primer, seals porous surfaces, interior and exterior",
    price: "85.00",
    unit: "galeata",
    stock: 55,
    tags: ["grund", "universal", "penetrant"],
  },
  // Scule
  {
    categorySlug: "scule",
    sku: "SCU-001",
    name: "Polizor unghiular 125mm 1200W",
    description: "Professional angle grinder 125mm, 1200W, 11000rpm, anti-vibration handle",
    price: "420.00",
    unit: "buc",
    stock: 10,
    tags: ["polizor", "unghiular", "flex", "125mm"],
  },
  {
    categorySlug: "scule",
    sku: "SCU-002",
    name: "Set burghie SDS-Plus 10 piese 4-16mm",
    description: "SDS-Plus concrete & masonry drill set, 10 pieces 4-16mm, carbide tip",
    price: "95.00",
    unit: "set",
    stock: 30,
    tags: ["burghie", "sds", "beton", "zidarie"],
  },
]

const SAMPLE_REVIEWS: Array<{
  productSku: string
  rating: number
  title: string
  body: string
  authorName: string
}> = [
  {
    productSku: "PAR-001",
    rating: 5,
    title: "Excellent quality!",
    body: "Superb tile, perfectly rectified. Installation was a pleasure with 2mm joints.",
    authorName: "Andrei M.",
  },
  {
    productSku: "PAR-001",
    rating: 4,
    title: "Good value for money",
    body: "Good material, a few tiles slightly damaged at corners but otherwise ok.",
    authorName: "Maria P.",
  },
  {
    productSku: "VOP-001",
    rating: 5,
    title: "Perfect coverage",
    body: "Best paint I have ever used. One coat covers completely.",
    authorName: "Dan R.",
  },
  {
    productSku: "TAM-001",
    rating: 4,
    title: "Solid door",
    body: "Beautiful and solid door, delivery OK. Quality hinges.",
    authorName: "Elena S.",
  },
  {
    productSku: "SCU-001",
    rating: 5,
    title: "Polizor profesional",
    body: "High power, minimal vibrations. I use it daily on site.",
    authorName: "Mihai C.",
  },
  {
    productSku: "SAN-002",
    rating: 5,
    title: "Easy installation, works perfectly",
    body: "The thermostatic faucet maintains constant temperature. Very satisfied!",
    authorName: "Ioana D.",
  },
]

export async function seedShop(): Promise<ShopSeedResult> {
  console.log("  → Seeding shop: company, categories, products, reviews...")

  // Get or create a demo group
  let groupId: string
  const existingGroups = await db.select({ id: companyGroups.id }).from(companyGroups).limit(1)
  if (existingGroups.length > 0) {
    groupId = existingGroups[0]!.id
  } else {
    const [grp] = await db
      .insert(companyGroups)
      .values({ name: "PRV Group Demo", slug: "prv-group-demo" })
      .onConflictDoNothing()
      .returning({ id: companyGroups.id })
    if (!grp) {
      const fallback = await db.select({ id: companyGroups.id }).from(companyGroups).limit(1)
      groupId = fallback[0]!.id
    } else {
      groupId = grp.id
    }
  }

  // Get or create the demo shop company
  let companyId: string
  const existingCompany = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.slug, SHOP_COMPANY_SLUG))
    .limit(1)

  if (existingCompany.length > 0) {
    companyId = existingCompany[0]!.id
    console.log(`    ✓ Demo company exists (${companyId.slice(0, 8)}...)`)
  } else {
    const [co] = await db
      .insert(companies)
      .values({
        groupId,
        name: "PRV Shop Demo",
        slug: SHOP_COMPANY_SLUG,
        type: "shop",
        status: "active",
        email: "shop@prv.ro",
        country: "RO",
        city: "Bucharest",
      })
      .returning({ id: companies.id })
    companyId = co!.id
    console.log(`    ✓ Created demo company (${companyId.slice(0, 8)}...)`)
  }

  // Seed product categories (idempotent via onConflictDoNothing)
  const catRows = await db
    .insert(productCategories)
    .values(
      CATEGORIES.map((c) => ({
        companyId,
        slug: c.slug,
        name: c.name,
        description: c.description,
        sortOrder: c.sortOrder,
      }))
    )
    .onConflictDoNothing()
    .returning({ id: productCategories.id, slug: productCategories.slug })

  // Build slug→id map (including pre-existing rows)
  const allCats = await db
    .select({ id: productCategories.id, slug: productCategories.slug })
    .from(productCategories)
    .where(eq(productCategories.companyId, companyId))

  const catIdBySlug: Record<string, string> = {}
  for (const c of allCats) catIdBySlug[c.slug] = c.id

  console.log(`    ✓ ${catRows.length} categories inserted (${allCats.length} total)`)

  // Seed products
  const productRows = await db
    .insert(products)
    .values(
      PRODUCTS.map((p) => ({
        companyId,
        categoryId: catIdBySlug[p.categorySlug] ?? null,
        sku: p.sku,
        name: p.name,
        description: p.description,
        price: p.price,
        unit: p.unit,
        stockQuantity: p.stock,
        stockMinimum: Math.floor(p.stock * 0.1),
        status: "active" as const,
        tags: p.tags,
      }))
    )
    .onConflictDoNothing()
    .returning({ id: products.id, sku: products.sku })

  const allProducts = await db
    .select({ id: products.id, sku: products.sku })
    .from(products)
    .where(eq(products.companyId, companyId))

  const productIdBySku: Record<string, string> = {}
  for (const p of allProducts) productIdBySku[p.sku ?? ""] = p.id

  console.log(`    ✓ ${productRows.length} products inserted (${allProducts.length} total)`)

  // Seed sample reviews
  const reviewValues = SAMPLE_REVIEWS.flatMap((r) => {
    const productId = productIdBySku[r.productSku]
    if (!productId) return []
    return [
      {
        companyId,
        productId,
        rating: r.rating,
        title: r.title,
        body: r.body,
        authorName: r.authorName,
        isVerifiedPurchase: true,
        isApproved: true,
      },
    ]
  })

  let reviewCount = 0
  if (reviewValues.length > 0) {
    const reviewRows = await db
      .insert(productReviews)
      .values(reviewValues)
      .onConflictDoNothing()
      .returning({ id: productReviews.id })
    reviewCount = reviewRows.length
  }

  console.log(`    ✓ ${reviewCount} reviews inserted`)

  return { companyId, categoryCount: allCats.length, productCount: allProducts.length, reviewCount }
}
