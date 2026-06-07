import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type ProductCategory =
  | "tamplarie"
  | "sanitare"
  | "electrice"
  | "pardoseli"
  | "vopsele"
  | "scule"

export interface Product {
  id: string
  sku: string
  name: string
  category: ProductCategory
  price: number
  oldPrice?: number
  unit: string
  stock: number
  badge?: "sale" | "new" | "low-stock"
  featured: boolean
}

const MOCK_PRODUCTS: Product[] = [
  {
    id: "p-001",
    sku: "SAN-GR-ES",
    name: "Set duș Grohe Eurosmart",
    category: "sanitare",
    price: 189,
    unit: "buc",
    stock: 14,
    featured: true,
  },
  {
    id: "p-002",
    sku: "PAR-OAK-10",
    name: "Parchet stejar 10mm",
    category: "pardoseli",
    price: 28,
    unit: "m²",
    stock: 340,
    featured: true,
  },
  {
    id: "p-003",
    sku: "VOP-BAU-15",
    name: "Baumit lavabilă interior 15L",
    category: "vopsele",
    price: 42,
    unit: "buc",
    stock: 62,
    featured: true,
  },
  {
    id: "p-004",
    sku: "SCU-BSC-18V",
    name: "Bosch GSB 18V Li-Ion",
    category: "scule",
    price: 210,
    unit: "buc",
    stock: 8,
    featured: true,
  },
  {
    id: "p-005",
    sku: "ELC-HAG-24",
    name: "Tablou electric 24 module Hager",
    category: "electrice",
    price: 94,
    unit: "buc",
    stock: 5,
    badge: "low-stock",
    featured: false,
  },
  {
    id: "p-006",
    sku: "SAN-CER-90",
    name: "Cabină duș 90×90 Cersanit",
    category: "sanitare",
    price: 416,
    oldPrice: 520,
    unit: "buc",
    stock: 3,
    badge: "sale",
    featured: false,
  },
  {
    id: "p-007",
    sku: "TAM-PVC-3C",
    name: "Fereastră PVC 3 camere 100×120",
    category: "tamplarie",
    price: 340,
    unit: "buc",
    stock: 22,
    badge: "new",
    featured: false,
  },
  {
    id: "p-008",
    sku: "PAR-GRE-60",
    name: "Gresie porțelanată 60×60 mată",
    category: "pardoseli",
    price: 18,
    unit: "m²",
    stock: 800,
    featured: false,
  },
  {
    id: "p-009",
    sku: "VOP-CER-CT17",
    name: "Grund penetrant Ceresit CT17 25kg",
    category: "vopsele",
    price: 36,
    unit: "sac",
    stock: 48,
    featured: false,
  },
  {
    id: "p-010",
    sku: "SCU-MAK-125",
    name: "Flex unghiular Makita 125mm",
    category: "scule",
    price: 128,
    unit: "buc",
    stock: 11,
    badge: "new",
    featured: false,
  },
]

export const GET = withGates(
  { action: "shop.products.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category") as ProductCategory | null
    const search = searchParams.get("q")?.toLowerCase()
    const featured = searchParams.get("featured")

    let products = MOCK_PRODUCTS
    if (category) products = products.filter((p) => p.category === category)
    if (featured === "true") products = products.filter((p) => p.featured)
    if (search) products = products.filter((p) => p.name.toLowerCase().includes(search))

    return NextResponse.json({ products, count: products.length })
  }
)
