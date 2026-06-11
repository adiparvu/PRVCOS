import { sql, eq, and, gte, lt, isNull, desc, count } from "drizzle-orm"
import { db } from "../client"
import { orders, orderItems, products, productCategories, productReviews } from "../schema"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ShopOrderSummary {
  totalOrders: number
  pendingOrders: number
  processingOrders: number
  shippedOrders: number
  deliveredOrders: number
  cancelledOrders: number
  totalRevenue: string
  periodKey: string
}

export interface TopProduct {
  productId: string
  productName: string
  categoryId: string | null
  totalSold: number
  totalRevenue: string
}

export interface ReviewStats {
  productId: string
  totalReviews: number
  avgRating: number
  star1: number
  star2: number
  star3: number
  star4: number
  star5: number
}

export interface LowStockProduct {
  id: string
  name: string
  sku: string | null
  stockQuantity: number
  stockMinimum: number
  categoryId: string | null
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function queryShopOrderSummary(
  companyId: string,
  month?: Date
): Promise<ShopOrderSummary> {
  const ref = month ?? new Date()
  const startOfMonth = new Date(ref.getFullYear(), ref.getMonth(), 1)
  const startOfNextMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 1)
  const periodKey = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`

  const [statusRows, revenueRow] = await Promise.all([
    db
      .select({
        status: orders.status,
        cnt: sql<number>`COUNT(*)::int`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, companyId),
          isNull(orders.deletedAt),
          gte(orders.createdAt, startOfMonth),
          lt(orders.createdAt, startOfNextMonth)
        )
      )
      .groupBy(orders.status),

    db
      .select({ total: sql<string>`COALESCE(SUM(${orders.total}), 0)::text` })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, companyId),
          isNull(orders.deletedAt),
          gte(orders.createdAt, startOfMonth),
          lt(orders.createdAt, startOfNextMonth)
        )
      ),
  ])

  const byStatus: Record<string, number> = {}
  let totalOrders = 0
  for (const row of statusRows) {
    byStatus[row.status] = row.cnt
    totalOrders += row.cnt
  }

  return {
    totalOrders,
    pendingOrders: byStatus["pending"] ?? 0,
    processingOrders: (byStatus["confirmed"] ?? 0) + (byStatus["processing"] ?? 0),
    shippedOrders: byStatus["shipped"] ?? 0,
    deliveredOrders: byStatus["delivered"] ?? 0,
    cancelledOrders: (byStatus["cancelled"] ?? 0) + (byStatus["refunded"] ?? 0),
    totalRevenue: revenueRow[0]?.total ?? "0",
    periodKey,
  }
}

export async function queryTopProducts(companyId: string, limit = 10): Promise<TopProduct[]> {
  const rows = await db
    .select({
      productId: orderItems.productId,
      productName: orderItems.name,
      categoryId: products.categoryId,
      totalSold: sql<number>`SUM(${orderItems.quantity})::int`,
      totalRevenue: sql<string>`SUM(${orderItems.total})::text`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(and(eq(orders.companyId, companyId), isNull(orders.deletedAt)))
    .groupBy(orderItems.productId, orderItems.name, products.categoryId)
    .orderBy(desc(sql`SUM(${orderItems.quantity})`))
    .limit(limit)

  return rows.map((r) => ({
    productId: r.productId ?? "",
    productName: r.productName,
    categoryId: r.categoryId ?? null,
    totalSold: r.totalSold,
    totalRevenue: r.totalRevenue,
  }))
}

export async function queryReviewStats(companyId: string, productId: string): Promise<ReviewStats> {
  const rows = await db
    .select({
      rating: productReviews.rating,
      cnt: sql<number>`COUNT(*)::int`,
    })
    .from(productReviews)
    .where(
      and(
        eq(productReviews.companyId, companyId),
        eq(productReviews.productId, productId),
        eq(productReviews.isApproved, true),
        isNull(productReviews.deletedAt)
      )
    )
    .groupBy(productReviews.rating)

  const byStar: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let total = 0
  let weightedSum = 0

  for (const row of rows) {
    byStar[row.rating] = row.cnt
    total += row.cnt
    weightedSum += row.rating * row.cnt
  }

  return {
    productId,
    totalReviews: total,
    avgRating: total > 0 ? Math.round((weightedSum / total) * 10) / 10 : 0,
    star1: byStar[1]!,
    star2: byStar[2]!,
    star3: byStar[3]!,
    star4: byStar[4]!,
    star5: byStar[5]!,
  }
}

export async function queryLowStockProducts(companyId: string): Promise<LowStockProduct[]> {
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      stockQuantity: products.stockQuantity,
      stockMinimum: products.stockMinimum,
      categoryId: products.categoryId,
    })
    .from(products)
    .where(
      and(
        eq(products.companyId, companyId),
        eq(products.isActive, true),
        isNull(products.deletedAt),
        sql`${products.stockQuantity} <= ${products.stockMinimum}`
      )
    )
    .orderBy(products.stockQuantity)

  return rows
}
