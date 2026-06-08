import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { invoices, invoiceItems } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import { eq, and, isNull, count } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const lineItemSchema = z.object({
  name: z.string().min(1).max(500),
  qty: z.number().positive(),
  unitPrice: z.number().min(0),
  vatRate: z.number().min(0).max(100).default(19),
})

const bodySchema = z.object({
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currency: z.string().length(3).default("RON"),
  notes: z.string().max(2000).optional(),
  reference: z.string().max(100).optional(),
  items: z.array(lineItemSchema).min(1).max(100),
})

export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  const ipAddress =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { clientId, projectId, issueDate, dueDate, currency, notes, reference, items } = parsed.data

  // Calculate totals
  let subtotal = 0
  let vatAmount = 0
  for (const item of items) {
    const lineSubtotal = item.qty * item.unitPrice
    subtotal += lineSubtotal
    vatAmount += lineSubtotal * (item.vatRate / 100)
  }
  subtotal = Math.round(subtotal * 100) / 100
  vatAmount = Math.round(vatAmount * 100) / 100
  const total = Math.round((subtotal + vatAmount) * 100) / 100

  // Generate next invoice number (INV-YYYY-XXXX)
  const year = issueDate.slice(0, 4)
  const countResult = await db
    .select({ existingCount: count() })
    .from(invoices)
    .where(and(eq(invoices.companyId, ctx.companyId), isNull(invoices.deletedAt)))
  const existingCount = countResult[0]?.existingCount ?? 0

  const seq = String(existingCount + 1).padStart(4, "0")
  const invoiceNumber = `INV-${year}-${seq}`

  const metaBase = reference ? { reference } : {}

  const [invoice] = await db
    .insert(invoices)
    .values({
      companyId: ctx.companyId,
      clientId: clientId ?? null,
      projectId: projectId ?? null,
      createdByUserId: ctx.userId,
      invoiceNumber,
      status: "draft",
      issueDate,
      dueDate,
      subtotal: String(subtotal),
      vatAmount: String(vatAmount),
      total: String(total),
      currency: currency.toUpperCase(),
      notes: notes ?? null,
      metadata: metaBase,
    })
    .returning({ id: invoices.id, invoiceNumber: invoices.invoiceNumber })

  if (!invoice) {
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 })
  }

  // Insert line items
  await db.insert(invoiceItems).values(
    items.map((item, idx) => ({
      invoiceId: invoice.id,
      description: item.name,
      quantity: String(item.qty),
      unit: "buc",
      unitPrice: String(item.unitPrice),
      vatRate: String(item.vatRate),
      total: String(Math.round(item.qty * item.unitPrice * (1 + item.vatRate / 100) * 100) / 100),
      sortOrder: idx,
    }))
  )

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "mobile.invoice.create",
    entityType: "invoice",
    entityId: invoice.id,
    method: "POST",
    path: "/api/mobile/invoices",
    ipAddress,
    userAgent: req.headers.get("user-agent") ?? "",
  })

  return NextResponse.json(
    {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: "draft",
      total,
      currency: currency.toUpperCase(),
    },
    { status: 201 }
  )
})
