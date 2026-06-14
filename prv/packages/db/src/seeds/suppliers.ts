// Seed: suppliers for demo company
import { db } from "../client"
import { suppliers } from "../schema/suppliers"
import { eq } from "drizzle-orm"

export interface SuppliersSeedResult {
  supplierIds: string[]
}

const SUPPLIER_DEFS = [
  {
    name: "Leroy Merlin România",
    category: "materials",
    vatNumber: "RO14391261",
    contactName: "Andrei Neagu",
    email: "b2b@leroymerlin.ro",
    phone: "+40 21 555 1001",
    website: "https://www.leroymerlin.ro",
    city: "București",
    paymentTermsDays: 30,
  },
  {
    name: "Saint-Gobain Construction Products",
    category: "materials",
    vatNumber: "RO11009186",
    contactName: "Cristina Marin",
    email: "contact@saint-gobain.ro",
    phone: "+40 21 555 2002",
    city: "București",
    paymentTermsDays: 45,
  },
  {
    name: "Dedeman SRL",
    category: "materials",
    vatNumber: "RO6895890",
    contactName: "Radu Șerban",
    email: "corporate@dedeman.ro",
    phone: "+40 232 555 3003",
    website: "https://www.dedeman.ro",
    city: "Bacău",
    paymentTermsDays: 30,
  },
  {
    name: "Electrica Furnizare",
    category: "utilities",
    vatNumber: "RO28909028",
    contactName: "Ioana Bratu",
    email: "corporate@electrica.ro",
    phone: "+40 21 555 4004",
    city: "București",
    paymentTermsDays: 15,
  },
  {
    name: "Mapei Romania SRL",
    category: "materials",
    vatNumber: "RO5765620",
    contactName: "Gheorghe Florin",
    email: "office@mapei.ro",
    phone: "+40 21 555 5005",
    city: "București",
    paymentTermsDays: 60,
  },
]

export async function seedSuppliers(companyId: string): Promise<SuppliersSeedResult> {
  console.log("  → Seeding suppliers...")

  const supplierIds: string[] = []

  for (const s of SUPPLIER_DEFS) {
    const existing = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(eq(suppliers.email, s.email))
      .limit(1)

    if (existing[0]) {
      supplierIds.push(existing[0].id)
      continue
    }

    const [record] = await db
      .insert(suppliers)
      .values({ companyId, ...s })
      .returning({ id: suppliers.id })

    if (record) supplierIds.push(record.id)
  }

  console.log(`    ✓ Suppliers: ${supplierIds.length}`)
  return { supplierIds }
}
