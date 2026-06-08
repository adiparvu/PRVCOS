import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { stores, orders, products, users } from "@prv/db/schema"
import { eq, and, gte, isNull, count, sum, sql } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withMobileAuth(async (_req: NextRequest, ctx) => {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const storeRows = await db
    .select({
      id: stores.id,
      name: stores.name,
      code: stores.code,
      city: stores.city,
      address: stores.address,
      isActive: stores.isActive,
    })
    .from(stores)
    .where(and(eq(stores.companyId, ctx.companyId), eq(stores.isActive, true)))
    .orderBy(stores.name)

  // Per-store today revenue + staff count in parallel
  const enriched = await Promise.all(
    storeRows.map(async (store) => {
      const [revenueRow, staffRow, lowStockRow] = await Promise.all([
        db
          .select({ total: sum(orders.total) })
          .from(orders)
          .where(
            and(
              eq(orders.storeId, store.id),
              eq(orders.companyId, ctx.companyId),
              gte(orders.createdAt, todayStart),
              isNull(orders.deletedAt)
            )
          ),
        db
          .select({ cnt: count() })
          .from(users)
          .where(and(eq(users.storeId, store.id), eq(users.companyId, ctx.companyId))),
        db
          .select({ cnt: count() })
          .from(products)
          .where(
            and(
              eq(products.storeId, store.id),
              eq(products.companyId, ctx.companyId),
              eq(products.isActive, true),
              sql`${products.stockQuantity} <= ${products.stockMinimum}`,
              isNull(products.deletedAt)
            )
          ),
      ])

      const rev = Number(revenueRow[0]?.total ?? 0)
      const revenueLabel =
        rev >= 1_000_000
          ? `€${(rev / 1_000_000).toFixed(1)}M`
          : rev >= 1_000
            ? `€${Math.round(rev / 1_000)}k`
            : `€${Math.round(rev)}`

      return {
        id: store.id,
        name: store.name,
        code: store.code,
        city: store.city ?? null,
        address: store.address ?? null,
        isActive: store.isActive,
        revenueToday: revenueLabel,
        staffCount: staffRow[0]?.cnt ?? 0,
        lowStockAlerts: lowStockRow[0]?.cnt ?? 0,
      }
    })
  )

  return NextResponse.json({ stores: enriched })
})
