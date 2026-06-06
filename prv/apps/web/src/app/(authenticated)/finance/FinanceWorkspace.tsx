"use client"

import { useState } from "react"
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
}

interface InvoiceRow {
  id: string
  ref: string
  client: string
  amount: string
  due: string
  status: "paid" | "due" | "overdue"
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
    revenue:  [14, 18, 16, 21, 19, 24, 22],
    expenses: [10, 12, 11, 14, 13, 15, 14],
  },
  "1m": {
    labels: ["W1", "W2", "W3", "W4"],
    revenue:  [88, 102, 96, 118],
    expenses: [64, 72, 70, 82],
  },
  "3m": {
    labels: ["Apr", "May", "Jun"],
    revenue:  [340, 412, 482],
    expenses: [248, 296, 344],
  },
  "6m": {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    revenue:  [320, 348, 360, 402, 438, 482],
    expenses: [234, 252, 258, 288, 316, 344],
  },
  "1y": {
    labels: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    revenue:  [290, 305, 318, 330, 298, 310, 320, 348, 360, 402, 438, 482],
    expenses: [210, 218, 226, 238, 214, 222, 234, 252, 258, 288, 316, 344],
  },
}

const SPARK = {
  revenue:  [320, 348, 360, 402, 438, 482],
  profit:   [86, 96, 102, 114, 122, 138],
  expenses: [234, 252, 258, 288, 316, 344],
  cashflow: [78, 84, 88, 90, 92, 94],
}

const TRANSACTIONS: TxRow[] = [
  { id: "1", description: "Invoice #1042 — Mihai Popescu", category: "Invoice",    store: "Cluj",       date: "2 min ago",   amount: "+€298",    kind: "credit" },
  { id: "2", description: "Supplier — Romstal SRL",        category: "Procurement",store: "Centru",    date: "1 hr ago",    amount: "−€1,840",  kind: "debit"  },
  { id: "3", description: "Payroll run — June W1",          category: "Payroll",    store: "All",        date: "3 hr ago",    amount: "−€28,400", kind: "debit"  },
  { id: "4", description: "Invoice #1041 — Renovare Cluj", category: "Invoice",    store: "Projects",   date: "Yesterday",   amount: "+€5,200",  kind: "credit" },
  { id: "5", description: "Rent — Floreasca Office",        category: "Fixed Cost", store: "București",  date: "Yesterday",   amount: "−€3,600",  kind: "debit"  },
  { id: "6", description: "Invoice #1040 — Ana Ionescu",   category: "Invoice",    store: "Timișoara",  date: "2 days ago",  amount: "+€760",    kind: "credit" },
]

const INVOICES: InvoiceRow[] = [
  { id: "1", ref: "#INV-208", client: "Andronic Group SRL", amount: "€2,100", due: "May 28",  status: "overdue" },
  { id: "2", ref: "#INV-207", client: "Biroul Construct",   amount: "€1,140", due: "May 31",  status: "overdue" },
  { id: "3", ref: "#INV-206", client: "Mihai Popescu",      amount: "€540",   due: "Jun 10",  status: "due"     },
  { id: "4", ref: "#INV-205", client: "Radu Construct SRL", amount: "€3,800", due: "Jun 5",   status: "paid"    },
  { id: "5", ref: "#INV-204", client: "Ana Ionescu",        amount: "€760",   due: "Jun 1",   status: "paid"    },
]

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  paid:    { bg: "rgba(48,209,88,0.14)",  color: "rgba(48,209,88,0.95)",  label: "Paid"    },
  due:     { bg: "rgba(255,159,10,0.14)", color: "rgba(255,159,10,0.95)", label: "Due"     },
  overdue: { bg: "rgba(255,69,58,0.14)",  color: "rgba(255,69,58,0.95)",  label: "Overdue" },
}

const TX_COLUMNS: TableColumn<TxRow>[] = [
  { key: "description", label: "Transaction", sortable: false },
  { key: "category",    label: "Category",    sortable: true  },
  { key: "date",        label: "Date",        sortable: false },
  {
    key: "amount",
    label: "Amount",
    align: "right",
    sortable: true,
    render: (row) => (
      <span style={{ color: row.kind === "credit" ? "rgba(48,209,88,0.95)" : "rgba(255,255,255,0.95)", fontWeight: 700 }}>
        {row.amount}
      </span>
    ),
  },
]

const INV_COLUMNS: TableColumn<InvoiceRow>[] = [
  { key: "ref",    label: "Ref",     sortable: true  },
  { key: "client", label: "Client",  sortable: true  },
  { key: "due",    label: "Due",     sortable: false },
  { key: "amount", label: "Amount",  align: "right", sortable: true },
  {
    key: "status",
    label: "Status",
    align: "center",
    render: (row) => {
      const s = STATUS_STYLE[row.status]
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
  { id: "overview",     label: "Overview"     },
  { id: "transactions", label: "Transactions" },
  { id: "invoices",     label: "Invoices"     },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mx-1 mt-6 mb-2.5">
      {children}
    </p>
  )
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[18px] relative overflow-hidden ${className}`}
      style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
    >
      {children}
    </div>
  )
}

function PnLItem({ label, value, trend, trendColor }: { label: string; value: string; trend: string; trendColor: string }) {
  return (
    <div
      className="flex-1 px-4 py-3"
      style={{ borderRight: "1px solid var(--prv-border-subtle)" }}
    >
      <p className="text-[10px] font-semibold text-white/35 uppercase tracking-[.07em] mb-1">{label}</p>
      <p className="text-[16px] font-bold text-white/95 tracking-tight">{value}</p>
      <p className="text-[11px] font-semibold mt-0.5" style={{ color: trendColor }}>{trend}</p>
    </div>
  )
}

const QA = [
  { label: "New Invoice",  path: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M12 18v-6M9 15h6" },
  { label: "Add Expense",  path: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM12 8v8M8 12h8" },
  { label: "Reports",      path: "M3 3v18h18M18 9l-6 6-3-3-6 6" },
  { label: "Payroll",      path: "M1 4h22v16H1ZM1 10h22" },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function FinanceWorkspace() {
  const [period, setPeriod]     = useState("3m")
  const [activeTab, setActiveTab] = useState("overview")

  const chart = CHART_DATA[period]

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-white/35 text-[13px] font-medium mb-0.5">PRV</p>
          <h1 className="text-white/90 text-[26px] font-semibold tracking-tight leading-tight">Finance</h1>
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
        <GlassStatCard label="Revenue"  value="€482K" trend={{ direction: "up",   value: "12.4%" }} sparkline={SPARK.revenue}  />
        <GlassStatCard label="Profit"   value="€138K" trend={{ direction: "up",   value: "8.1%"  }} sparkline={SPARK.profit}   />
        <GlassStatCard label="Expenses" value="€344K" trend={{ direction: "down", value: "4.2%"  }} sparkline={SPARK.expenses} />
        <GlassStatCard label="Cash Flow" value="€94K" trend={{ direction: "flat", value: "stable" }} sparkline={SPARK.cashflow} />
      </div>

      {/* Overdue alert */}
      <div className="mb-4">
        <GlassAlertBanner
          type="error"
          title="2 invoices overdue"
          description="Total outstanding: €3,240 · Action required"
        />
      </div>

      {/* Main tabs */}
      <GlassTabs tabs={MAIN_TABS} activeTab={activeTab} onTabChange={setActiveTab} className="mb-4" />

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
                { label: "Revenue",  data: chart.revenue  },
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
              <PnLItem label="Gross Margin" value="28.6%"  trend="▲ 1.2pp" trendColor="rgba(48,209,88,0.95)"  />
              <PnLItem label="EBITDA"       value="€112K"  trend="▲ 9.4%"  trendColor="rgba(48,209,88,0.95)"  />
              <div className="flex-1 px-4 py-3">
                <p className="text-[10px] font-semibold text-white/35 uppercase tracking-[.07em] mb-1">Tax Provision</p>
                <p className="text-[16px] font-bold text-white/95 tracking-tight">€26K</p>
                <p className="text-[11px] font-semibold mt-0.5 text-white/35">→ 16% rate</p>
              </div>
            </div>
          </GlassCard>

          {/* Quick actions */}
          <div className="grid grid-cols-4 gap-2.5 mb-3.5">
            {QA.map(({ label, path }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1.5 py-4 rounded-[14px]"
                style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-white/45">
                  <path d={path} />
                </svg>
                <span className="text-[11px] font-medium text-white/40 text-center leading-tight px-1">{label}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Transactions tab ── */}
      {activeTab === "transactions" && (
        <>
          <Label>Recent Transactions</Label>
          <GlassCard>
            <GlassTable<TxRow>
              columns={TX_COLUMNS}
              data={TRANSACTIONS}
              keyField="id"
            />
          </GlassCard>
        </>
      )}

      {/* ── Invoices tab ── */}
      {activeTab === "invoices" && (
        <>
          <Label>Open Invoices</Label>
          <GlassCard>
            <GlassTable<InvoiceRow>
              columns={INV_COLUMNS}
              data={INVOICES}
              keyField="id"
            />
          </GlassCard>
        </>
      )}

    </div>
  )
}
