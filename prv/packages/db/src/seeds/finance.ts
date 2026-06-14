// Seed: invoices and expenses
import { db } from "../client"
import { invoices, invoiceItems, expenses } from "../schema/finance"

export interface FinanceSeedResult {
  invoiceIds: string[]
  expenseIds: string[]
}

export async function seedFinance(opts: {
  companyId: string
  storeId: string
  clientIds: string[]
  managerId: string
  workerIds: string[]
  renovationProjectIds: string[]
}): Promise<FinanceSeedResult> {
  console.log("  → Seeding finance (invoices & expenses)...")

  const { companyId, clientIds, managerId, workerIds, renovationProjectIds } = opts
  const [clientId1, clientId2, clientId3] = clientIds
  const [worker1Id] = workerIds

  // ── Invoices ────────────────────────────────────────────────────────────────
  const invoiceDefs = [
    {
      clientId: clientId1,
      projectId: renovationProjectIds[0],
      invoiceNumber: "INV-2025-0001",
      status: "paid" as const,
      issueDate: "2025-03-05",
      dueDate: "2025-03-20",
      paidAt: new Date("2025-03-18"),
      subtotal: "24537.82",
      vatAmount: "4662.18",
      total: "29200",
      currency: "RON",
      notes: "Avans 30% conform contract CONTR-2025-001",
      createdByUserId: managerId,
    },
    {
      clientId: clientId1,
      projectId: renovationProjectIds[0],
      invoiceNumber: "INV-2025-0002",
      status: "paid" as const,
      issueDate: "2025-04-15",
      dueDate: "2025-04-30",
      paidAt: new Date("2025-04-28"),
      subtotal: "20504.20",
      vatAmount: "3895.80",
      total: "24400",
      currency: "RON",
      notes: "Tranșă 2 — finalizare faze electrice",
      createdByUserId: managerId,
    },
    {
      clientId: clientId1,
      projectId: renovationProjectIds[0],
      invoiceNumber: "INV-2025-0003",
      status: "sent" as const,
      issueDate: "2025-05-01",
      dueDate: "2025-05-15",
      subtotal: "13445.38",
      vatAmount: "2554.62",
      total: "16000",
      currency: "RON",
      notes: "Tranșă 3 — lucrări sanitare parțiale",
      createdByUserId: managerId,
    },
    {
      clientId: clientId2,
      projectId: renovationProjectIds[1],
      invoiceNumber: "INV-2025-0004",
      status: "sent" as const,
      issueDate: "2025-07-01",
      dueDate: "2025-07-15",
      subtotal: "29411.76",
      vatAmount: "5588.24",
      total: "35000",
      currency: "RON",
      notes: "Avans 25% conform contract CONTR-2025-002",
      createdByUserId: managerId,
    },
    {
      clientId: clientId3,
      invoiceNumber: "INV-2025-0005",
      status: "paid" as const,
      issueDate: "2025-02-28",
      dueDate: "2025-03-14",
      paidAt: new Date("2025-03-10"),
      subtotal: "23109.24",
      vatAmount: "4390.76",
      total: "27500",
      currency: "RON",
      notes: "Factură finală — proiect Cluj-Napoca complet",
      createdByUserId: managerId,
    },
    {
      clientId: clientId1,
      invoiceNumber: "INV-2024-0098",
      status: "overdue" as const,
      issueDate: "2024-11-01",
      dueDate: "2024-11-30",
      subtotal: "8403.36",
      vatAmount: "1596.64",
      total: "10000",
      currency: "RON",
      notes: "Lucrări suplimentare — noiembrie 2024",
      createdByUserId: managerId,
    },
  ]

  const invoiceIds: string[] = []

  for (const inv of invoiceDefs) {
    const [record] = await db
      .insert(invoices)
      .values({ companyId, ...inv })
      .onConflictDoNothing()
      .returning({ id: invoices.id })

    if (!record) {
      // already exists — fetch id
      const [ex] = await db
        .select({ id: invoices.id })
        .from(invoices)
        .where(
          // @ts-ignore
          import("drizzle-orm").then((m) =>
            m.and(
              m.eq(invoices.companyId, companyId),
              m.eq(invoices.invoiceNumber, inv.invoiceNumber)
            )
          )
        )
        .limit(1)
      continue
    }

    invoiceIds.push(record.id)

    // Line items for INV-2025-0001
    if (inv.invoiceNumber === "INV-2025-0001") {
      await db.insert(invoiceItems).values([
        {
          invoiceId: record.id,
          description: "Avans lucrări renovare — demolare și pregătire",
          quantity: "1",
          unit: "lot",
          unitPrice: "15000",
          vatRate: "19",
          total: "15000",
          sortOrder: 0,
        },
        {
          invoiceId: record.id,
          description: "Materiale electrice — avans achiziție",
          quantity: "1",
          unit: "lot",
          unitPrice: "9537.82",
          vatRate: "19",
          total: "9537.82",
          sortOrder: 1,
        },
      ])
    }

    if (inv.invoiceNumber === "INV-2025-0002") {
      await db.insert(invoiceItems).values([
        {
          invoiceId: record.id,
          description: "Manoperă instalații electrice — finalizare",
          quantity: "80",
          unit: "ore",
          unitPrice: "75",
          vatRate: "19",
          total: "6000",
          sortOrder: 0,
        },
        {
          invoiceId: record.id,
          description: "Materiale electrice — tablou, cabluri",
          quantity: "1",
          unit: "lot",
          unitPrice: "14504.20",
          vatRate: "19",
          total: "14504.20",
          sortOrder: 1,
        },
      ])
    }
  }

  // ── Expenses ────────────────────────────────────────────────────────────────
  const expenseDefs = [
    {
      title: "Combustibil vehicule — Aprilie 2025",
      category: "transport" as const,
      status: "paid" as const,
      amount: "1850",
      date: "2025-04-30",
      submittedById: worker1Id,
    },
    {
      title: "Abonament software PRV — Mai 2025",
      category: "subscriptions" as const,
      status: "paid" as const,
      amount: "490",
      date: "2025-05-01",
      submittedById: managerId,
    },
    {
      title: "Materiale consumabile șantier",
      category: "materials" as const,
      status: "approved" as const,
      amount: "3200",
      date: "2025-04-28",
      submittedById: managerId,
    },
    {
      title: "Masă echipă — planificare proiect Hotel Royal",
      category: "other" as const,
      status: "paid" as const,
      amount: "380",
      date: "2025-06-10",
      submittedById: managerId,
    },
    {
      title: "Piese schimb — autoutilitară B-234-PRV",
      category: "transport" as const,
      status: "submitted" as const,
      amount: "2100",
      date: "2025-05-20",
      submittedById: worker1Id,
    },
    {
      title: "Echipamente protecție muncă — Q2 2025",
      category: "equipment" as const,
      status: "paid" as const,
      amount: "1650",
      date: "2025-04-01",
      submittedById: managerId,
    },
    {
      title: "Chirie spațiu depozitare materiale",
      category: "rent" as const,
      status: "paid" as const,
      amount: "2500",
      date: "2025-05-01",
      submittedById: managerId,
    },
  ]

  const expenseIds: string[] = []

  for (const e of expenseDefs) {
    const [record] = await db
      .insert(expenses)
      .values({ companyId, currency: "RON", ...e })
      .returning({ id: expenses.id })
    if (record) expenseIds.push(record.id)
  }

  console.log(`    ✓ Invoices: ${invoiceIds.length}, Expenses: ${expenseIds.length}`)
  return { invoiceIds, expenseIds }
}
