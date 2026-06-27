import { getPortalSession } from "@/lib/portal-auth"
import { db } from "@prv/db"
import { projects, invoices } from "@prv/db/schema"
import { and, count, desc, eq, isNull, inArray, sum } from "drizzle-orm"
import Link from "next/link"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = { title: "Dashboard" }
export const dynamic = "force-dynamic"

function statusLabel(s: string) {
  const map: Record<string, string> = {
    draft: "Draft",
    active: "Active",
    on_hold: "On Hold",
    completed: "Completed",
    cancelled: "Cancelled",
    archived: "Archived",
  }
  return map[s] ?? s
}

function invoiceStatusLabel(s: string) {
  const map: Record<string, string> = {
    draft: "Draft",
    sent: "Awaiting Payment",
    paid: "Paid",
    overdue: "Overdue",
    cancelled: "Cancelled",
    refunded: "Refunded",
  }
  return map[s] ?? s
}

function invoiceStatusColor(s: string): string {
  if (s === "paid") return "rgba(255,255,255,0.65)"
  if (s === "overdue") return "rgba(255,120,120,0.85)"
  if (s === "sent") return "rgba(255,220,100,0.85)"
  return "rgba(255,255,255,0.35)"
}

export default async function PortalDashboardPage() {
  const session = await getPortalSession()
  if (!session || !session.clientId) redirect("/portal/login")

  const [activeProjects, recentInvoices, invoiceTotals] = await Promise.all([
    db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        dueDate: projects.dueDate,
        startDate: projects.startDate,
      })
      .from(projects)
      .where(
        and(
          eq(projects.companyId, session.companyId),
          eq(projects.clientId, session.clientId),
          isNull(projects.deletedAt),
          inArray(projects.status, ["active", "on_hold"])
        )
      )
      .orderBy(desc(projects.updatedAt))
      .limit(4),

    db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        total: invoices.total,
        currency: invoices.currency,
        dueDate: invoices.dueDate,
        issueDate: invoices.issueDate,
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
      .limit(3),

    db
      .select({ total: sum(invoices.total), status: invoices.status })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, session.companyId),
          eq(invoices.clientId, session.clientId),
          isNull(invoices.deletedAt)
        )
      )
      .groupBy(invoices.status),
  ])

  const totalPaid = invoiceTotals.find((r) => r.status === "paid")?.total ?? "0"
  const totalDue = invoiceTotals
    .filter((r) => r.status === "sent" || r.status === "overdue")
    .reduce((acc, r) => acc + parseFloat(r.total ?? "0"), 0)

  const currency = recentInvoices[0]?.currency ?? "RON"

  return (
    <div className="mx-auto max-w-2xl">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white/95" style={{ letterSpacing: "-0.03em" }}>
          Good to see you, {session.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-white/40">Here&apos;s your project overview.</p>
      </div>

      {/* KPI row */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatCard label="Active projects" value={String(activeProjects.length)} />
        <StatCard
          label="Amount due"
          value={`${Number(totalDue).toLocaleString("ro-RO", { minimumFractionDigits: 2 })} ${currency}`}
          highlight={totalDue > 0}
        />
      </div>

      {/* Active projects */}
      {activeProjects.length > 0 && (
        <Section title="Active projects" href="/portal/projects">
          {activeProjects.map((p) => (
            <Link
              key={p.id}
              href={`/portal/projects/${p.id}`}
              className="flex items-center justify-between rounded-[16px] px-4 py-3.5 transition-all hover:bg-white/[0.04]"
              style={{ border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-medium text-white/90">{p.name}</span>
                {p.dueDate && (
                  <span className="text-xs text-white/35">
                    Due {new Date(p.dueDate).toLocaleDateString("ro-RO")}
                  </span>
                )}
              </div>
              <span
                className="ml-4 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                {statusLabel(p.status)}
              </span>
            </Link>
          ))}
        </Section>
      )}

      {/* Recent invoices */}
      {recentInvoices.length > 0 && (
        <Section title="Recent invoices" href="/portal/invoices" className="mt-4">
          {recentInvoices.map((inv) => (
            <Link
              key={inv.id}
              href={`/portal/invoices/${inv.id}`}
              className="flex items-center justify-between rounded-[16px] px-4 py-3.5 transition-all hover:bg-white/[0.04]"
              style={{ border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium text-white/90">{inv.invoiceNumber}</span>
                <span className="text-xs text-white/35">
                  {new Date(inv.issueDate).toLocaleDateString("ro-RO")}
                </span>
              </div>
              <div className="ml-4 flex shrink-0 flex-col items-end gap-0.5">
                <span className="text-sm font-semibold text-white/90">
                  {Number(inv.total).toLocaleString("ro-RO", { minimumFractionDigits: 2 })}{" "}
                  {inv.currency}
                </span>
                <span className="text-[11px]" style={{ color: invoiceStatusColor(inv.status) }}>
                  {invoiceStatusLabel(inv.status)}
                </span>
              </div>
            </Link>
          ))}
        </Section>
      )}

      {activeProjects.length === 0 && recentInvoices.length === 0 && <EmptyState />}
    </div>
  )
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
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
        className="text-xl font-semibold"
        style={{
          color: highlight ? "rgba(255,220,100,0.90)" : "rgba(255,255,255,0.90)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </span>
    </div>
  )
}

function Section({
  title,
  href,
  children,
  className,
}: {
  title: string
  href: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-medium uppercase tracking-wider text-white/35">{title}</span>
        <Link href={href} className="text-xs text-white/35 transition-colors hover:text-white/60">
          See all →
        </Link>
      </div>
      <div
        className="overflow-hidden rounded-[20px] divide-y divide-white/[0.06]"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {children}
      </div>
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
            d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="text-sm text-white/45">No active projects yet.</p>
    </div>
  )
}
