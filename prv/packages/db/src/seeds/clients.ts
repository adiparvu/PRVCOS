// Seed: clients for demo company
import { db } from "../client"
import { clients } from "../schema/clients"
import { eq } from "drizzle-orm"

export interface ClientsSeedResult {
  clientIds: string[]
}

const CLIENT_DEFS = [
  {
    name: "Familia Radu",
    email: "radu.gheorghe@gmail.com",
    phone: "+40 722 111 222",
    type: "individual" as const,
    city: "București",
  },
  {
    name: "SC Imobiliare Premium SRL",
    email: "contact@imobiliare-premium.ro",
    phone: "+40 31 123 4567",
    type: "company" as const,
    city: "București",
    vatNumber: "RO23456789",
  },
  {
    name: "Familia Stancu",
    email: "stancu.mihai@yahoo.ro",
    phone: "+40 733 222 333",
    type: "individual" as const,
    city: "Cluj-Napoca",
  },
  {
    name: "Hotel Royal SRL",
    email: "office@hotelroyal.ro",
    phone: "+40 21 987 6543",
    type: "company" as const,
    city: "București",
    vatNumber: "RO34567890",
  },
  {
    name: "Familia Moldoveanu",
    email: "andrei.moldoveanu@gmail.com",
    phone: "+40 744 333 444",
    type: "individual" as const,
    city: "Timișoara",
  },
]

export async function seedClients(companyId: string): Promise<ClientsSeedResult> {
  console.log("  → Seeding clients...")

  const clientIds: string[] = []

  for (const c of CLIENT_DEFS) {
    const existing = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.email, c.email))
      .limit(1)

    if (existing[0]) {
      clientIds.push(existing[0].id)
      continue
    }

    const [record] = await db
      .insert(clients)
      .values({ companyId, ...c })
      .returning({ id: clients.id })

    if (record) clientIds.push(record.id)
  }

  console.log(`    ✓ Clients: ${clientIds.length}`)
  return { clientIds }
}
