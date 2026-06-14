// Seed: PRV Renovations SRL — company, stores, and core users
import { db } from "../client"
import { companies, stores } from "../schema/companies"
import { users } from "../schema/users"
import { companyMemberships } from "../schema/multi-tenancy"
import { eq } from "drizzle-orm"

export const COMPANY_SLUG = "prv-renovations-demo"

export interface CompanySeedResult {
  companyId: string
  storeId: string
  ceoId: string
  managerId: string
  supervisorId: string
  workerIds: string[]
}

export async function seedCompany(): Promise<CompanySeedResult> {
  console.log("  → Seeding company & users...")

  await db
    .insert(companies)
    .values({
      name: "PRV Renovations SRL",
      slug: COMPANY_SLUG,
      type: "renovation",
      status: "active",
      country: "RO",
      city: "București",
      address: "Bd. Unirii 42, Sector 4",
      email: "office@prv-renovations.ro",
      phone: "+40 21 123 4567",
      vatNumber: "RO12345678",
      registrationNumber: "J40/1234/2020",
      settings: { currency: "RON", timezone: "Europe/Bucharest", locale: "ro-RO" },
      isActive: true,
    })
    .onConflictDoNothing()

  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.slug, COMPANY_SLUG))
    .limit(1)

  if (!company) throw new Error("Failed to create company")
  const companyId = company.id

  await db
    .insert(stores)
    .values({
      companyId,
      name: "Sediu Central",
      code: "HQ",
      address: "Bd. Unirii 42, Sector 4",
      city: "București",
      isActive: true,
    })
    .onConflictDoNothing()

  const [store] = await db
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.companyId, companyId))
    .limit(1)

  if (!store) throw new Error("Failed to create store")
  const storeId = store.id

  const userDefs = [
    {
      email: "ceo@prv-demo.ro",
      firstName: "Alexandru",
      lastName: "Popescu",
      jobTitle: "CEO",
      role: "company_owner",
    },
    {
      email: "manager@prv-demo.ro",
      firstName: "Ioana",
      lastName: "Constantin",
      jobTitle: "Project Manager",
      role: "manager",
    },
    {
      email: "supervisor@prv-demo.ro",
      firstName: "Mihai",
      lastName: "Ionescu",
      jobTitle: "Site Supervisor",
      role: "employee",
    },
    {
      email: "worker1@prv-demo.ro",
      firstName: "Andrei",
      lastName: "Gheorghe",
      jobTitle: "Electrician",
      role: "employee",
    },
    {
      email: "worker2@prv-demo.ro",
      firstName: "Elena",
      lastName: "Popa",
      jobTitle: "Interior Designer",
      role: "employee",
    },
    {
      email: "worker3@prv-demo.ro",
      firstName: "Cristian",
      lastName: "Dumitrescu",
      jobTitle: "Plumber",
      role: "employee",
    },
  ]

  const createdUserIds: string[] = []

  for (const u of userDefs) {
    await db
      .insert(users)
      .values({
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        jobTitle: u.jobTitle,
        isActive: true,
      })
      .onConflictDoNothing()

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, u.email))
      .limit(1)

    if (!user) continue
    createdUserIds.push(user.id)

    await db
      .insert(companyMemberships)
      .values({
        companyId,
        userId: user.id,
        primaryRole: u.role,
        status: "ACTIVE",
        activatedAt: new Date(),
      })
      .onConflictDoNothing()
  }

  const [ceoId, managerId, supervisorId, ...workerIds] = createdUserIds

  console.log(`    ✓ Company: ${companyId}, Users: ${createdUserIds.length}`)

  return {
    companyId,
    storeId,
    ceoId: ceoId!,
    managerId: managerId!,
    supervisorId: supervisorId!,
    workerIds,
  }
}
