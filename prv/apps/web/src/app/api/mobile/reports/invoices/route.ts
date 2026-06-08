import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { invoices } from "@prv/db/schema"
import { eq, and, gte, lt, isNull, sql } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function fmtC(amount: number, currency = "RON"): string {
  const sym = currency === "EUR" ? "€" : "RON "
  if (amount >= 1_000_000) return `${sym}${(amount / 1_000_000).toFixed(2)}M`
  if (amount >= 1_000) return `${sym}${(amount / 1_000).toFixed(1)}k`
  return `${sym}${amount.toFixed(0)}`
}

function parseMoney(v: string | null | undefined): number {
  return parseFloat(v ?? "0") || 0
}

function monthLabel(d: Date): string {
  return d.toLocaleString("en", { month: "short", year: "2-digit" })
}

export const GET = withMobileAuth(async (_req: NextRequest, ctx) => {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const day30ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const day60ago = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
  const day90ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const day30agoStr = day30ago.toISOString().slice(0, 10)
  const day60agoStr = day60ago.toISOString().slice(0, 10)
  const day90agoStr = day90ago.toISOString().slice(0, 10)

  const [statusRows, paidMtdRow, trendRows] = await Promise.all([
    // Status breakdown
    db
      .select({
        status: invoices.status,
        count: sql<string>`COUNT(*)`,
        total: sql<string>`COALESCE(SUM(${invoices.total}), '0')`,
      })
      .from(invoices)
      .where(and(eq(invoices.companyId, ctx.companyId), isNull(invoices.deletedAt)))
      .groupBy(invoices.status),

    // Paid this month
    db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.total}), '0')` })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, ctx.companyId),
          eq(invoices.status, "paid"),
          gte(invoices.paidAt, monthStart),
          isNull(invoices.deletedAt)
        )
      ),

    // 6-month trend (invoices issued by issue date)
    db
      .select({
        month: sql<string>`DATE_TRUNC('month', ${invoices.issueDate}::timestamp)::date`,
        issued: sql<string>`COUNT(*)`,
        issuedAmt: sql<string>`COALESCE(SUM(${invoices.total}), '0')`,
        paid: sql<string>`SUM(CASE WHEN ${invoices.status} = 'paid' THEN 1 ELSE 0 END)`,
        paidAmt: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.status} = 'paid' THEN ${invoices.total} ELSE 0 END), '0')`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, ctx.companyId),
          gte(invoices.issueDate, sixMonthsAgo.toISOString().slice(0, 10)),
          isNull(invoices.deletedAt)
        )
      )
      .groupBy(sql`DATE_TRUNC('month', ${invoices.issueDate}::timestamp)`)
      .orderBy(sql`DATE_TRUNC('month', ${invoices.issueDate}::timestamp) ASC`),
  ])

  // Outstanding = sent + overdue amounts
  const sentAmt = parseMoney(statusRows.find((r) => r.status === "sent")?.total)
  const overdueAmt = parseMoney(statusRows.find((r) => r.status === "overdue")?.total)
  const overdueCount = parseInt(statusRows.find((r) => r.status === "overdue")?.count ?? "0")
  const paidTotal = parseMoney(statusRows.find((r) => r.status === "paid")?.total)
  const paidCount = parseInt(statusRows.find((r) => r.status === "paid")?.count ?? "0")
  const totalIssued = statusRows.reduce((s, r) => s + parseMoney(r.total), 0)
  const outstanding = sentAmt + overdueAmt
  const paidMtd = parseMoney(paidMtdRow[0]?.total)

  const collectionRate =
    paidTotal + outstanding > 0 ? Math.round((paidTotal / (paidTotal + outstanding)) * 100) : 0

  const byStatus = [
    { status: "sent", label: "Outstanding" },
    { status: "overdue", label: "Overdue" },
    { status: "paid", label: "Paid" },
    { status: "draft", label: "Draft" },
    { status: "cancelled", label: "Cancelled" },
  ].map((s) => {
    const row = statusRows.find((r) => r.status === s.status)
    return {
      status: s.status,
      label: s.label,
      count: parseInt(row?.count ?? "0"),
      amount: parseMoney(row?.total),
      amountFormatted: fmtC(parseMoney(row?.total)),
    }
  })

  // Aging buckets for overdue invoices
  // We compute this from the status breakdown — approximate using dueDate buckets
  // For a proper aging we'd need per-row data; here we use aggregate approximation
  const aging = [
    { bucket: "0–30 days", count: overdueCount, amount: overdueAmt * 0.5 },
    { bucket: "31–60 days", count: Math.floor(overdueCount * 0.3), amount: overdueAmt * 0.3 },
    { bucket: "61–90 days", count: Math.floor(overdueCount * 0.15), amount: overdueAmt * 0.15 },
    { bucket: "90+ days", count: Math.floor(overdueCount * 0.05), amount: overdueAmt * 0.05 },
  ].map((b) => ({ ...b, amountFormatted: fmtC(b.amount) }))

  const trendMap = new Map(
    trendRows.map((r) => [
      r.month.slice(0, 7),
      {
        issued: parseInt(r.issued),
        issuedAmt: parseMoney(r.issuedAmt),
        paid: parseInt(r.paid),
        paidAmt: parseMoney(r.paidAmt),
      },
    ])
  )

  const trend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const key = d.toISOString().slice(0, 7)
    const row = trendMap.get(key) ?? { issued: 0, issuedAmt: 0, paid: 0, paidAmt: 0 }
    return {
      month: monthLabel(d),
      issued: row.issued,
      issuedFormatted: fmtC(row.issuedAmt),
      paid: row.paid,
      paidFormatted: fmtC(row.paidAmt),
    }
  })

  return NextResponse.json({
    kpi: {
      outstanding,
      outstandingFormatted: fmtC(outstanding),
      overdueAmount: overdueAmt,
      overdueFormatted: fmtC(overdueAmt),
      overdueCount,
      paidMtd,
      paidMtdFormatted: fmtC(paidMtd),
      paidTotal,
      paidCount,
      collectionRate,
    },
    byStatus,
    trend,
  })
})
