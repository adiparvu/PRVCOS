import { getPortalSession } from "@/lib/portal-auth"
import { db } from "@prv/db"
import { projects, invoices } from "@prv/db/schema"
import { and, desc, eq, isNull } from "drizzle-orm"
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
  const [p] = await db
    .select({ name: projects.name })
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1)
  return { title: p?.name ?? "Project" }
}

function statusLabel(s: string) {
  const m: Record<string, string> = {
    draft: "Draft",
    active: "Active",
    on_hold: "On Hold",
    completed: "Completed",
    cancelled: "Cancelled",
    archived: "Archived",
  }
  return m[s] ?? s
}

function invoiceStatusColor(s: string): string {
  if (s === "paid") return "rgba(140,255,140,0.75)"
  if (s === "overdue") return "rgba(255,120,120,0.85)"
  if (s === "sent") return "rgba(255,220,100,0.85)"
  return "rgba(255,255,255,0.35)"
}

export default async function PortalProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getPortalSession()
  if (!session || !session.clientId) redirect("/portal/login")

  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      code: projects.code,
      description: projects.description,
      status: projects.status,
      budget: projects.budget,
      currency: projects.currency,
      startDate: projects.startDate,
      dueDate: projects.dueDate,
      completedAt: projects.completedAt,
      clientId: projects.clientId,
    })
    .from(projects)
    .where(
      and(
        eq(projects.id, id),
        eq(projects.companyId, session.companyId),
        isNull(projects.deletedAt)
      )
    )
    .limit(1)

  // Guard: project must belong to this client
  if (!project || project.clientId !== session.clientId) notFound()

  const projectInvoices = await db
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
        eq(invoices.projectId, project.id),
        eq(invoices.companyId, session.companyId),
        isNull(invoices.deletedAt)
      )
    )
    .orderBy(desc(invoices.issueDate))

  const progress =
    project.status === "completed"
      ? 100
      : project.status === "active"
        ? 65
        : project.status === "on_hold"
          ? 40
          : project.status === "draft"
            ? 10
            : 0

  return (
    <div className="mx-auto max-w-2xl">
      {/* Back */}
      <Link
        href="/portal/projects"
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
        Projects
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1
              className="text-2xl font-semibold text-white/95"
              style={{ letterSpacing: "-0.03em" }}
            >
              {project.name}
            </h1>
            {project.code && <p className="mt-0.5 text-sm text-white/35">{project.code}</p>}
          </div>
          <span
            className="mt-1 shrink-0 rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.60)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            {statusLabel(project.status)}
          </span>
        </div>

        {project.description && (
          <p className="mt-3 text-sm leading-relaxed text-white/50">{project.description}</p>
        )}
      </div>

      {/* Progress bar */}
      {project.status !== "cancelled" && project.status !== "archived" && (
        <GlassCard className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-white/50">Progress</span>
            <span className="text-sm font-semibold text-white/90">{progress}%</span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full"
            style={{ background: "rgba(255,255,255,0.10)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progress}%`,
                background: progress === 100 ? "rgba(140,255,140,0.75)" : "rgba(255,255,255,0.75)",
              }}
            />
          </div>
        </GlassCard>
      )}

      {/* Dates + Budget */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {project.startDate && (
          <InfoTile
            label="Start date"
            value={new Date(project.startDate).toLocaleDateString("ro-RO")}
          />
        )}
        {project.dueDate && (
          <InfoTile
            label="Due date"
            value={new Date(project.dueDate).toLocaleDateString("ro-RO")}
          />
        )}
        {project.budget && (
          <InfoTile
            label="Budget"
            value={`${Number(project.budget).toLocaleString("ro-RO")} ${project.currency}`}
          />
        )}
      </div>

      {/* Invoices */}
      {projectInvoices.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-white/35">
            Invoices
          </p>
          <div
            className="overflow-hidden rounded-[20px]"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            {projectInvoices.map((inv, i) => (
              <div
                key={inv.id}
                className="flex items-center justify-between px-5 py-4"
                style={{
                  borderTop: i > 0 ? "1px solid rgba(255,255,255,0.07)" : undefined,
                }}
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium text-white/90">{inv.invoiceNumber}</span>
                  <span className="text-xs text-white/30">
                    {new Date(inv.issueDate).toLocaleDateString("ro-RO")}
                  </span>
                </div>
                <div className="ml-4 flex shrink-0 flex-col items-end gap-0.5">
                  <span className="text-sm font-semibold text-white/90">
                    {Number(inv.total).toLocaleString("ro-RO", { minimumFractionDigits: 2 })}{" "}
                    {inv.currency}
                  </span>
                  <span className="text-[11px]" style={{ color: invoiceStatusColor(inv.status) }}>
                    {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[20px] p-5 ${className ?? ""}`}
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
      }}
    >
      {children}
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
