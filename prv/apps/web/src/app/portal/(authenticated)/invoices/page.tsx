import { getPortalSession } from "@/lib/portal-auth"
import { db } from "@prv/db"
import { invoices } from "@prv/db/schema"
import { and, desc, eq, isNull } from "drizzle-orm"
import { redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Invoices" }
export const dynamic = "force-dynamic"

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled" | "refunded"

const STATUS_ORDER: InvoiceStatus[] = ["overdue", "sent", "draft", "paid", "cancelled", "refunded"]

function statusLabel(s: string) {
  const m: Record<string, string> = {
    draft: "Draft",
    sent: "Awaiting Payment",
    paid: "Paid",
    overdue: "Overdue",
    cancelled: "Cancelled",
    refunded: "Refunded",
  }
  return m[s] ?? s
}

function statusColor(s: string) {
  if (s === "paid") return "rgba(140,255,140,0.75)"
  if (s === "overdue") return "rgba(255,100,100,0.90)"
  if (s === "sent") return "rgba(255,220,100,0.85)"
  if (s === "cancelled" || s === "refunded") return "rgba(255,255,255,0.25)"
  return "rgba(255,255,255,0.40)"
}

function statusBg(s: string) {
  if (s === "paid") return "rgba(140,255,140,0.10)"
  if (s === "overdue") return "rgba(255,100,100,0.12)"
  if (s === "sent") return "rgba(255,220,100,0.10)"
  return "rgba(255,255,255,0.06)"
}

function statusBorder(s: string) {
  if (s === "paid") return "rgba(140,255,140,0.18)"
  if (s === "overdue") return "rgba(255,100,100,0.22)"
  if (s === "sent") return "rgba(255,220,100,0.20)"
  return "rgba(255,255,255,0.09)"
}

export default async function PortalInvoicesPage() {
  const session = await getPortalSession()
  if (!session || !session.clientId) redirect("/portal/login")

  const allInvoices = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      total: invoices.total,
      subtotal: invoices.subtotal,
      vatAmount: invoices.vatAmount,
      currency: invoices.currency,
      dueDate: invoices.dueDate,
      issueDate: invoices.issueDate,
      paidAt: invoices.paidAt,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.companyId, session.companyId),
        eq(invoices.clientId, session.clientId),
        isNull(invoices.deletedAt)
      )
    )
    .orderBy(desc(invoices.issueDate))

  // Group by status in priority order
  const grouped = STATUS_ORDER.map((s) => ({
    status: s,
    items: allInvoices.filter((inv) => inv.status === s),
  })).filter((g) => g.items.length > 0)

  const totalOutstanding = allInvoices
    .filter((inv) => inv.status === "sent" || inv.status === "overdue")
    .reduce((acc, inv) => acc + parseFloat(inv.total), 0)

  const totalPaid = allInvoices
    .filter((inv) => inv.status === "paid")
    .reduce((acc, inv) => acc + parseFloat(inv.total), 0)

  const currency = allInvoices[0]?.currency ?? "RON"

  return (
    <div className="mx-auto max-w-2xl">
      <h1
        className="mb-6 text-2xl font-semibold text-white/95"
        style={{ letterSpacing: "-0.03em" }}
      >
        Invoices
      </h1>

      {/* Summary tiles */}
      {allInvoices.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3">
          <SummaryTile
            label="Outstanding"
            value={`${totalOutstanding.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} ${currency}`}
            accent={totalOutstanding > 0 ? "rgba(255,220,100,0.90)" : undefined}
          />
          <SummaryTile
            label="Total paid"
            value={`${totalPaid.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} ${currency}`}
          />
        </div>
      )}

      {allInvoices.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(({ status, items }) => (
            <div key={status}>
              <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wider text-white/35">
                {statusLabel(status)} · {items.length}
              </p>
              <div
                className="overflow-hidden rounded-[20px]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              >
                {items.map((inv, i) => (
                  <Link
                    key={inv.id}
                    href={`/portal/invoices/${inv.id}`}
                    className="flex items-center justify-between px-5 py-4 transition-all hover:bg-white/[0.03]"
                    style={{
                      borderTop: i > 0 ? "1px solid rgba(255,255,255,0.07)" : undefined,
                    }}
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-medium text-white/90">{inv.invoiceNumber}</span>
                      <span className="text-xs text-white/35">
                        Issued {new Date(inv.issueDate).toLocaleDateString("ro-RO")}
                        {inv.status !== "paid" &&
                          ` · Due ${new Date(inv.dueDate).toLocaleDateString("ro-RO")}`}
                        {inv.status === "paid" &&
                          inv.paidAt &&
                          ` · Paid ${new Date(inv.paidAt).toLocaleDateString("ro-RO")}`}
                      </span>
                    </div>
                    <div className="ml-4 flex shrink-0 flex-col items-end gap-1.5">
                      <span className="text-sm font-semibold text-white/90">
                        {Number(inv.total).toLocaleString("ro-RO", { minimumFractionDigits: 2 })}{" "}
                        {inv.currency}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{
                          color: statusColor(inv.status),
                          background: statusBg(inv.status),
                          border: `1px solid ${statusBorder(inv.status)}`,
                        }}
                      >
                        {statusLabel(inv.status)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryTile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div
      className="flex flex-col gap-1 rounded-[20px] p-5"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      <span className="text-xs text-white/40">{label}</span>
      <span
        className="text-lg font-semibold leading-tight"
        style={{ color: accent ?? "rgba(255,255,255,0.90)", letterSpacing: "-0.02em" }}
      >
        {value}
      </span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="mt-16 flex flex-col items-center gap-3 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="14 2 14 8 20 8"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="text-sm text-white/45">No invoices yet.</p>
    </div>
  )
}
