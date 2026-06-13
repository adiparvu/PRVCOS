import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { invoices } from "@prv/db/schema"
import { eq, and, isNull, notInArray } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface AgingBucket {
  label: string
  days: string
  count: number
  total: number
  totalLabel: string
}

export interface AgingResponse {
  buckets: AgingBucket[]
  grandTotal: number
  grandTotalLabel: string
  overdueCount: number
}

function fmtCurrency(n: number, currency = "RON"): string {
  const s = Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return currency === "EUR" ? `€${s}` : `${s} ${currency}`
}

export const GET = withGates(
  { action: "finance.invoices.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select({
        id: invoices.id,
        dueDate: invoices.dueDate,
        total: invoices.total,
        currency: invoices.currency,
        status: invoices.status,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, ctx.session.companyId),
          isNull(invoices.deletedAt),
          notInArray(invoices.status, ["paid", "cancelled", "refunded"])
        )
      )

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const buckets: AgingBucket[] = [
      { label: "0–30 days", days: "0-30", count: 0, total: 0, totalLabel: "" },
      { label: "31–60 days", days: "31-60", count: 0, total: 0, totalLabel: "" },
      { label: "61–90 days", days: "61-90", count: 0, total: 0, totalLabel: "" },
      { label: "90+ days", days: "90+", count: 0, total: 0, totalLabel: "" },
    ]

    let grandTotal = 0
    let overdueCount = 0

    for (const row of rows) {
      const amount = Number(row.total)
      const due = new Date(row.dueDate)
      due.setHours(0, 0, 0, 0)
      const diffMs = today.getTime() - due.getTime()
      const daysOverdue = Math.floor(diffMs / 86400000) // positive = overdue

      grandTotal += amount

      let bucket: AgingBucket
      if (daysOverdue > 90) {
        bucket = buckets[3]!
        overdueCount++
      } else if (daysOverdue > 60) {
        bucket = buckets[2]!
        overdueCount++
      } else if (daysOverdue > 30) {
        bucket = buckets[1]!
        overdueCount++
      } else {
        bucket = buckets[0]!
        if (daysOverdue > 0) overdueCount++
      }

      bucket.count++
      bucket.total += amount
    }

    for (const b of buckets) {
      b.totalLabel = fmtCurrency(b.total)
    }

    return NextResponse.json({
      buckets,
      grandTotal,
      grandTotalLabel: fmtCurrency(grandTotal),
      overdueCount,
    } satisfies AgingResponse)
  }
)
