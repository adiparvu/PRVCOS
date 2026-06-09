import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { tools, users, stores, auditLogs } from "@prv/db/schema"
import { and, count, eq, gte, isNull } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type MaintenanceStatus = "Done" | "Due Soon" | "Overdue"

export interface MaintenanceRecord {
  id: string
  label: string
  detail: string
  status: MaintenanceStatus
}

export interface ToolSpec {
  key: string
  val: string
}

export interface ToolDetail {
  id: string
  name: string
  model: string
  category: string
  status: string
  assignedTo: string | null
  site: string | null
  dueBack: null
  location: string | null
  lastUsed: string | null
  utilisationPct: number
  serviceOverdueDays: number | null
  ageYears: number | null
  usesThisMonth: number
  valueEur: number
  lastService: string
  nextService: string
  specs: ToolSpec[]
  maintenance: MaintenanceRecord[]
}

const MONTH_LABELS = [
  "Ian",
  "Feb",
  "Mar",
  "Apr",
  "Mai",
  "Iun",
  "Iul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

function fmtDate(d: Date): string {
  return `${d.getDate()} ${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`
}

function dbStatusToApi(s: string): string {
  switch (s) {
    case "in_use":
      return "In Use"
    case "maintenance":
      return "Maintenance"
    case "lost":
      return "Missing"
    default:
      return "Available"
  }
}

export const GET = withGates(
  { action: "tools.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId } = ctx.session

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const [rows, usageCountRows] = await Promise.all([
      db
        .select({
          id: tools.id,
          name: tools.name,
          category: tools.category,
          brand: tools.brand,
          model: tools.model,
          serialNumber: tools.serialNumber,
          status: tools.status,
          purchasedAt: tools.purchasedAt,
          lastServiceAt: tools.lastServiceAt,
          warrantyExpiresAt: tools.warrantyExpiresAt,
          notes: tools.notes,
          assignedFirstName: users.firstName,
          assignedLastName: users.lastName,
          storeName: stores.name,
        })
        .from(tools)
        .leftJoin(users, eq(tools.assignedUserId, users.id))
        .leftJoin(stores, eq(tools.storeId, stores.id))
        .where(and(eq(tools.id, id), eq(tools.companyId, companyId), isNull(tools.deletedAt)))
        .limit(1),

      db
        .select({ cnt: count() })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.companyId, companyId),
            eq(auditLogs.entityId, id),
            eq(auditLogs.entityType, "tool"),
            gte(auditLogs.createdAt, monthStart)
          )
        ),
    ])

    const row = rows[0]
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const apiStatus = dbStatusToApi(row.status)
    const utilisationPct = apiStatus === "In Use" ? 100 : 0

    const now = Date.now()
    const THRESHOLD_MS = 180 * 24 * 60 * 60 * 1000
    const serviceOverdueDays: number | null = (() => {
      if (row.status === "maintenance" || !row.lastServiceAt) return null
      const diff = now - row.lastServiceAt.getTime()
      if (diff > THRESHOLD_MS) return Math.floor((diff - THRESHOLD_MS) / 86_400_000)
      return null
    })()

    const ageYears = row.purchasedAt
      ? Math.round(((now - row.purchasedAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) * 10) / 10
      : null

    const maintenance: MaintenanceRecord[] = []
    if (row.lastServiceAt) {
      maintenance.push({
        id: "m1",
        label: "Ultima revizie",
        detail: fmtDate(row.lastServiceAt),
        status: "Done",
      })
    }
    if (row.warrantyExpiresAt) {
      const expired = row.warrantyExpiresAt < new Date()
      maintenance.push({
        id: "m2",
        label: "Garanție",
        detail: `${expired ? "Expirată" : "Valabilă"} · ${fmtDate(row.warrantyExpiresAt)}`,
        status: expired ? "Overdue" : "Due Soon",
      })
    }

    const tool = {
      id: row.id,
      name: row.name,
      model: row.model ?? "—",
      category: row.category ?? "—",
      status: apiStatus,
      assignedTo: row.assignedFirstName ? `${row.assignedFirstName} ${row.assignedLastName}` : null,
      site: row.storeName ?? null,
      dueBack: null,
      location: row.storeName ?? null,
      lastUsed: row.lastServiceAt ? fmtDate(row.lastServiceAt) : null,
      utilisationPct,
      serviceOverdueDays,
      ageYears,
      usesThisMonth: usageCountRows[0]?.cnt ?? 0,
      valueEur: 0,
      lastService: row.lastServiceAt ? fmtDate(row.lastServiceAt) : "—",
      nextService: row.lastServiceAt
        ? fmtDate(new Date(row.lastServiceAt.getTime() + 180 * 24 * 60 * 60 * 1000))
        : "—",
      specs: row.serialNumber ? [{ key: "S/N", val: row.serialNumber }] : [],
      maintenance,
    }

    return NextResponse.json({ tool })
  }
)

// ─── PATCH /api/tools/[id] ────────────────────────────────────────────────────

const toolPatchSchema = z
  .object({
    status: z.enum(["available", "in_use", "maintenance", "retired", "lost"]).optional(),
    assignedUserId: z.string().uuid().nullable().optional(),
    storeId: z.string().uuid().nullable().optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: "At least one field is required",
  })

export const PATCH = withGates(
  { action: "tools.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const raw = await req.json().catch(() => ({}))
    const parsed = toolPatchSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [existing] = await db
      .select({ id: tools.id, name: tools.name, status: tools.status })
      .from(tools)
      .where(and(eq(tools.id, id), eq(tools.companyId, companyId), isNull(tools.deletedAt)))
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const { status, assignedUserId, storeId, notes } = parsed.data

    const [updated] = await db
      .update(tools)
      .set({
        ...(status !== undefined && { status }),
        ...(assignedUserId !== undefined && { assignedUserId }),
        ...(storeId !== undefined && { storeId }),
        ...(notes !== undefined && { notes }),
        updatedAt: new Date(),
      })
      .where(and(eq(tools.id, id), eq(tools.companyId, companyId)))
      .returning({ id: tools.id, status: tools.status })

    void writeAuditLog({
      companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "tools.update",
      entityType: "tool",
      entityId: id,
      payload: { name: existing.name, from: existing.status, changes: parsed.data },
      method: "PATCH",
      path: `/api/tools/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)
