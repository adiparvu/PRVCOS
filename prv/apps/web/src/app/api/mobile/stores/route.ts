import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { stores, orders, products, users } from "@prv/db/schema"
import { eq, and, sql, isNull, count, gte } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withMobileAuth(async (_req: NextRequest, ctx) => {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [storeRows, revenueRows, staffRows, alertRows] = await Promise.all([
    db
      .select({
        id: stores.id,
        name: stores.name,
        code: stores.code,
        city: stores.city,
        region: stores.region,
        isActive: stores.isActive,
      })
      .from(stores)
      .where(and(eq(stores.companyId, ctx.companyId), eq(stores.isActive, true)))
      .orderBy(stores.name),

    db
      .select({
        storeId: orders.storeId,
        revenue: sql<number>`COALESCE(SUM(${orders.total}::numeric), 0)::float`,
        txCount: count(),
      })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, ctx.companyId),
          gte(orders.createdAt, todayStart),
          isNull(orders.deletedAt)
        )
      )
      .groupBy(orders.storeId),

    db
      .select({ storeId: users.storeId, count: count() })
      .from(users)
      .where(and(eq(users.companyId, ctx.companyId), eq(users.isActive, true)))
      .groupBy(users.storeId),

    db
      .select({ storeId: products.storeId, count: count() })
      .from(products)
      .where(
        and(
          eq(products.companyId, ctx.companyId),
          eq(products.isActive, true),
          isNull(products.deletedAt),
          sql`${products.stockQuantity} <= ${products.stockMinimum}`
        )
      )
      .groupBy(products.storeId),
  ])

  const revenueMap = new Map(revenueRows.map((r) => [r.storeId, r]))
  const staffMap = new Map(staffRows.map((r) => [r.storeId, r.count]))
  const alertMap = new Map(alertRows.map((r) => [r.storeId, r.count]))

  return NextResponse.json({
    stores: storeRows.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      city: s.city ?? null,
      region: s.region ?? null,
      isActive: s.isActive,
      revenueToday: revenueMap.get(s.id)?.revenue ?? 0,
      transactionsToday: revenueMap.get(s.id)?.txCount ?? 0,
      staffCount: staffMap.get(s.id) ?? 0,
      inventoryAlerts: alertMap.get(s.id) ?? 0,
    })),
  })
})
