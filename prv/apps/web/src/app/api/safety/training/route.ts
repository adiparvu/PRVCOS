import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { safetyTrainingRecords, users } from "@prv/db/schema"
import { and, count, eq, gt, lt, lte, desc } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TrainingRecord {
  id: string
  userId: string
  userName: string
  trainingName: string
  provider: string | null
  completedAt: string
  expiresAt: string | null
  certificateUrl: string | null
}

export interface TrainingMeta {
  total: number
  expiringSoon: number
  expired: number
}

const LIMIT = 50

// ── GET /api/safety/training ──────────────────────────────────────────────────

export const GET = withGates(
  { action: "safety.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session

    const userIdFilter = req.nextUrl.searchParams.get("userId")
    const expiringSoon = req.nextUrl.searchParams.get("expiringSoon") === "true"
    const limitParam = req.nextUrl.searchParams.get("limit")
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || LIMIT, 200) : LIMIT

    const now = new Date()
    const in30Days = new Date(now.getTime() + 30 * 86_400_000)

    const rows = await db
      .select({
        id: safetyTrainingRecords.id,
        userId: safetyTrainingRecords.userId,
        trainingName: safetyTrainingRecords.trainingName,
        provider: safetyTrainingRecords.provider,
        completedAt: safetyTrainingRecords.completedAt,
        expiresAt: safetyTrainingRecords.expiresAt,
        certificateUrl: safetyTrainingRecords.certificateUrl,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(safetyTrainingRecords)
      .leftJoin(users, eq(safetyTrainingRecords.userId, users.id))
      .where(
        and(
          eq(safetyTrainingRecords.companyId, companyId),
          userIdFilter ? eq(safetyTrainingRecords.userId, userIdFilter) : undefined,
          expiringSoon ? gt(safetyTrainingRecords.expiresAt, now) : undefined,
          expiringSoon ? lte(safetyTrainingRecords.expiresAt, in30Days) : undefined
        )
      )
      .orderBy(desc(safetyTrainingRecords.completedAt))
      .limit(limit)

    const [totalRow, expiringSoonRow, expiredRow] = await Promise.all([
      db
        .select({ value: count() })
        .from(safetyTrainingRecords)
        .where(eq(safetyTrainingRecords.companyId, companyId)),
      // expiring in next 30 days (not yet expired)
      db
        .select({ value: count() })
        .from(safetyTrainingRecords)
        .where(
          and(
            eq(safetyTrainingRecords.companyId, companyId),
            gt(safetyTrainingRecords.expiresAt, now),
            lte(safetyTrainingRecords.expiresAt, in30Days)
          )
        ),
      // already expired
      db
        .select({ value: count() })
        .from(safetyTrainingRecords)
        .where(
          and(
            eq(safetyTrainingRecords.companyId, companyId),
            lt(safetyTrainingRecords.expiresAt, now)
          )
        ),
    ])

    const records: TrainingRecord[] = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName:
        r.userFirstName && r.userLastName ? `${r.userFirstName} ${r.userLastName}` : r.userId,
      trainingName: r.trainingName,
      provider: r.provider ?? null,
      completedAt: r.completedAt.toISOString(),
      expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
      certificateUrl: r.certificateUrl ?? null,
    }))

    const meta: TrainingMeta = {
      total: totalRow[0]?.value ?? 0,
      expiringSoon: expiringSoonRow[0]?.value ?? 0,
      expired: expiredRow[0]?.value ?? 0,
    }

    return NextResponse.json({ records, meta })
  }
)

// ── POST /api/safety/training ─────────────────────────────────────────────────

const createTrainingSchema = z.object({
  userId: z.string().uuid(),
  trainingName: z.string().min(1).max(300),
  provider: z.string().max(200).optional(),
  completedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  certificateUrl: z.string().url().max(500).optional(),
  notes: z.string().optional(),
})

export const POST = withGates(
  { action: "safety.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId: actorId } = ctx.session

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = createTrainingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const d = parsed.data

    const [record] = await db
      .insert(safetyTrainingRecords)
      .values({
        companyId,
        userId: d.userId,
        trainingName: d.trainingName,
        provider: d.provider ?? null,
        completedAt: new Date(d.completedAt),
        expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
        certificateUrl: d.certificateUrl ?? null,
        notes: d.notes ?? null,
      })
      .returning({ id: safetyTrainingRecords.id, trainingName: safetyTrainingRecords.trainingName })

    if (!record) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId: ctx.session.sessionId,
      action: "safety.training.create",
      entityType: "safety_training_record",
      entityId: record.id,
      payload: d,
      method: "POST",
      path: "/api/safety/training",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record.id, trainingName: record.trainingName }, { status: 201 })
  }
)
