"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import type { FinanceMeta } from "@/app/api/finance/expenses/route"
import type { InvoiceSummary } from "@/app/api/finance/invoices/route"
import {
  GlassStatCard,
  GlassAlertBanner,
  GlassBarChart,
  GlassSegmentedControl,
  GlassTable,
  GlassTabs,
  type TableColumn,
  type TabItem,
  type SegmentItem,
} from "@prv/ui"

// ── Types ─────────────────────────────────────────────────────────────────────

interface TxRow {
  id: string
  description: string
  category: string
  store: string
  date: string
  amount: string
  kind: "credit" | "debit"
  [key: string]: unknown
}

interface InvoiceRow {
  id: string
  ref: string
  client: string
  amount: string
  due: string
  status: "paid" | "due" | "overdue" | "partial" | "void" | "draft"
  [key: string]: unknown
}

// ── Static data ───────────────────────────────────────────────────────────────

const PERIODS: SegmentItem[] = [
  { id: "1w", label: "1W" },
  { id: "1m", label: "1M" },
  { id: "3m", label: "3M" },
  { id: "6m", label: "6M" },
  { id: "1y", label: "1Y" },
]

const CHART_DATA: Record<string, { labels: string[]; revenue: number[]; expenses: number[] }> = {
  "1w": {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    revenue: [14, 18, 16, 21, 19, 24, 22],
    expenses: [10, 12, 11, 14, 13, 15, 14],
  },
  "1m": {
    labels: ["W1", "W2", "W3", "W4"],
    revenue: [88, 102, 96, 118],
    expenses: [64, 72, 70, 82],
  },
  "3m": {
    labels: ["Apr", "May", "Jun"],
    revenue: [340, 412, 482],
    expenses: [248, 296, 344],
  },
  "6m": {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    revenue: [320, 348, 360, 402, 438, 482],
    expenses: [234, 252, 258, 288, 316, 344],
  },
  "1y": {
    labels: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    revenue: [290, 305, 318, 330, 298, 310, 320, 348, 360, 402, 438, 482],
    expenses: [210, 218, 226, 238, 214, 222, 234, 252, 258, 288, 316, 344],
  },
}

const SPARK = {
  revenue: [320, 348, 360, 402, 438, 482],
  profit: [86, 96, 102, 114, 122, 138],
  expenses: [234, 252, 258, 288, 316, 344],
  cashflow: [78, 84, 88, 90, 92, 94],
}

const TRANSACTIONS: TxRow[] = [
  {
    id: "1",
    description: "Invoice #1042 — Mihai Popescu",
    category: "Invoice",
    store: "Cluj",
    date: "2 min ago",
    amount: "+€298",
    kind: "credit",
  },
  {
    id: "2",
    description: "Supplier — Romstal SRL",
    category: "Procurement",
    store: "Centru",
    date: "1 hr ago",
    amount: "−€1,840",
    kind: "debit",
  },
  {
    id: "3",
    description: "Payroll run — June W1",
    category: "Payroll",
    store: "All",
    date: "3 hr ago",
    amount: "−€28,400",
    kind: "debit",
  },
  {
    id: "4",
    description: "Invoice #1041 — Renovare Cluj",
    category: "Invoice",
    store: "Projects",
    date: "Yesterday",
    amount: "+€5,200",
    kind: "credit",
  },
  {
    id: "5",
    description: "Rent — Floreasca Office",
    category: "Fixed Cost",
    store: "București",
    date: "Yesterday",
    amount: "−€3,600",
    kind: "debit",
  },
  {
    id: "6",
    description: "Invoice #1040 — Ana Ionescu",
    category: "Invoice",
    store: "Timișoara",
    date: "2 days ago",
    amount: "+€760",
    kind: "credit",
  },
]

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  paid: { bg: "rgba(48,209,88,0.14)", color: "rgba(48,209,88,0.95)", label: "Plătit" },
  due: { bg: "rgba(255,159,10,0.14)", color: "rgba(255,159,10,0.95)", label: "Scadent" },
  overdue: { bg: "rgba(255,69,58,0.14)", color: "rgba(255,69,58,0.95)", label: "Restanță" },
  partial: { bg: "rgba(10,132,255,0.14)", color: "rgba(10,132,255,0.95)", label: "Parțial" },
  void: { bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)", label: "Anulat" },
  draft: { bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)", label: "Ciornă" },
}

const TX_COLUMNS: TableColumn<TxRow>[] = [
  { key: "description", label: "Transaction", sortable: false },
  { key: "category", label: "Category", sortable: true },
  { key: "date", label: "Date", sortable: false },
  {
    key: "amount",
    label: "Amount",
    align: "right",
    sortable: true,
    render: (row) => (
      <span
        style={{
          color: row.kind === "credit" ? "rgba(48,209,88,0.95)" : "var(--prv-text-1)",
          fontWeight: 700,
        }}
      >
        {row.amount}
      </span>
    ),
  },
]

const INV_COLUMNS: TableColumn<InvoiceRow>[] = [
  { key: "ref", label: "Ref", sortable: true },
  { key: "client", label: "Client", sortable: true },
  { key: "due", label: "Due", sortable: false },
  { key: "amount", label: "Amount", align: "right", sortable: true },
  {
    key: "status",
    label: "Status",
    align: "center",
    render: (row) => {
      const s = STATUS_STYLE[row.status] ?? STATUS_STYLE.draft!
      return (
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px]"
          style={{ background: s.bg, color: s.color }}
        >
          {s.label}
        </span>
      )
    },
  },
]

const MAIN_TABS: TabItem[] = [
  { value: "overview", label: "Overview" },
  { value: "transactions", label: "Transactions" },
  { value: "invoices", label: "Invoices" },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function trendDir(s: string | undefined): "up" | "down" | "flat" {
  if (!s) return "flat"
  if (s.startsWith("+")) return "up"
  if (s.startsWith("-")) return "down"
  return "flat"
}

function fmtDue(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString("ro-RO", { month: "short", day: "numeric" })
  } catch {
    return dateStr
  }
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mx-1 mt-6 mb-2.5">
      {children}
    </p>
  )
}

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-[18px] relative overflow-hidden ${className}`}
      style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
    >
      {children}
    </div>
  )
}

function PnLItem({
  label,
  value,
  trend,
  trendColor,
}: {
  label: string
  value: string
  trend: string
  trendColor: string
}) {
  return (
    <div className="flex-1 px-4 py-3" style={{ borderRight: "1px solid var(--prv-border-subtle)" }}>
      <p className="text-[10px] font-semibold text-white/35 uppercase tracking-[.07em] mb-1">
        {label}
      </p>
      <p className="text-[16px] font-bold text-white/95 tracking-tight">{value}</p>
      <p className="text-[11px] font-semibold mt-0.5" style={{ color: trendColor }}>
        {trend}
      </p>
    </div>
  )
}

function fmt(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `€${Math.round(n / 1_000)}K`
  return `€${n}`
}

const QA = [
  {
    label: "New Invoice",
    href: "/finance/invoices/new",
    path: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M12 18v-6M9 15h6",
  },
  {
    label: "Add Expense",
    href: "/finance/expenses/new",
    path: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM12 8v8M8 12h8",
  },
  {
    label: "Reports",
    href: "/finance/expenses",
    path: "M3 3v18h18M18 9l-6 6-3-3-6 6",
  },
  {
    label: "Payroll",
    href: "/finance",
    path: "M1 4h22v16H1ZM1 10h22",
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function FinanceWorkspace() {
  const [period, setPeriod] = useState("3m")
  const [activeTab, setActiveTab] = useState("overview")
  const [meta, setMeta] = useState<FinanceMeta | null>(null)
  const [liveInvoices, setLiveInvoices] = useState<InvoiceSummary[]>([])

  useEffect(() => {
    Promise.all([
      fetch("/api/finance/expenses").then((r) => r.json()),
      fetch("/api/finance/invoices").then((r) => r.json()),
    ])
      .then(([expJson, invJson]) => {
        setMeta((expJson as { meta: FinanceMeta }).meta ?? null)
        setLiveInvoices((invJson as { invoices: InvoiceSummary[] }).invoices ?? [])
      })
      .catch(() => {})
  }, [])

  const chart = CHART_DATA[period]!

  const overdueInvoices = liveInvoices.filter((inv) => inv.status === "overdue")
  const overdueCount = overdueInvoices.length
  const overdueTotal = overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0)
  const overdueTotalLabel =
    overdueTotal >= 1000
      ? `€${Math.round(overdueTotal / 1000)}k`
      : `€${Math.round(overdueTotal).toLocaleString()}`

  const displayInvoices: InvoiceRow[] = liveInvoices.slice(0, 5).map((inv) => ({
    id: inv.id,
    ref: inv.ref,
    client: inv.clientName,
    amount: `€${inv.amount.toLocaleString()}`,
    due: fmtDue(inv.dueDate),
    status: inv.status,
  }))

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-white/35 text-[13px] font-medium mb-0.5">PRV</p>
          <h1 className="text-white/90 text-[26px] font-semibold tracking-tight leading-tight">
            Finance
          </h1>
        </div>
        <div
          className="px-3 py-1.5 rounded-[10px] text-[12px] font-medium text-white/60"
          style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
        >
          June 2026
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 mb-3.5">
        <GlassStatCard
          label="Revenue"
          value={meta?.totalRevenueLabel ?? "—"}
          trend={{ direction: trendDir(meta?.revenueTrend), value: meta?.revenueTrend ?? "—" }}
          sparkline={SPARK.revenue}
        />
        <GlassStatCard
          label="Profit"
          value={meta?.profitLabel ?? "—"}
          trend={{ direction: trendDir(meta?.profitTrend), value: meta?.profitTrend ?? "—" }}
          sparkline={SPARK.profit}
        />
        <GlassStatCard
          label="Expenses"
          value={meta?.totalExpensesLabel ?? "—"}
          trend={{ direction: trendDir(meta?.expensesTrend), value: meta?.expensesTrend ?? "—" }}
          sparkline={SPARK.expenses}
        />
        <GlassStatCard
          label="Cash Flow"
          value="€94K"
          trend={{ direction: "flat", value: "stable" }}
          sparkline={SPARK.cashflow}
        />
      </div>

      {/* Overdue alert — only rendered when there are overdue invoices */}
      {overdueCount > 0 && (
        <div className="mb-4">
          <Link
            href="/finance/invoices?filter=overdue"
            style={{ textDecoration: "none", display: "block" }}
          >
            <GlassAlertBanner
              type="error"
              title={`${overdueCount} ${overdueCount === 1 ? "factură restantă" : "facturi restante"}`}
              description={`Total restant: ${overdueTotalLabel} · Necesită acțiune`}
            />
          </Link>
        </div>
      )}

      {/* Main tabs */}
      <GlassTabs tabs={MAIN_TABS} value={activeTab} onChange={setActiveTab} className="mb-4" />

      {/* ── Overview tab ── */}
      {activeTab === "overview" && (
        <>
          {/* Period selector */}
          <GlassSegmentedControl
            items={PERIODS}
            activeId={period}
            onChange={setPeriod}
            fullWidth
            className="mb-4"
          />

          {/* Bar chart */}
          <GlassCard className="mb-3.5 p-4">
            <GlassBarChart
              series={[
                { label: "Revenue", data: chart.revenue },
                { label: "Expenses", data: chart.expenses },
              ]}
              labels={chart.labels}
              height={180}
              legend
              animated
            />
          </GlassCard>

          {/* P&L row */}
          <GlassCard className="mb-3.5">
            <div className="flex" style={{ borderBottom: "none" }}>
              <PnLItem
                label="Gross Margin"
                value={meta ? `${meta.grossMarginPct.toFixed(1)}%` : "—"}
                trend="—"
                trendColor="var(--prv-text-2)"
              />
              <PnLItem
                label="Net Profit"
                value={meta?.profitLabel ?? "—"}
                trend={meta?.profitTrend ?? "—"}
                trendColor={
                  meta?.profitTrend?.startsWith("+")
                    ? "rgba(48,209,88,0.95)"
                    : "rgba(255,69,58,0.9)"
                }
              />
              <div className="flex-1 px-4 py-3">
                <p className="text-[10px] font-semibold text-white/35 uppercase tracking-[.07em] mb-1">
                  Tax (16%)
                </p>
                <p className="text-[16px] font-bold text-white/95 tracking-tight">
                  {meta ? fmt(Math.round(meta.netProfitRaw * 0.16)) : "—"}
                </p>
                <p className="text-[11px] font-semibold mt-0.5 text-white/35">→ provision</p>
              </div>
            </div>
          </GlassCard>

          {/* Quick actions */}
          <div className="grid grid-cols-4 gap-2.5 mb-3.5">
            {QA.map(({ label, path, href }) => (
              <Link
                key={label}
                href={href}
                className="flex flex-col items-center gap-1.5 py-4 rounded-[14px]"
                style={{
                  background: "var(--prv-g1)",
                  border: "1px solid var(--prv-border-subtle)",
                  textDecoration: "none",
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white/45"
                >
                  <path d={path} />
                </svg>
                <span className="text-[11px] font-medium text-white/40 text-center leading-tight px-1">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* ── Transactions tab ── */}
      {activeTab === "transactions" && (
        <>
          <Label>Recent Transactions</Label>
          <GlassCard>
            <GlassTable<TxRow> columns={TX_COLUMNS} data={TRANSACTIONS} keyField="id" />
          </GlassCard>
        </>
      )}

      {/* ── Invoices tab ── */}
      {activeTab === "invoices" && (
        <>
          <div className="flex items-center justify-between mx-1 mt-6 mb-2.5">
            <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest">
              Facturi recente
            </p>
            <Link
              href="/finance/invoices"
              className="text-[11px] font-medium text-white/40 flex items-center gap-1"
              style={{ textDecoration: "none" }}
            >
              Vezi toate
              <svg
                width="5"
                height="9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {displayInvoices.length === 0 ? (
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.30)",
                  textAlign: "center",
                  padding: "16px 0",
                }}
              >
                Nicio factură
              </p>
            ) : (
              displayInvoices.map((inv) => {
                const s = STATUS_STYLE[inv.status] ?? STATUS_STYLE.draft!
                const isOverdue = inv.status === "overdue"
                const isDue = inv.status === "due"
                return (
                  <Link
                    key={inv.id}
                    href={`/finance/invoices/${inv.id}`}
                    style={{
                      display: "block",
                      background: "var(--prv-g1)",
                      border: "1px solid var(--prv-border-subtle)",
                      borderRadius: 16,
                      padding: "12px 14px",
                      position: "relative",
                      overflow: "hidden",
                      textDecoration: "none",
                    }}
                  >
                    {(isOverdue || isDue) && (
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: 3,
                          background: isOverdue
                            ? "linear-gradient(180deg,#ff4444,#ff6b6b)"
                            : "linear-gradient(180deg,#ffaa00,#ffcc44)",
                          borderRadius: "16px 0 0 16px",
                        }}
                      />
                    )}
                    <div
                      style={{
                        paddingLeft: isOverdue || isDue ? 4 : 0,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "rgba(255,255,255,0.40)",
                            letterSpacing: "0.03em",
                          }}
                        >
                          {inv.ref}
                        </p>
                        <p
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "rgba(255,255,255,0.92)",
                            marginTop: 2,
                          }}
                        >
                          {inv.client}
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: isOverdue ? "#ff6b6b" : "rgba(255,255,255,0.92)",
                            letterSpacing: "-0.3px",
                          }}
                        >
                          {inv.amount}
                        </p>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            padding: "2px 7px",
                            borderRadius: 100,
                            background: s.bg,
                            color: s.color,
                            marginTop: 4,
                            display: "inline-block",
                          }}
                        >
                          {s.label}
                        </span>
                      </div>
                    </div>
                    <p
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.30)",
                        marginTop: 6,
                        paddingLeft: isOverdue || isDue ? 4 : 0,
                      }}
                    >
                      Scad. {inv.due}
                    </p>
                  </Link>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}
