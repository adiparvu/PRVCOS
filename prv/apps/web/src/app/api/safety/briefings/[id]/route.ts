import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { safetyBriefings, safetyBriefingAttendees, users } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BriefingAttendee {
  id: string
  userId: string
  userName: string
  signedAt: string
}

export interface BriefingDetail {
  briefing: {
    id: string
    companyId: string
    createdBy: string
    title: string
    content: string
    category: string
    scheduledAt: string | null
    nextScheduledDate: string | null
    isActive: boolean
    attendeeCount: number
    createdAt: string
    updatedAt: string
  }
  attendees: BriefingAttendee[]
}

// ── GET /api/safety/briefings/[id] ───────────────────────────────────────────

export const GET = withGates(
  { action: "safety.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const [briefingRows, attendeeRows] = await Promise.all([
      db
        .select({
          id: safetyBriefings.id,
          companyId: safetyBriefings.companyId,
          createdBy: safetyBriefings.createdBy,
          title: safetyBriefings.title,
          content: safetyBriefings.content,
          category: safetyBriefings.category,
          scheduledAt: safetyBriefings.scheduledAt,
          nextScheduledDate: safetyBriefings.nextScheduledDate,
          isActive: safetyBriefings.isActive,
          attendeeCount: safetyBriefings.attendeeCount,
          createdAt: safetyBriefings.createdAt,
          updatedAt: safetyBriefings.updatedAt,
        })
        .from(safetyBriefings)
        .where(and(eq(safetyBriefings.id, id), eq(safetyBriefings.companyId, companyId)))
        .limit(1),

      db
        .select({
          id: safetyBriefingAttendees.id,
          userId: safetyBriefingAttendees.userId,
          signedAt: safetyBriefingAttendees.signedAt,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(safetyBriefingAttendees)
        .leftJoin(users, eq(safetyBriefingAttendees.userId, users.id))
        .where(eq(safetyBriefingAttendees.briefingId, id))
        .orderBy(safetyBriefingAttendees.signedAt),
    ])

    const row = briefingRows[0]
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const detail: BriefingDetail = {
      briefing: {
        id: row.id,
        companyId: row.companyId,
        createdBy: row.createdBy,
        title: row.title,
        content: row.content,
        category: row.category ?? "general",
        scheduledAt: row.scheduledAt ? row.scheduledAt.toISOString() : null,
        nextScheduledDate: row.nextScheduledDate ? row.nextScheduledDate.toISOString() : null,
        isActive: row.isActive,
        attendeeCount: row.attendeeCount,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
      attendees: attendeeRows.map((a) => ({
        id: a.id,
        userId: a.userId,
        userName: a.firstName && a.lastName ? `${a.firstName} ${a.lastName}` : a.userId,
        signedAt: a.signedAt.toISOString(),
      })),
    }

    return NextResponse.json(detail)
  }
)

// ── PATCH /api/safety/briefings/[id] ─────────────────────────────────────────

const patchBriefingSchema = z
  .object({
    title: z.string().min(1).max(300).optional(),
    content: z.string().optional(),
    category: z.string().max(100).optional(),
    scheduledAt: z.string().datetime().nullable().optional(),
    nextScheduledDate: z.string().datetime().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (d) =>
      d.title !== undefined ||
      d.content !== undefined ||
      d.category !== undefined ||
      d.scheduledAt !== undefined ||
      d.nextScheduledDate !== undefined ||
      d.isActive !== undefined,
    { message: "At least one field required" }
  )

export const PATCH = withGates(
  { action: "safety.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const raw = await req.json().catch(() => ({}))
    const parsed = patchBriefingSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [existing] = await db
      .select({ id: safetyBriefings.id })
      .from(safetyBriefings)
      .where(and(eq(safetyBriefings.id, id), eq(safetyBriefings.companyId, companyId)))
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const d = parsed.data

    const [updated] = await db
      .update(safetyBriefings)
      .set({
        ...(d.title !== undefined && { title: d.title }),
        ...(d.content !== undefined && { content: d.content }),
        ...(d.category !== undefined && { category: d.category }),
        ...(d.scheduledAt !== undefined && {
          scheduledAt: d.scheduledAt ? new Date(d.scheduledAt) : null,
        }),
        ...(d.nextScheduledDate !== undefined && {
          nextScheduledDate: d.nextScheduledDate ? new Date(d.nextScheduledDate) : null,
        }),
        ...(d.isActive !== undefined && { isActive: d.isActive }),
        updatedAt: new Date(),
      })
      .where(and(eq(safetyBriefings.id, id), eq(safetyBriefings.companyId, companyId)))
      .returning({ id: safetyBriefings.id, isActive: safetyBriefings.isActive })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "safety.briefing.update",
      entityType: "safety_briefing",
      entityId: id,
      payload: d,
      method: "PATCH",
      path: `/api/safety/briefings/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)
