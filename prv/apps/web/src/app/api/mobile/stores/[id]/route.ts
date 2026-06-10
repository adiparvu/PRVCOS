import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { stores, orders, products, users, projects, projectMilestones } from "@prv/db/schema"
import { eq, and, sql, isNull, count, gte, desc, lte } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `€${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `€${Math.round(amount / 1_000)}k`
  return `€${Math.round(amount)}`
}

export const GET = withMobileAuth(async (req: NextRequest, ctx) => {
  const storeId = req.nextUrl.pathname.split("/").pop() ?? ""
  if (!storeId) {
    return NextResponse.json({ error: "Missing store ID" }, { status: 400 })
  }

  const [storeRow] = await db
    .select()
    .from(stores)
    .where(and(eq(stores.id, storeId), eq(stores.companyId, ctx.companyId)))
    .limit(1)

  if (!storeRow) {
    return NextResponse.json({ error: "Store not found", code: "NOT_FOUND" }, { status: 404 })
  }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Last 7 days starting from the most recent Monday (or 6 days ago)
  const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const [
    todayRevenueRow,
    todayTxRow,
    staffRows,
    inventoryAlertRows,
    taskRows,
    openTaskCountRow,
    inventoryAlertCountRow,
    weeklyRevenueRows,
  ] = await Promise.all([
    // Revenue today
    db
      .select({ revenue: sql<number>`COALESCE(SUM(${orders.total}::numeric), 0)::float` })
      .from(orders)
      .where(
        and(
          eq(orders.storeId, storeId),
          eq(orders.companyId, ctx.companyId),
          gte(orders.createdAt, todayStart),
          isNull(orders.deletedAt)
        )
      ),

    // Transactions today
    db
      .select({ count: count() })
      .from(orders)
      .where(
        and(
          eq(orders.storeId, storeId),
          eq(orders.companyId, ctx.companyId),
          gte(orders.createdAt, todayStart),
          isNull(orders.deletedAt)
        )
      ),

    // Staff assigned to store
    db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        avatarUrl: users.avatarUrl,
        jobTitle: users.jobTitle,
      })
      .from(users)
      .where(
        and(
          eq(users.storeId, storeId),
          eq(users.companyId, ctx.companyId),
          eq(users.isActive, true)
        )
      )
      .orderBy(users.firstName)
      .limit(10),

    // Inventory alerts (low stock)
    db
      .select({
        id: products.id,
        name: products.name,
        unit: products.unit,
        stockQuantity: products.stockQuantity,
        stockMinimum: products.stockMinimum,
      })
      .from(products)
      .where(
        and(
          eq(products.storeId, storeId),
          eq(products.companyId, ctx.companyId),
          eq(products.isActive, true),
          isNull(products.deletedAt),
          sql`${products.stockQuantity} <= ${products.stockMinimum}`
        )
      )
      .orderBy(sql`${products.stockQuantity}::int ASC`)
      .limit(8),

    // Open tasks (milestones) for projects linked to this store
    db
      .select({
        id: projectMilestones.id,
        title: projectMilestones.title,
        dueDate: projectMilestones.dueDate,
        isComplete: projectMilestones.isComplete,
        projectName: projects.name,
      })
      .from(projectMilestones)
      .innerJoin(projects, eq(projectMilestones.projectId, projects.id))
      .where(
        and(
          eq(projects.storeId, storeId),
          eq(projects.companyId, ctx.companyId),
          eq(projectMilestones.isComplete, false),
          isNull(projects.deletedAt)
        )
      )
      .orderBy(projectMilestones.dueDate)
      .limit(8),

    // Open task count
    db
      .select({ count: count() })
      .from(projectMilestones)
      .innerJoin(projects, eq(projectMilestones.projectId, projects.id))
      .where(
        and(
          eq(projects.storeId, storeId),
          eq(projects.companyId, ctx.companyId),
          eq(projectMilestones.isComplete, false),
          isNull(projects.deletedAt)
        )
      ),

    // Inventory alert count
    db
      .select({ count: count() })
      .from(products)
      .where(
        and(
          eq(products.storeId, storeId),
          eq(products.companyId, ctx.companyId),
          eq(products.isActive, true),
          isNull(products.deletedAt),
          sql`${products.stockQuantity} <= ${products.stockMinimum}`
        )
      ),

    // Weekly revenue — aggregate per day for last 7 days
    db
      .select({
        day: sql<string>`to_char(DATE_TRUNC('day', ${orders.createdAt}), 'YYYY-MM-DD')`,
        revenue: sql<number>`COALESCE(SUM(${orders.total}::numeric), 0)::float`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.storeId, storeId),
          eq(orders.companyId, ctx.companyId),
          gte(orders.createdAt, sevenDaysAgo),
          isNull(orders.deletedAt)
        )
      )
      .groupBy(sql`DATE_TRUNC('day', ${orders.createdAt})`)
      .orderBy(sql`DATE_TRUNC('day', ${orders.createdAt})`),
  ])

  // Build 7-day revenue array, filling gaps with 0
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const revenueByDay = new Map(weeklyRevenueRows.map((r) => [r.day, r.revenue]))
  const weeklyRevenue = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    const dayIdx = (d.getDay() + 6) % 7 // 0=Mon
    return {
      day: dayNames[dayIdx]!,
      amount: revenueByDay.get(key) ?? 0,
      isToday: key === todayStart.toISOString().slice(0, 10),
    }
  })

  const revenueToday = todayRevenueRow[0]?.revenue ?? 0
  const transactionsToday = todayTxRow[0]?.count ?? 0
  const openTasks = openTaskCountRow[0]?.count ?? 0
  const inventoryAlertCount = inventoryAlertCountRow[0]?.count ?? 0

  return NextResponse.json({
    store: {
      id: storeRow.id,
      name: storeRow.name,
      code: storeRow.code,
      address: storeRow.address ?? null,
      city: storeRow.city ?? null,
      phone: storeRow.phone ?? null,
      isActive: storeRow.isActive,
    },
    kpis: {
      revenueToday: formatCurrency(revenueToday),
      transactionsToday,
      openTasks,
      inventoryAlerts: inventoryAlertCount,
    },
    weeklyRevenue,
    staff: staffRows.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      role: u.role,
      jobTitle: u.jobTitle ?? null,
      avatarUrl: u.avatarUrl ?? null,
    })),
    inventoryAlerts: inventoryAlertRows.map((p) => ({
      id: p.id,
      name: p.name,
      unit: p.unit,
      stock: p.stockQuantity,
      minimum: p.stockMinimum,
      severity:
        p.stockQuantity === 0
          ? "critical"
          : p.stockQuantity <= Math.ceil(p.stockMinimum * 0.5)
            ? "critical"
            : "low",
    })),
    tasks: taskRows.map((m) => ({
      id: m.id,
      title: m.title,
      dueDate: m.dueDate ?? null,
      isOverdue: m.dueDate ? new Date(m.dueDate) < now : false,
      projectName: m.projectName,
    })),
  })
})

// ─── PATCH /api/mobile/stores/[id] ───────────────────────────────────────────

const storePatchSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    phone: z.string().max(32).optional(),
    email: z.string().email().max(254).optional(),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    region: z.string().max(100).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.phone !== undefined ||
      d.email !== undefined ||
      d.address !== undefined ||
      d.city !== undefined ||
      d.region !== undefined ||
      d.isActive !== undefined,
    { message: "At least one field required" }
  )

export const PATCH = withMobileAuth(async (req: NextRequest, ctx) => {
  const ipAddress =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"

  const storeId = req.nextUrl.pathname.split("/").pop() ?? ""
  if (!storeId) return NextResponse.json({ error: "Missing store ID" }, { status: 400 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = storePatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const [existing] = await db
    .select({ id: stores.id, name: stores.name })
    .from(stores)
    .where(and(eq(stores.id, storeId), eq(stores.companyId, ctx.companyId)))
    .limit(1)
  if (!existing) return NextResponse.json({ error: "Store not found" }, { status: 404 })

  const d = parsed.data
  const [updated] = await db
    .update(stores)
    .set({
      ...(d.name !== undefined && { name: d.name }),
      ...(d.phone !== undefined && { phone: d.phone }),
      ...(d.email !== undefined && { email: d.email }),
      ...(d.address !== undefined && { address: d.address }),
      ...(d.city !== undefined && { city: d.city }),
      ...(d.region !== undefined && { region: d.region }),
      ...(d.isActive !== undefined && { isActive: d.isActive }),
      updatedAt: new Date(),
    })
    .where(and(eq(stores.id, storeId), eq(stores.companyId, ctx.companyId)))
    .returning({ id: stores.id, name: stores.name, isActive: stores.isActive })

  if (!updated) return NextResponse.json({ error: "Failed to update store" }, { status: 500 })

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "operations.stores.update",
    entityType: "store",
    entityId: storeId,
    payload: { name: existing.name, changes: d },
    method: "PATCH",
    path: `/api/mobile/stores/${storeId}`,
    ipAddress,
    userAgent: req.headers.get("user-agent") ?? undefined,
  })

  return NextResponse.json(updated)
})
