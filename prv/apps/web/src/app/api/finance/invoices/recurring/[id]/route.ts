import { withGates } from "@/lib/with-gates"
import { writeAuditLog } from "@prv/auth"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { recurringInvoices } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function getId(req: NextRequest) {
  return req.nextUrl.pathname.split("/").pop() ?? null
}

export const GET = withGates(
  { action: "finance.invoices.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const id = getId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const [row] = await db
      .select()
      .from(recurringInvoices)
      .where(
        and(
          eq(recurringInvoices.id, id),
          eq(recurringInvoices.companyId, companyId),
          isNull(recurringInvoices.deletedAt)
        )
      )
      .limit(1)

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    return NextResponse.json({ recurringInvoice: row })
  }
)

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  frequency: z.enum(["weekly", "monthly", "quarterly", "annual"]).optional(),
  nextRunDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  isActive: z.boolean().optional(),
  subtotal: z.number().nonnegative().optional(),
  vatRate: z.number().min(0).max(100).optional(),
  notes: z.string().nullable().optional(),
})

export const PATCH = withGates(
  { action: "finance.invoices.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId, sessionId } = ctx.session
    const id = getId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const [existing] = await db
      .select({
        id: recurringInvoices.id,
        subtotal: recurringInvoices.subtotal,
        vatRate: recurringInvoices.vatRate,
      })
      .from(recurringInvoices)
      .where(
        and(
          eq(recurringInvoices.id, id),
          eq(recurringInvoices.companyId, companyId),
          isNull(recurringInvoices.deletedAt)
        )
      )
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const raw = await req.json().catch(() => ({}))
    const parsed = patchSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() }
    const { subtotal, vatRate, ...rest } = parsed.data

    Object.assign(updates, rest)

    if (subtotal !== undefined || vatRate !== undefined) {
      const newSubtotal = subtotal ?? parseFloat(existing.subtotal)
      const newVatRate = vatRate ?? parseFloat(existing.vatRate)
      const newVat = Math.round(newSubtotal * (newVatRate / 100) * 100) / 100
      updates.subtotal = String(newSubtotal)
      updates.vatRate = String(newVatRate)
      updates.vatAmount = String(newVat)
      updates.total = String(Math.round((newSubtotal + newVat) * 100) / 100)
    }

    const [updated] = await db
      .update(recurringInvoices)
      .set(updates)
      .where(eq(recurringInvoices.id, id))
      .returning({ id: recurringInvoices.id, name: recurringInvoices.name })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "finance.recurring-invoices.update",
      entityType: "recurring_invoice",
      entityId: id,
      payload: parsed.data,
      method: "PATCH",
      path: `/api/finance/invoices/recurring/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ recurringInvoice: updated })
  }
)

export const DELETE = withGates(
  { action: "finance.invoices.delete", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId, sessionId } = ctx.session
    const id = getId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const [existing] = await db
      .select({ id: recurringInvoices.id })
      .from(recurringInvoices)
      .where(
        and(
          eq(recurringInvoices.id, id),
          eq(recurringInvoices.companyId, companyId),
          isNull(recurringInvoices.deletedAt)
        )
      )
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db
      .update(recurringInvoices)
      .set({ deletedAt: new Date(), updatedAt: new Date(), isActive: false })
      .where(eq(recurringInvoices.id, id))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "finance.recurring-invoices.delete",
      entityType: "recurring_invoice",
      entityId: id,
      payload: {},
      method: "DELETE",
      path: `/api/finance/invoices/recurring/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
