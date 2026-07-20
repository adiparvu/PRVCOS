import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { safetyPermits, users } from "@prv/db/schema"
import { and, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm"
import { z } from "zod"
import { effectivePermitStatus, isPermitType, type PermitStatus, type PermitType } from "@/lib/ptw"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface PermitSummary {
  id: string
  type: PermitType
  status: PermitStatus
  effectiveStatus: PermitStatus
  title: string
  location: string | null
  validFrom: string
  validTo: string
  requesterName: string | null
  createdAt: string
}

export interface PermitsMeta {
  total: number
  active: number
  pendingApproval: number
  expiringSoon: number
}

const EXPIRING_MS = 48 * 3_600_000

// ─── GET /api/safety/permits ──────────────────────────────────────────────────
export const GET = withGates(
  { action: "safety.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const url = req.nextUrl.searchParams
    const statusFilter = url.get("status")
    const typeFilter = url.get("type")
    const limit = Math.min(200, Math.max(1, Number(url.get("limit")) || 100))

    const conds = [eq(safetyPermits.companyId, companyId)]
    if (statusFilter) conds.push(eq(safetyPermits.status, statusFilter as PermitStatus))
    if (typeFilter && isPermitType(typeFilter)) conds.push(eq(safetyPermits.type, typeFilter))

    const now = new Date()
    const [rows, totalRow, activeRow, pendingRow, expiringRow] = await Promise.all([
      db
        .select({
          id: safetyPermits.id,
          type: safetyPermits.type,
          status: safetyPermits.status,
          title: safetyPermits.title,
          location: safetyPermits.location,
          validFrom: safetyPermits.validFrom,
          validTo: safetyPermits.validTo,
          createdAt: safetyPermits.createdAt,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(safetyPermits)
        .leftJoin(users, eq(safetyPermits.requestedBy, users.id))
        .where(and(...conds))
        .orderBy(desc(safetyPermits.validFrom))
        .limit(limit),
      db.select({ c: count() }).from(safetyPermits).where(eq(safetyPermits.companyId, companyId)),
      db
        .select({ c: count() })
        .from(safetyPermits)
        .where(and(eq(safetyPermits.companyId, companyId), eq(safetyPermits.status, "active"))),
      db
        .select({ c: count() })
        .from(safetyPermits)
        .where(
          and(
            eq(safetyPermits.companyId, companyId),
            inArray(safetyPermits.status, ["pending_supervisor", "pending_safety_officer"])
          )
        ),
      db
        .select({ c: count() })
        .from(safetyPermits)
        .where(
          and(
            eq(safetyPermits.companyId, companyId),
            inArray(safetyPermits.status, ["approved", "active"]),
            gte(safetyPermits.validTo, now),
            lte(safetyPermits.validTo, new Date(now.getTime() + EXPIRING_MS))
          )
        ),
    ])

    const permits: PermitSummary[] = rows.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      effectiveStatus: effectivePermitStatus(r.status, r.validTo.getTime(), now.getTime()),
      title: r.title,
      location: r.location,
      validFrom: r.validFrom.toISOString(),
      validTo: r.validTo.toISOString(),
      requesterName: r.firstName && r.lastName ? `${r.firstName} ${r.lastName}` : null,
      createdAt: r.createdAt.toISOString(),
    }))

    const meta: PermitsMeta = {
      total: totalRow[0]?.c ?? 0,
      active: activeRow[0]?.c ?? 0,
      pendingApproval: pendingRow[0]?.c ?? 0,
      expiringSoon: expiringRow[0]?.c ?? 0,
    }

    return NextResponse.json({ permits, meta })
  }
)

// ─── POST /api/safety/permits — create a draft ────────────────────────────────
const riskRowSchema = z.object({
  hazard: z.string().min(1).max(500),
  control: z.string().min(1).max(500),
  residualRisk: z.enum(["low", "medium", "high"]),
})

const createSchema = z.object({
  type: z.enum(["hot_work", "confined_space", "working_at_height", "electrical", "excavation"]),
  title: z.string().min(1).max(300),
  description: z.string().min(1).max(4000),
  location: z.string().max(300).optional(),
  projectId: z.string().uuid().nullable().optional(),
  supervisorId: z.string().uuid().nullable().optional(),
  safetyOfficerId: z.string().uuid().nullable().optional(),
  validFrom: z.string().datetime(),
  validTo: z.string().datetime(),
  riskAssessment: z.array(riskRowSchema).max(50).optional(),
  ppe: z.array(z.string().max(100)).max(30).optional(),
  typeDetails: z.record(z.string(), z.unknown()).optional(),
})

export const POST = withGates(
  { action: "safety.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const parsed = createSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    const d = parsed.data

    const [created] = await db
      .insert(safetyPermits)
      .values({
        companyId,
        requestedBy: userId,
        type: d.type,
        title: d.title,
        description: d.description,
        location: d.location ?? null,
        projectId: d.projectId ?? null,
        supervisorId: d.supervisorId ?? null,
        safetyOfficerId: d.safetyOfficerId ?? null,
        validFrom: new Date(d.validFrom),
        validTo: new Date(d.validTo),
        riskAssessment: d.riskAssessment ?? [],
        ppe: d.ppe ?? [],
        typeDetails: d.typeDetails ?? {},
      })
      .returning({ id: safetyPermits.id, title: safetyPermits.title })

    if (!created) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "safety.permit.create",
      entityType: "safety_permit",
      entityId: created.id,
      payload: { type: d.type, title: d.title },
      method: "POST",
      path: "/api/safety/permits",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: created.id, title: created.title }, { status: 201 })
  }
)
