import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { db } from "@prv/db"
import { auditLogs, users } from "@prv/db/schema"
import { eq, desc, and, gt } from "drizzle-orm"
import { GlassCard, SectionLabel } from "@/app/(authenticated)/dashboard/_shared"

export const dynamic = "force-dynamic"
export const metadata = { title: "Audit Log · PRV" }

function fmtDate(d: Date) {
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default async function AuditPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  let session
  try {
    session = await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  let rows: {
    id: string
    action: string
    entityType: string | null
    path: string | null
    gateFailed: number
    errorCode: string | null
    createdAt: Date
    actorFirstName: string | null
    actorLastName: string | null
  }[] = []

  try {
    rows = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        path: auditLogs.path,
        gateFailed: auditLogs.gateFailed,
        errorCode: auditLogs.errorCode,
        createdAt: auditLogs.createdAt,
        actorFirstName: users.firstName,
        actorLastName: users.lastName,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorId, users.id))
      .where(eq(auditLogs.companyId, session.companyId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(50)
  } catch {
    rows = []
  }

  const failCount = rows.filter((r) => r.gateFailed > 0).length

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="text-[13px] font-medium mb-0.5" style={{ color: "var(--prv-text-3)" }}>
          PRV
        </p>
        <h1
          className="text-[26px] font-semibold tracking-tight leading-tight"
          style={{ color: "var(--prv-text-1)" }}
        >
          Audit Log
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: "var(--prv-text-3)" }}>
          Immutable event chain · SHA-256 chained
        </p>
      </div>

      {/* Stats bar */}
      <div className="flex gap-3 mb-3.5">
        <GlassCard className="flex-1">
          <p className="text-[11px] uppercase tracking-widest mb-1" style={{ color: "var(--prv-text-3)" }}>
            Events shown
          </p>
          <p className="text-[22px] font-bold" style={{ color: "var(--prv-text-1)" }}>
            {rows.length}
          </p>
        </GlassCard>
        <GlassCard className="flex-1">
          <p className="text-[11px] uppercase tracking-widest mb-1" style={{ color: "var(--prv-text-3)" }}>
            Gate failures
          </p>
          <p
            className="text-[22px] font-bold"
            style={{ color: failCount > 0 ? "rgba(255,99,90,0.9)" : "rgba(80,220,120,0.9)" }}
          >
            {failCount}
          </p>
        </GlassCard>
      </div>

      {/* Log */}
      <GlassCard>
        <SectionLabel>Recent events</SectionLabel>
        {rows.length === 0 && (
          <p className="py-3 text-[13px]" style={{ color: "var(--prv-text-3)" }}>
            No audit events found
          </p>
        )}
        {rows.map((row) => {
          const ok = row.gateFailed === 0
          const actor =
            row.actorFirstName
              ? `${row.actorFirstName} ${row.actorLastName ?? ""}`.trim()
              : "System"
          return (
            <div
              key={row.id}
              className="flex items-start gap-3 py-2.5 border-b last:border-b-0"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              <span
                className="w-[7px] h-[7px] rounded-full flex-shrink-0 mt-[5px]"
                style={{ background: ok ? "rgba(80,220,120,0.9)" : "rgba(255,99,90,0.9)" }}
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-[12px] font-mono truncate"
                  style={{ color: "var(--prv-text-1)" }}
                >
                  {row.action}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--prv-text-3)" }}>
                  {actor}
                  {row.entityType ? ` · ${row.entityType}` : ""}
                  {row.path ? ` · ${row.path.slice(0, 40)}` : ""}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                {!ok && row.errorCode && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-[4px] block mb-1"
                    style={{
                      background: "rgba(255,59,48,0.14)",
                      color: "rgba(255,99,90,0.9)",
                    }}
                  >
                    {row.errorCode}
                  </span>
                )}
                <span className="text-[11px]" style={{ color: "var(--prv-text-3)" }}>
                  {fmtDate(row.createdAt)}
                </span>
              </div>
            </div>
          )
        })}
      </GlassCard>
    </div>
  )
}
