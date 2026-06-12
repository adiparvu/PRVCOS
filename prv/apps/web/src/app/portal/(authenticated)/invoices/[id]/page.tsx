import { getPortalSession } from "@/lib/portal-auth"
import { db } from "@prv/db"
import { invoices, invoiceItems, projects } from "@prv/db/schema"
import { and, asc, eq, isNull } from "drizzle-orm"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const [inv] = await db
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1)
  return { title: inv?.invoiceNumber ?? "Invoice" }
}

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

export default async function PortalInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getPortalSession()
  if (!session || !session.clientId) redirect("/portal/login")

  const [invoice] = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      paidAt: invoices.paidAt,
      subtotal: invoices.subtotal,
      vatAmount: invoices.vatAmount,
      total: invoices.total,
      currency: invoices.currency,
      notes: invoices.notes,
      clientId: invoices.clientId,
      projectId: invoices.projectId,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.id, id),
        eq(invoices.companyId, session.companyId),
        isNull(invoices.deletedAt)
      )
    )
    .limit(1)

  if (!invoice || invoice.clientId !== session.clientId) notFound()

  const [items, project] = await Promise.all([
    db
      .select({
        id: invoiceItems.id,
        description: invoiceItems.description,
        quantity: invoiceItems.quantity,
        unit: invoiceItems.unit,
        unitPrice: invoiceItems.unitPrice,
        vatRate: invoiceItems.vatRate,
        total: invoiceItems.total,
        sortOrder: invoiceItems.sortOrder,
      })
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoice.id))
      .orderBy(asc(invoiceItems.sortOrder)),

    invoice.projectId
      ? db
          .select({ id: projects.id, name: projects.name })
          .from(projects)
          .where(eq(projects.id, invoice.projectId))
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
  ])

  const fmt = (n: string | number) =>
    Number(n).toLocaleString("ro-RO", { minimumFractionDigits: 2 })

  return (
    <div className="mx-auto max-w-2xl">
      {/* Back */}
      <Link
        href="/portal/invoices"
        className="mb-6 flex items-center gap-1.5 text-sm text-white/35 transition-colors hover:text-white/60"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M19 12H5M12 19l-7-7 7-7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Invoices
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white/95" style={{ letterSpacing: "-0.03em" }}>
            {invoice.invoiceNumber}
          </h1>
          {project && (
            <Link
              href={`/portal/projects/${project.id}`}
              className="mt-0.5 block text-sm text-white/35 transition-colors hover:text-white/55"
            >
              {project.name} →
            </Link>
          )}
        </div>
        <span
          className="mt-1 shrink-0 rounded-full px-3 py-1 text-xs font-medium"
          style={{
            color: statusColor(invoice.status),
            background: statusBg(invoice.status),
            border: `1px solid ${statusBorder(invoice.status)}`,
          }}
        >
          {statusLabel(invoice.status)}
        </span>
      </div>

      {/* Dates */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <InfoTile
          label="Issue date"
          value={new Date(invoice.issueDate).toLocaleDateString("ro-RO")}
        />
        <InfoTile label="Due date" value={new Date(invoice.dueDate).toLocaleDateString("ro-RO")} />
        {invoice.paidAt && (
          <InfoTile label="Paid on" value={new Date(invoice.paidAt).toLocaleDateString("ro-RO")} />
        )}
      </div>

      {/* Line items */}
      {items.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wider text-white/35">
            Items
          </p>
          <div
            className="overflow-hidden rounded-[20px]"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {items.map((item, i) => (
              <div
                key={item.id}
                className="px-5 py-4"
                style={{
                  borderTop: i > 0 ? "1px solid rgba(255,255,255,0.07)" : undefined,
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm text-white/85">{item.description}</span>
                    <span className="text-xs text-white/35">
                      {fmt(item.quantity)} {item.unit} × {fmt(item.unitPrice)} {invoice.currency}
                      {Number(item.vatRate) > 0 ? ` · TVA ${item.vatRate}%` : ""}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-white/90">
                    {fmt(item.total)} {invoice.currency}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Totals */}
      <div
        className="rounded-[20px] p-5"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex flex-col gap-2">
          <TotalRow label="Subtotal" value={`${fmt(invoice.subtotal)} ${invoice.currency}`} />
          <TotalRow label="TVA" value={`${fmt(invoice.vatAmount)} ${invoice.currency}`} />
          <div className="my-1 h-px w-full" style={{ background: "rgba(255,255,255,0.09)" }} />
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white/90">Total</span>
            <span className="text-lg font-bold text-white/95" style={{ letterSpacing: "-0.02em" }}>
              {fmt(invoice.total)} {invoice.currency}
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div
          className="mt-4 rounded-[16px] p-4"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-white/30">
            Notes
          </p>
          <p className="text-sm leading-relaxed text-white/55">{invoice.notes}</p>
        </div>
      )}
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex flex-col gap-1 rounded-[16px] p-4"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <span className="text-[11px] text-white/35">{label}</span>
      <span className="text-sm font-medium text-white/85">{value}</span>
    </div>
  )
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-white/50">{label}</span>
      <span className="text-sm text-white/70">{value}</span>
    </div>
  )
}
