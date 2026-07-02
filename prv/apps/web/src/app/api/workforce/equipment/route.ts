import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { equipmentAssignments, users } from "@prv/db/schema"
import { and, eq, desc } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const CONDITIONS = ["new", "good", "fair", "poor", "damaged"] as const
const STATUSES = ["assigned", "returned", "lost"] as const

export interface EquipmentAssignment {
  id: string
  userId: string
  userName: string | null
  equipmentType: string
  label: string | null
  serialNumber: string | null
  assignedDate: string
  expectedReturnDate: string | null
  returnedDate: string | null
  condition: (typeof CONDITIONS)[number]
  returnCondition: (typeof CONDITIONS)[number] | null
  status: (typeof STATUSES)[number]
  overdue: boolean
  notes: string | null
  assignedByName: string | null
}

export interface EquipmentMeta {
  total: number
  assigned: number
  overdue: number
  returned: number
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

// GET /api/workforce/equipment?userId=&status= — the company equipment register,
// each row flagged overdue when it's still out past its expected return date.
export const GET = withGates(
  { action: "workforce.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const sp = req.nextUrl.searchParams
    const userId = sp.get("userId")
    const status = sp.get("status")

    const assigner = alias(users, "assigner")
    const conds = [eq(equipmentAssignments.companyId, ctx.session.companyId)]
    if (userId) conds.push(eq(equipmentAssignments.userId, userId))
    if (status && (STATUSES as readonly string[]).includes(status)) {
      conds.push(eq(equipmentAssignments.status, status as (typeof STATUSES)[number]))
    }

    const rows = await db
      .select({
        id: equipmentAssignments.id,
        userId: equipmentAssignments.userId,
        equipmentType: equipmentAssignments.equipmentType,
        label: equipmentAssignments.label,
        serialNumber: equipmentAssignments.serialNumber,
        assignedDate: equipmentAssignments.assignedDate,
        expectedReturnDate: equipmentAssignments.expectedReturnDate,
        returnedDate: equipmentAssignments.returnedDate,
        condition: equipmentAssignments.condition,
        returnCondition: equipmentAssignments.returnCondition,
        status: equipmentAssignments.status,
        notes: equipmentAssignments.notes,
        firstName: users.firstName,
        lastName: users.lastName,
        assignerFirst: assigner.firstName,
        assignerLast: assigner.lastName,
      })
      .from(equipmentAssignments)
      .leftJoin(users, eq(equipmentAssignments.userId, users.id))
      .leftJoin(assigner, eq(equipmentAssignments.assignedByUserId, assigner.id))
      .where(and(...conds))
      .orderBy(desc(equipmentAssignments.assignedDate))

    const day = today()
    const items: EquipmentAssignment[] = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.firstName ? `${r.firstName} ${r.lastName}`.trim() : null,
      equipmentType: r.equipmentType,
      label: r.label,
      serialNumber: r.serialNumber,
      assignedDate: r.assignedDate,
      expectedReturnDate: r.expectedReturnDate,
      returnedDate: r.returnedDate,
      condition: r.condition as (typeof CONDITIONS)[number],
      returnCondition: (r.returnCondition as (typeof CONDITIONS)[number] | null) ?? null,
      status: r.status as (typeof STATUSES)[number],
      overdue: r.status === "assigned" && !!r.expectedReturnDate && r.expectedReturnDate < day,
      notes: r.notes,
      assignedByName: r.assignerFirst ? `${r.assignerFirst} ${r.assignerLast}`.trim() : null,
    }))

    const meta: EquipmentMeta = {
      total: items.length,
      assigned: items.filter((i) => i.status === "assigned").length,
      overdue: items.filter((i) => i.overdue).length,
      returned: items.filter((i) => i.status === "returned").length,
    }

    return NextResponse.json({ items, meta })
  }
)

// POST /api/workforce/equipment — issue equipment to an employee.
const ISO = /^\d{4}-\d{2}-\d{2}$/
const postSchema = z.object({
  userId: z.string().uuid(),
  equipmentType: z.string().min(1).max(80),
  label: z.string().max(160).nullable().optional(),
  serialNumber: z.string().max(120).nullable().optional(),
  assignedDate: z.string().regex(ISO),
  expectedReturnDate: z.string().regex(ISO).nullable().optional(),
  condition: z.enum(CONDITIONS).default("good"),
  notes: z.string().max(2000).nullable().optional(),
})

export const POST = withGates(
  { action: "workforce.write", endpointClass: "api_write" },
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

    const [record] = await db
      .insert(equipmentAssignments)
      .values({
        companyId,
        userId: d.userId,
        equipmentType: d.equipmentType,
        label: d.label ?? null,
        serialNumber: d.serialNumber ?? null,
        assignedDate: d.assignedDate,
        expectedReturnDate: d.expectedReturnDate ?? null,
        condition: d.condition,
        notes: d.notes ?? null,
        assignedByUserId: actorId,
      })
      .returning({ id: equipmentAssignments.id })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "workforce.equipment.assign",
      entityType: "equipment_assignment",
      entityId: record?.id ?? d.userId,
      payload: { userId: d.userId, equipmentType: d.equipmentType, serialNumber: d.serialNumber },
      method: "POST",
      path: "/api/workforce/equipment",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record?.id }, { status: 201 })
  }
)
