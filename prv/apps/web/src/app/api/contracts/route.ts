import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { employmentContracts, users } from "@prv/db/schema"
import { and, eq, desc } from "drizzle-orm"
import { z } from "zod"
import { contractAlert, daysUntil, type ContractAlert } from "@/lib/contract-expiry"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const TYPES = ["permanent", "fixed_term", "contractor", "intern"] as const
const STATUSES = ["draft", "active", "expired", "terminated", "superseded"] as const
const PERIODS = ["hourly", "monthly", "annual"] as const
const ISO = /^\d{4}-\d{2}-\d{2}$/

export interface ContractSummary {
  id: string
  userId: string
  userName: string | null
  type: (typeof TYPES)[number]
  status: (typeof STATUSES)[number]
  roleTitle: string
  startDate: string
  endDate: string | null
  salaryAmount: number | null
  salaryCurrency: string
  payPeriod: (typeof PERIODS)[number]
  version: number
  signed: boolean
  expiresInDays: number | null
  alert: ContractAlert
}

export interface ContractMeta {
  total: number
  active: number
  expiringSoon: number
  expired: number
}

function num(v: string | null): number | null {
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

// GET /api/contracts?userId=&status= — the HR contract register. Each active,
// dated contract is annotated with days-to-expiry + an alert level (60/30/14/7
// or expired). Summary counts feed the expiring-soon queue.
export const GET = withGates(
  { action: "hr.contracts.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const sp = req.nextUrl.searchParams
    const userId = sp.get("userId")
    const status = sp.get("status")

    const conds = [eq(employmentContracts.companyId, ctx.session.companyId)]
    if (userId) conds.push(eq(employmentContracts.userId, userId))
    if (status && (STATUSES as readonly string[]).includes(status)) {
      conds.push(eq(employmentContracts.status, status as (typeof STATUSES)[number]))
    }

    const rows = await db
      .select({
        id: employmentContracts.id,
        userId: employmentContracts.userId,
        type: employmentContracts.type,
        status: employmentContracts.status,
        roleTitle: employmentContracts.roleTitle,
        startDate: employmentContracts.startDate,
        endDate: employmentContracts.endDate,
        salaryAmount: employmentContracts.salaryAmount,
        salaryCurrency: employmentContracts.salaryCurrency,
        payPeriod: employmentContracts.payPeriod,
        version: employmentContracts.version,
        signedAt: employmentContracts.signedAt,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(employmentContracts)
      .leftJoin(users, eq(employmentContracts.userId, users.id))
      .where(and(...conds))
      .orderBy(desc(employmentContracts.startDate))

    const day = today()
    const contracts: ContractSummary[] = rows.map((r) => {
      // Only active, dated contracts raise expiry alerts.
      const alert = r.status === "active" ? contractAlert(r.endDate, day) : null
      const expiresInDays = r.endDate ? daysUntil(r.endDate, day) : null
      return {
        id: r.id,
        userId: r.userId,
        userName: r.firstName ? `${r.firstName} ${r.lastName}`.trim() : null,
        type: r.type as (typeof TYPES)[number],
        status: r.status as (typeof STATUSES)[number],
        roleTitle: r.roleTitle,
        startDate: r.startDate,
        endDate: r.endDate,
        salaryAmount: num(r.salaryAmount),
        salaryCurrency: r.salaryCurrency,
        payPeriod: r.payPeriod as (typeof PERIODS)[number],
        version: r.version,
        signed: !!r.signedAt,
        expiresInDays,
        alert,
      }
    })

    // Expiring-soon queue first, then by start date (already desc from query).
    contracts.sort((a, b) => {
      const av = a.alert === "expired" ? -1 : (a.alert ?? 9999)
      const bv = b.alert === "expired" ? -1 : (b.alert ?? 9999)
      return av - bv
    })

    const meta: ContractMeta = {
      total: contracts.length,
      active: contracts.filter((c) => c.status === "active").length,
      expiringSoon: contracts.filter((c) => c.alert != null && c.alert !== "expired").length,
      expired: contracts.filter((c) => c.alert === "expired").length,
    }

    return NextResponse.json({ contracts, meta })
  }
)

// POST /api/contracts — issue a contract. When `supersedesId` is provided, the
// prior contract is marked superseded and the version increments (amendment).
const postSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(TYPES).default("permanent"),
  status: z.enum(["draft", "active"]).default("draft"),
  roleTitle: z.string().min(1).max(160),
  startDate: z.string().regex(ISO),
  endDate: z.string().regex(ISO).nullable().optional(),
  salaryAmount: z.number().min(0).max(100_000_000).nullable().optional(),
  salaryCurrency: z.string().min(3).max(3).default("RON"),
  payPeriod: z.enum(PERIODS).default("monthly"),
  noticePeriodDays: z.number().int().min(0).max(3650).nullable().optional(),
  terms: z.string().max(20000).nullable().optional(),
  supersedesId: z.string().uuid().nullable().optional(),
})

export const POST = withGates(
  { action: "hr.contracts.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId: actorId, sessionId } = ctx.session

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = postSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const d = parsed.data

    let version = 1
    if (d.supersedesId) {
      const [prior] = await db
        .update(employmentContracts)
        .set({ status: "superseded", updatedAt: new Date() })
        .where(
          and(
            eq(employmentContracts.id, d.supersedesId),
            eq(employmentContracts.companyId, companyId)
          )
        )
        .returning({ version: employmentContracts.version })
      if (!prior) {
        return NextResponse.json({ error: "Prior contract not found" }, { status: 404 })
      }
      version = prior.version + 1
    }

    const [record] = await db
      .insert(employmentContracts)
      .values({
        companyId,
        userId: d.userId,
        type: d.type,
        status: d.status,
        roleTitle: d.roleTitle,
        startDate: d.startDate,
        endDate: d.endDate ?? null,
        salaryAmount: d.salaryAmount != null ? d.salaryAmount.toFixed(2) : null,
        salaryCurrency: d.salaryCurrency,
        payPeriod: d.payPeriod,
        noticePeriodDays: d.noticePeriodDays ?? null,
        terms: d.terms ?? null,
        version,
        supersedesId: d.supersedesId ?? null,
        createdById: actorId,
      })
      .returning({ id: employmentContracts.id })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "hr.contracts.create",
      entityType: "employment_contract",
      entityId: record?.id ?? d.userId,
      payload: { userId: d.userId, type: d.type, version },
      method: "POST",
      path: "/api/contracts",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record?.id, version }, { status: 201 })
  }
)
