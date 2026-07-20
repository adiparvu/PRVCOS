import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { permitDesignations, users } from "@prv/db/schema"
import { and, asc, eq } from "drizzle-orm"
import { z } from "zod"
import { type PermitDesignationRole } from "@/lib/ptw"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Designation management is restricted to owner-level roles (conservative default).
const MANAGE_ROLES = new Set(["group_ceo", "ceo", "co_ceo", "system_administrator"])

export interface PermitDesignationDto {
  id: string
  userId: string
  userName: string | null
  role: PermitDesignationRole
  createdAt: string
}

// GET /api/safety/permit-designations — the company's designated approvers, and
// whether the caller may manage the list.
export const GET = withGates(
  { action: "safety.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, role } = ctx.session
    const rows = await db
      .select({
        id: permitDesignations.id,
        userId: permitDesignations.userId,
        role: permitDesignations.role,
        createdAt: permitDesignations.createdAt,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(permitDesignations)
      .leftJoin(users, eq(permitDesignations.userId, users.id))
      .where(eq(permitDesignations.companyId, companyId))
      .orderBy(asc(users.lastName), asc(users.firstName))

    const designations: PermitDesignationDto[] = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.firstName && r.lastName ? `${r.firstName} ${r.lastName}` : null,
      role: r.role,
      createdAt: r.createdAt.toISOString(),
    }))
    return NextResponse.json({ designations, canManage: MANAGE_ROLES.has(role) })
  }
)

const createSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["supervisor", "safety_officer"]),
})

// POST /api/safety/permit-designations — designate a user (owner-level only).
export const POST = withGates(
  { action: "safety.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId, role } = ctx.session
    if (!MANAGE_ROLES.has(role))
      return NextResponse.json({ error: "Not authorized to manage designations" }, { status: 403 })

    const parsed = createSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 422 })

    // Only a user who belongs to this company can be designated.
    const [member] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, parsed.data.userId), eq(users.companyId, companyId)))
      .limit(1)
    if (!member) return NextResponse.json({ error: "User not in company" }, { status: 404 })

    const [created] = await db
      .insert(permitDesignations)
      .values({
        companyId,
        userId: parsed.data.userId,
        role: parsed.data.role,
        createdByUserId: userId,
      })
      .onConflictDoNothing()
      .returning({ id: permitDesignations.id })

    if (!created) return NextResponse.json({ error: "Already designated" }, { status: 409 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "safety.permit_designation.create",
      entityType: "permit_designation",
      entityId: created.id,
      payload: { userId: parsed.data.userId, role: parsed.data.role },
      method: "POST",
      path: "/api/safety/permit-designations",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: created.id }, { status: 201 })
  }
)
