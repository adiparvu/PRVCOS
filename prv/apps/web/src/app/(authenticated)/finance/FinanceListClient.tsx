"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { Expense, PlRow, FinanceMeta } from "@/app/api/finance/expenses/route"
import type { InvoiceSummary } from "@/app/api/finance/invoices/route"

type FilterType = "Toate" | "Venituri" | "Cheltuieli" | "Facturi" | "Rapoarte"

interface FinanceData {
  expenses: Expense[]
  plData: PlRow[]
  meta: FinanceMeta
}

// ── Icons ────────────────────────────────────────────────────────────────────

function IconTrendUp() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

function IconTrendDown() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <polyline points="17 18 23 18 23 12" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg
      width="8"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function IconReceipt() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

function IconBarChart() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function IconWallet() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
      <path d="M16 3H8L2 7h20l-6-4z" />
      <circle cx="17" cy="13" r="1" fill="currentColor" />
    </svg>
  )
}

function IconDownload() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function IconFileText() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

// ── Color helpers ─────────────────────────────────────────────────────────────

const PL_COLORS: Record<string, string> = {
  green: "rgba(48,209,88,.9)",
  red: "rgba(255,69,58,.9)",
  blue: "rgba(10,132,255,.9)",
  amber: "rgba(255,159,10,.9)",
}

const EXPENSE_STATUS_COLORS: Record<string, string> = {
  pending: "rgba(255,159,10,.95)",
  approved: "rgba(48,209,88,.95)",
  rejected: "rgba(255,69,58,.95)",
  draft: "rgba(255,255,255,.35)",
}

const EXPENSE_STATUS_LABELS: Record<string, string> = {
  pending: "Așteptare",
  approved: "Aprobat",
  rejected: "Respins",
  draft: "Ciornă",
}

const INVOICE_STATUS_COLORS: Record<string, string> = {
  overdue: "rgba(255,69,58,.95)",
  due: "rgba(255,159,10,.95)",
  partial: "rgba(10,132,255,.9)",
  paid: "rgba(48,209,88,.95)",
  draft: "rgba(255,255,255,.35)",
  void: "rgba(255,255,255,.35)",
}

const INVOICE_STATUS_LABELS: Record<string, string> = {
  overdue: "Restanță",
  due: "Scadent",
  partial: "Parțial",
  paid: "Plătit",
  draft: "Ciornă",
  void: "Anulat",
}

// ── KPI Tile ──────────────────────────────────────────────────────────────────

function KpiTile({
  label,
  value,
  trend,
  trendPositive,
  accentColor,
}: {
  label: string
  value: string
  trend: string
  trendPositive: boolean
  accentColor: string
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.07)",
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.11)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
        padding: "14px 16px",
        flex: 1,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${accentColor}55, ${accentColor}22)`,
          borderRadius: "0 0 16px 16px",
        }}
      />
      <div
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,.5)",
          marginBottom: 6,
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: "rgba(255,255,255,.95)",
          letterSpacing: "-0.03em",
          marginBottom: 4,
        }}
      >
        {value}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          color: accentColor,
          fontSize: 11,
          fontWeight: 500,
        }}
      >
        {trendPositive ? <IconTrendUp /> : <IconTrendDown />}
        {trend}
      </div>
    </div>
  )
}

// ── P&L Bar Row ───────────────────────────────────────────────────────────────

function PlBarRow({ row }: { row: PlRow }) {
  const color = PL_COLORS[row.colorKey] ?? "rgba(255,255,255,.6)"
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 110, fontSize: 12, color: "rgba(255,255,255,.55)", flexShrink: 0 }}>
        {row.label}
      </div>
      <div
        style={{
          flex: 1,
          height: 6,
          background: "rgba(255,255,255,.08)",
          borderRadius: 100,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${row.pct}%`,
            background: color,
            borderRadius: 100,
          }}
        />
      </div>
      <div
        style={{
          width: 48,
          fontSize: 13,
          fontWeight: 600,
          color: "rgba(255,255,255,.9)",
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {row.valueLabel}
      </div>
    </div>
  )
}

// ── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "rgba(255,255,255,.85)",
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </span>
      {count !== undefined && (
        <span
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,.4)",
            background: "rgba(255,255,255,.08)",
            borderRadius: 100,
            padding: "1px 7px",
            fontWeight: 500,
          }}
        >
          {count}
        </span>
      )}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div
      style={{
        height: 56,
        background: "rgba(255,255,255,0.05)",
        borderRadius: 12,
        marginBottom: 8,
        animation: "pulse 1.4s ease-in-out infinite",
      }}
    />
  )
}

// ── Expense Row ───────────────────────────────────────────────────────────────

function ExpenseRow({ expense }: { expense: Expense }) {
  const statusColor = EXPENSE_STATUS_COLORS[expense.status] ?? "rgba(255,255,255,.35)"
  const statusLabel = EXPENSE_STATUS_LABELS[expense.status] ?? expense.status
  const borderColor = statusColor

  return (
    <Link
      href={`/finance/expenses/${expense.id}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 14px",
          background: "rgba(255,255,255,0.05)",
          borderRadius: 14,
          marginBottom: 8,
          borderLeft: "3px solid transparent",
          borderImage: `linear-gradient(180deg, ${borderColor}, ${borderColor}66) 1`,
          paddingLeft: 13,
          cursor: "pointer",
          transition: "background 0.2s",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "rgba(255,255,255,.9)",
              marginBottom: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {expense.title}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)" }}>
            {expense.vendorName} · {expense.date}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 4,
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,69,58,.95)" }}>
            −{expense.amountLabel}
          </div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: statusColor,
              background: `${statusColor}18`,
              borderRadius: 100,
              padding: "2px 7px",
              letterSpacing: "0.02em",
            }}
          >
            {statusLabel}
          </div>
        </div>
        <div style={{ color: "rgba(255,255,255,.22)", flexShrink: 0 }}>
          <IconChevronRight />
        </div>
      </div>
    </Link>
  )
}

// ── Invoice Row ───────────────────────────────────────────────────────────────

function InvoiceRow({ invoice }: { invoice: InvoiceSummary }) {
  const statusColor = INVOICE_STATUS_COLORS[invoice.status] ?? "rgba(255,255,255,.35)"
  const statusLabel = INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status
  const borderColor = statusColor

  return (
    <Link
      href={`/finance/invoices/${invoice.id}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 14px",
          background: "rgba(255,255,255,0.05)",
          borderRadius: 14,
          marginBottom: 8,
          borderLeft: "3px solid transparent",
          borderImage: `linear-gradient(180deg, ${borderColor}, ${borderColor}66) 1`,
          paddingLeft: 13,
          cursor: "pointer",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "rgba(255,255,255,.9)",
              marginBottom: 2,
            }}
          >
            {invoice.ref} · {invoice.clientName}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,.45)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {invoice.projectName}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 4,
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,.9)" }}>
            €{invoice.amount.toLocaleString()}
          </div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: statusColor,
              background: `${statusColor}18`,
              borderRadius: 100,
              padding: "2px 7px",
              letterSpacing: "0.02em",
            }}
          >
            {statusLabel}
          </div>
        </div>
        <div style={{ color: "rgba(255,255,255,.22)", flexShrink: 0 }}>
          <IconChevronRight />
        </div>
      </div>
    </Link>
  )
}

// ── Report Card ───────────────────────────────────────────────────────────────

const MOCK_REPORTS = [
  {
    id: "r1",
    title: "Raport Lunar · Mai 2026",
    pages: 14,
    dateLabel: "1 Iun 2026",
    statusLabel: "Finalizat",
    statusColor: "rgba(48,209,88,.95)",
  },
  {
    id: "r2",
    title: "Raport Cheltuieli Q2",
    pages: 8,
    dateLabel: "5 Iun 2026",
    statusLabel: "Revizuiește",
    statusColor: "rgba(255,159,10,.95)",
  },
  {
    id: "r3",
    title: "Prognoză Cash Flow Q3",
    pages: 6,
    dateLabel: "7 Iun 2026",
    statusLabel: "AI",
    statusColor: "rgba(191,90,242,.9)",
  },
]

function ReportCard({ report }: { report: (typeof MOCK_REPORTS)[0] }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        background: "rgba(255,255,255,0.05)",
        borderRadius: 14,
        marginBottom: 8,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "rgba(255,255,255,.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,.55)",
          flexShrink: 0,
        }}
      >
        <IconFileText />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,.9)", marginBottom: 2 }}
        >
          {report.title}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>
          {report.pages} pagini · {report.dateLabel}
        </div>
      </div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: report.statusColor,
          background: `${report.statusColor}18`,
          borderRadius: 100,
          padding: "2px 8px",
        }}
      >
        {report.statusLabel}
      </div>
    </div>
  )
}

// ── FAB Sheet Item ────────────────────────────────────────────────────────────

function SheetAction({
  label,
  icon,
  color,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  color: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        width: "100%",
        padding: "14px 16px",
        background: "none",
        border: "none",
        cursor: "pointer",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `${color}20`,
          border: `1px solid ${color}40`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <span style={{ fontSize: 15, color: "rgba(255,255,255,.9)", fontWeight: 500 }}>{label}</span>
    </button>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function FinanceListClient() {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterType>("Toate")
  const [expData, setExpData] = useState<FinanceData | null>(null)
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [fabOpen, setFabOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch("/api/finance/expenses").then((r) => r.json()),
      fetch("/api/finance/invoices").then((r) => r.json()),
    ])
      .then(([expJson, invJson]) => {
        setExpData(expJson as FinanceData)
        setInvoices((invJson as { invoices: InvoiceSummary[] }).invoices ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  const meta = expData?.meta
  const plData = expData?.plData ?? []
  const expenses = expData?.expenses ?? []
  const pendingInvoices = invoices.filter((i) => i.status === "overdue" || i.status === "due")

  const filters: FilterType[] = ["Toate", "Venituri", "Cheltuieli", "Facturi", "Rapoarte"]

  const showPL = filter === "Toate" || filter === "Venituri"
  const showExpenses = filter === "Toate" || filter === "Cheltuieli"
  const showInvoices = filter === "Toate" || filter === "Facturi"
  const showReports = filter === "Rapoarte"

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif',
        paddingBottom: 120,
      }}
    >
      <style>{`
        @keyframes pulse { 0%,100% { opacity:.4 } 50% { opacity:.8 } }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>

      {/* Header */}
      <div
        style={{
          padding: "56px 20px 0",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            color: "rgba(255,255,255,.95)",
          }}
        >
          Finanțe
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)", marginTop: 2 }}>
          Iunie 2026 · PRV Group
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{ padding: "0 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <KpiTile
            label="Venituri"
            value={meta?.totalRevenueLabel ?? "—"}
            trend={meta?.revenueTrend ?? "—"}
            trendPositive={meta?.revenueTrend?.startsWith("+") ?? true}
            accentColor="rgba(48,209,88,.9)"
          />
          <KpiTile
            label="Cheltuieli"
            value={meta?.totalExpensesLabel ?? "—"}
            trend={meta?.expensesTrend ?? "—"}
            trendPositive={meta?.expensesTrend?.startsWith("+") ?? false}
            accentColor="rgba(255,69,58,.9)"
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <KpiTile
            label="Profit Net"
            value={meta?.profitLabel ?? "—"}
            trend={meta?.profitTrend ?? "—"}
            trendPositive={meta?.profitTrend?.startsWith("+") ?? true}
            accentColor="rgba(10,132,255,.9)"
          />
          <KpiTile
            label="TVA · Iun"
            value={meta?.vatLabel ?? "—"}
            trend="19%"
            trendPositive={true}
            accentColor="rgba(255,159,10,.9)"
          />
        </div>
      </div>

      {/* Cash Flow shortcut */}
      <div style={{ padding: "0 20px", marginBottom: 16 }}>
        <Link
          href="/finance/cash-flow"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderRadius: 16,
            background: "rgba(10,132,255,0.08)",
            border: "1px solid rgba(10,132,255,0.2)",
            textDecoration: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(10,132,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(10,132,255,0.9)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.90)",
                  margin: 0,
                }}
              >
                Cash Flow
              </p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", margin: "2px 0 0" }}>
                Balanță · Prognoză 30/60/90d · Breakdown
              </p>
            </div>
          </div>
          <svg
            width="8"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>
      </div>

      {/* Filter chips */}
      <div
        style={{
          padding: "0 20px",
          marginBottom: 24,
          overflowX: "auto",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div style={{ display: "flex", gap: 8, width: "max-content" }}>
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "7px 16px",
                borderRadius: 100,
                border: "1px solid",
                borderColor: filter === f ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.12)",
                background: filter === f ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.05)",
                color: filter === f ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.5)",
                fontSize: 13,
                fontWeight: filter === f ? 600 : 400,
                cursor: "pointer",
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "0 20px" }}>
        {/* P&L Chart */}
        {showPL && (
          <div style={{ marginBottom: 28 }}>
            <SectionHeader title="Profit & Loss · Iun 2026" />
            <div
              style={{
                background: "rgba(255,255,255,0.06)",
                backdropFilter: "blur(32px)",
                WebkitBackdropFilter: "blur(32px)",
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
                padding: "18px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 1,
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)",
                }}
              />
              {loading
                ? [1, 2, 3, 4, 5].map((n) => (
                    <div
                      key={n}
                      style={{
                        height: 16,
                        background: "rgba(255,255,255,.07)",
                        borderRadius: 8,
                        animation: "pulse 1.4s ease-in-out infinite",
                      }}
                    />
                  ))
                : plData.map((row) => <PlBarRow key={row.label} row={row} />)}
            </div>
          </div>
        )}

        {/* Expenses */}
        {showExpenses && (
          <div style={{ marginBottom: 28 }}>
            <SectionHeader
              title={filter === "Cheltuieli" ? "Toate Cheltuielile" : "Cheltuieli Recente"}
              count={filter === "Cheltuieli" ? expenses.length : Math.min(expenses.length, 4)}
            />
            {loading
              ? [1, 2, 3].map((n) => <SkeletonRow key={n} />)
              : (filter === "Cheltuieli" ? expenses : expenses.slice(0, 4)).map((exp) => (
                  <ExpenseRow key={exp.id} expense={exp} />
                ))}
            {!loading && filter === "Toate" && expenses.length > 4 && (
              <button
                onClick={() => setFilter("Cheltuieli")}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "rgba(255,255,255,.05)",
                  border: "1px solid rgba(255,255,255,.08)",
                  borderRadius: 12,
                  color: "rgba(255,255,255,.5)",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Vezi toate ({expenses.length})
              </button>
            )}
          </div>
        )}

        {/* Invoices */}
        {showInvoices && (
          <div style={{ marginBottom: 28 }}>
            <SectionHeader
              title={filter === "Facturi" ? "Toate Facturile" : "Facturi Pendinte"}
              count={filter === "Facturi" ? invoices.length : pendingInvoices.length}
            />
            {loading
              ? [1, 2].map((n) => <SkeletonRow key={n} />)
              : (filter === "Facturi" ? invoices : pendingInvoices).map((inv) => (
                  <InvoiceRow key={inv.id} invoice={inv} />
                ))}
            {!loading && filter === "Toate" && pendingInvoices.length === 0 && (
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,.3)",
                  textAlign: "center",
                  padding: "16px 0",
                }}
              >
                Nicio factură pendinte
              </div>
            )}
          </div>
        )}

        {/* Reports */}
        {showReports && (
          <div style={{ marginBottom: 28 }}>
            <SectionHeader title="Rapoarte Financiare" count={MOCK_REPORTS.length} />
            {MOCK_REPORTS.map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setFabOpen(true)}
        style={{
          position: "fixed",
          bottom: 90,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: 100,
          background: "rgba(255,255,255,0.15)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          border: "1px solid rgba(255,255,255,0.22)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,.9)",
          cursor: "pointer",
          zIndex: 40,
        }}
      >
        <IconPlus />
      </button>

      {/* FAB Sheet */}
      {fabOpen && (
        <>
          <div
            onClick={() => setFabOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              zIndex: 50,
              animation: "fadeIn 0.2s ease",
            }}
          />
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: "rgba(28,28,30,0.95)",
              backdropFilter: "blur(48px)",
              WebkitBackdropFilter: "blur(48px)",
              borderRadius: "28px 28px 0 0",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 -24px 64px rgba(0,0,0,0.7)",
              zIndex: 51,
              paddingBottom: 34,
              animation: "slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                background: "rgba(255,255,255,.2)",
                borderRadius: 100,
                margin: "12px auto 16px",
              }}
            />
            <div
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,.35)",
                textAlign: "center",
                marginBottom: 12,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Acțiuni Finanțe
            </div>
            <SheetAction
              label="Înregistrează Cheltuială"
              icon={<IconReceipt />}
              color="rgba(48,209,88,.9)"
              onClick={() => {
                setFabOpen(false)
                router.push("/finance/expenses/new")
              }}
            />
            <SheetAction
              label="Crează Factură Nouă"
              icon={<IconFileText />}
              color="rgba(10,132,255,.9)"
              onClick={() => {
                setFabOpen(false)
                router.push("/finance/invoices/new")
              }}
            />
            <SheetAction
              label="Prognoză Cash Flow"
              icon={<IconBarChart />}
              color="rgba(255,159,10,.9)"
              onClick={() => {
                setFabOpen(false)
                router.push("/finance/cash-flow")
              }}
            />
            <SheetAction
              label="Export Raport Financiar"
              icon={<IconDownload />}
              color="rgba(255,255,255,.6)"
              onClick={() => setFabOpen(false)}
            />
            <button
              onClick={() => setFabOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "calc(100% - 32px)",
                margin: "12px 16px 0",
                padding: "14px",
                background: "rgba(255,255,255,.07)",
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: 14,
                color: "rgba(255,255,255,.6)",
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              <IconClose />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
