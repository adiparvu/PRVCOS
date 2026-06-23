import { NextRequest, NextResponse } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { suppliers } from "@prv/db/schema"
import { and, asc, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type SupplierStatus = "Active" | "Inactive" | "Pending"

type MetaBag = {
  trustScore?: number
  qualityScore?: number
  deliveryScore?: number
  priceScore?: number
  communicationScore?: number
}

function dbStatusToMobile(dbStatus: string, trustScore: number | undefined): SupplierStatus {
  if (dbStatus === "pending") return "Pending"
  if (dbStatus === "inactive" || dbStatus === "blacklisted") return "Inactive"
  return "Active"
}

export const GET = withMobileAuth(async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url)
  const statusFilter = searchParams.get("status") as SupplierStatus | null

  const rows = await db
    .select({
      id: suppliers.id,
      name: suppliers.name,
      category: suppliers.category,
      city: suppliers.city,
      country: suppliers.country,
      status: suppliers.status,
      metadata: suppliers.metadata,
    })
    .from(suppliers)
    .where(and(eq(suppliers.companyId, ctx.companyId), isNull(suppliers.deletedAt)))
    .orderBy(asc(suppliers.name))
    .limit(50)

  const all = rows.map((r) => {
    const meta = (r.metadata ?? {}) as MetaBag
    const status = dbStatusToMobile(r.status, meta.trustScore)
    const hasScorecard =
      meta.qualityScore !== undefined ||
      meta.deliveryScore !== undefined ||
      meta.priceScore !== undefined ||
      meta.communicationScore !== undefined

    return {
      id: r.id,
      name: r.name,
      category: r.category ?? "General",
      city: r.city ?? null,
      country: r.country ?? null,
      status,
      score: meta.trustScore ?? null,
      scorecard: hasScorecard
        ? {
            quality: meta.qualityScore ?? 0,
            delivery: meta.deliveryScore ?? 0,
            price: meta.priceScore ?? 0,
            communication: meta.communicationScore ?? 0,
          }
        : null,
    }
  })

  const filtered = statusFilter ? all.filter((s) => s.status === statusFilter) : all

  const meta = {
    total: all.length,
    active: all.filter((s) => s.status === "Active").length,
    pendingReview: all.filter((s) => s.status === "Pending").length,
  }

  return NextResponse.json({ meta, suppliers: filtered })
})
