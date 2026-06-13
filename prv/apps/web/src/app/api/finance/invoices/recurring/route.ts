import { withGates } from "@/lib/with-gates"
import { writeAuditLog } from "@prv/auth"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { recurringInvoices } from "@prv/db/schema"
import { and, eq, isNull, desc, isNotNull } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// ── GET ───────────────────────────────────────────────────────────────────────

export const GET = withGates(
  { action: "finance.invoices.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const active = req.nextUrl.searchParams.get("active")

    const conds = [eq(recurringInvoices.companyId, companyId), isNull(recurringInvoices.deletedAt)]
    if (active === "true") conds.push(eq(recurringInvoices.isActive, true))
    if (active === "false") conds.push(eq(recurringInvoices.isActive, false))

    const rows = await db
      .select()
      .from(recurringInvoices)
      .where(and(...conds))
      .orderBy(desc(recurringInvoices.createdAt))
      .limit(200)

    return NextResponse.json({ recurringInvoices: rows, total: rows.length })
  }
)

// ── POST ──────────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1).max(255),
  clientId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  templateInvoiceId: z.string().uuid().nullable().optional(),
  frequency: z.enum(["weekly", "monthly", "quarterly", "annual"]).default("monthly"),
  nextRunDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  subtotal: z.number().nonnegative(),
  vatRate: z.number().min(0).max(100).default(19),
  currency: z.enum(["RON", "EUR", "USD"]).default("RON"),
  notes: z.string().optional(),
})

export const POST = withGates(
  { action: "finance.invoices.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId, sessionId } = ctx.session

    const raw = await req.json().catch(() => ({}))
    const parsed = createSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const { subtotal, vatRate, ...rest } = parsed.data
    const vatAmount = Math.round(subtotal * (vatRate / 100) * 100) / 100
    const total = Math.round((subtotal + vatAmount) * 100) / 100

    const [created] = await db
      .insert(recurringInvoices)
      .values({
        companyId,
        createdByUserId: userId,
        ...rest,
        subtotal: String(subtotal),
        vatRate: String(vatRate),
        vatAmount: String(vatAmount),
        total: String(total),
        clientId: rest.clientId ?? null,
        projectId: rest.projectId ?? null,
        templateInvoiceId: rest.templateInvoiceId ?? null,
        endDate: rest.endDate ?? null,
      })
      .returning({ id: recurringInvoices.id, name: recurringInvoices.name })

    if (!created) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "finance.recurring-invoices.create",
      entityType: "recurring_invoice",
      entityId: created.id,
      payload: parsed.data,
      method: "POST",
      path: "/api/finance/invoices/recurring",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ recurringInvoice: created }, { status: 201 })
  }
)
