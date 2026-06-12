import { getPortalSession } from "@/lib/portal-auth"
import { db } from "@prv/db"
import { projects } from "@prv/db/schema"
import { and, desc, eq, isNull } from "drizzle-orm"
import Link from "next/link"
import { redirect } from "next/navigation"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Projects" }
export const dynamic = "force-dynamic"

const STATUS_ORDER = ["active", "on_hold", "draft", "completed", "cancelled", "archived"]

function statusColor(s: string): string {
  if (s === "active") return "rgba(140,255,140,0.75)"
  if (s === "on_hold") return "rgba(255,220,100,0.80)"
  if (s === "completed") return "rgba(255,255,255,0.50)"
  if (s === "draft") return "rgba(255,255,255,0.30)"
  return "rgba(255,255,255,0.20)"
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

export default async function PortalProjectsPage() {
  const session = await getPortalSession()
  if (!session || !session.clientId) redirect("/portal/login")

  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      code: projects.code,
      status: projects.status,
      startDate: projects.startDate,
      dueDate: projects.dueDate,
      completedAt: projects.completedAt,
      budget: projects.budget,
      currency: projects.currency,
    })
    .from(projects)
    .where(
      and(
        eq(projects.companyId, session.companyId),
        eq(projects.clientId, session.clientId),
        isNull(projects.deletedAt)
      )
    )
    .orderBy(desc(projects.updatedAt))

  // Group by status
  const grouped = new Map<string, typeof rows>()
  for (const order of STATUS_ORDER) {
    const group = rows.filter((r) => r.status === order)
    if (group.length > 0) grouped.set(order, group)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white/95" style={{ letterSpacing: "-0.03em" }}>
          Projects
        </h1>
        <p className="mt-1 text-sm text-white/40">{rows.length} total</p>
      </div>

      {rows.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-white/40">No projects yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Array.from(grouped.entries()).map(([status, group]) => (
            <div key={status}>
              <div className="mb-2 flex items-center gap-2 px-1">
                <div
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: statusColor(status) }}
                />
                <span className="text-xs font-medium uppercase tracking-wider text-white/35">
                  {statusLabel(status)}
                </span>
              </div>
              <div
                className="overflow-hidden rounded-[20px]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                {group.map((p, i) => (
                  <Link
                    key={p.id}
                    href={`/portal/projects/${p.id}`}
                    className="flex items-center justify-between px-5 py-4 transition-all hover:bg-white/[0.04]"
                    style={{
                      borderTop: i > 0 ? "1px solid rgba(255,255,255,0.07)" : undefined,
                    }}
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-sm font-medium text-white/90">{p.name}</span>
                      <div className="flex items-center gap-2">
                        {p.code && <span className="text-xs text-white/30">{p.code}</span>}
                        {p.dueDate && (
                          <span className="text-xs text-white/30">
                            Due {new Date(p.dueDate).toLocaleDateString("ro-RO")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 flex shrink-0 items-center gap-3">
                      {p.budget && (
                        <span className="text-sm text-white/50">
                          {Number(p.budget).toLocaleString("ro-RO")} {p.currency}
                        </span>
                      )}
                      <ChevronRight />
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

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 18l6-6-6-6"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
