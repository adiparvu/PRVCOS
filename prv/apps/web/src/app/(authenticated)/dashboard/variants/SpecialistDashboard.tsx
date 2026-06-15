import { cacheMemo } from "@prv/cache"
import { querySpecialistContext, querySpecialistRoleData } from "@prv/db"
import type {
  SpecialistAnomalyItem,
  SpecialistAuditErrorItem,
  SpecialistHealthItem,
  SpecialistReportItem,
  SpecialistRoleData,
  SpecialistTicketItem,
} from "@prv/db"
import type { PRVSession } from "@prv/auth"
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting"
import { resolveQuickActions } from "@/lib/quick-actions"
import { GlassCard, SectionLabel, QuickActionsGrid, InlineAlert } from "../_shared"
import Link from "next/link"

const SEVERITY_STYLES: Record<string, { bg: string; color: string }> = {
  high: { bg: "rgba(255,59,48,0.14)", color: "rgba(255,99,90,0.90)" },
  medium: { bg: "rgba(255,159,10,0.14)", color: "rgba(255,179,64,0.90)" },
  low: { bg: "rgba(48,209,88,0.14)", color: "rgba(80,220,120,0.90)" },
}

const PRIORITY_STYLES: Record<string, { bg: string; color: string }> = {
  P1: { bg: "rgba(255,59,48,0.14)", color: "rgba(255,99,90,0.90)" },
  P2: { bg: "rgba(255,159,10,0.14)", color: "rgba(255,179,64,0.90)" },
  P3: { bg: "rgba(48,209,88,0.14)", color: "rgba(80,220,120,0.90)" },
}

function AnalystContent({ roleData }: { roleData: SpecialistRoleData | null }) {
  const anomalies = roleData?.anomalies ?? []
  const reports = roleData?.reports ?? []
  const stats = roleData?.stats

  return (
    <>
      {reports.length > 0 && (
        <GlassCard className="mb-3.5">
          <SectionLabel>Recent reports</SectionLabel>
          {reports.map((r: SpecialistReportItem) => (
            <Link
              key={r.id}
              href="/intelligence"
              className="flex items-center justify-between py-2.5 border-b last:border-b-0"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              <span className="text-[13px]" style={{ color: "var(--prv-text-2)" }}>
                {r.title}
              </span>
              <span className="text-[11px]" style={{ color: "var(--prv-text-3)" }}>
                {r.timeAgo}
              </span>
            </Link>
          ))}
        </GlassCard>
      )}

      {anomalies.length > 0 && (
        <GlassCard className="mb-3.5">
          <SectionLabel>Active anomalies · {anomalies.length}</SectionLabel>
          {anomalies.map((a: SpecialistAnomalyItem) => {
            const s = SEVERITY_STYLES[a.severity] ?? SEVERITY_STYLES["low"]!
            return (
              <div
                key={a.id}
                className="flex items-center gap-3 py-2.5 border-b last:border-b-0"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                <span
                  className="text-[9px] font-bold px-2 py-0.5 rounded-[6px] flex-shrink-0 uppercase"
                  style={s}
                >
                  {a.severity}
                </span>
                <span className="flex-1 text-[13px]" style={{ color: "var(--prv-text-2)" }}>
                  {a.title}
                </span>
                <span className="text-[11px]" style={{ color: "var(--prv-text-3)" }}>
                  {a.domain}
                </span>
              </div>
            )
          })}
        </GlassCard>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-3.5">
          <GlassCard>
            <p
              className="text-[11px] font-semibold uppercase tracking-widest mb-1"
              style={{ color: "var(--prv-text-3)" }}
            >
              Team members
            </p>
            <p className="text-[24px] font-bold tracking-tight" style={{ color: "var(--prv-text-1)" }}>
              {stats.memberCount}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(80,220,120,0.85)" }}>
              {stats.activePresence} online
            </p>
          </GlassCard>
          <GlassCard>
            <p
              className="text-[11px] font-semibold uppercase tracking-widest mb-1"
              style={{ color: "var(--prv-text-3)" }}
            >
              Audit events
            </p>
            <p className="text-[24px] font-bold tracking-tight" style={{ color: "var(--prv-text-1)" }}>
              {stats.auditCountToday}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--prv-text-3)" }}>
              today
            </p>
          </GlassCard>
        </div>
      )}
    </>
  )
}

function QAContent({ roleData }: { roleData: SpecialistRoleData | null }) {
  const errors = roleData?.auditErrors ?? []
  const anomalies = roleData?.anomalies ?? []

  return (
    <>
      <GlassCard className="mb-3.5">
        <SectionLabel>Access failures · {errors.length}</SectionLabel>
        {errors.length === 0 && (
          <p className="py-3 text-[13px]" style={{ color: "var(--prv-text-3)" }}>
            No gate failures recorded
          </p>
        )}
        {errors.map((item: SpecialistAuditErrorItem) => (
          <div
            key={item.id}
            className="flex items-center gap-3 py-2.5 border-b last:border-b-0"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-[6px] flex-shrink-0"
              style={SEVERITY_STYLES["high"]}
            >
              FAIL
            </span>
            <span className="flex-1 text-[13px] font-mono truncate" style={{ color: "var(--prv-text-2)" }}>
              {item.action}
              {item.path ? ` · ${item.path}` : ""}
            </span>
            <span className="text-[11px] flex-shrink-0" style={{ color: "var(--prv-text-3)" }}>
              {item.timeAgo}
            </span>
          </div>
        ))}
      </GlassCard>

      {anomalies.length > 0 && (
        <GlassCard className="mb-3.5">
          <SectionLabel>AI anomalies · {anomalies.length}</SectionLabel>
          {anomalies.map((a: SpecialistAnomalyItem) => {
            const s = SEVERITY_STYLES[a.severity] ?? SEVERITY_STYLES["low"]!
            return (
              <div
                key={a.id}
                className="flex items-center gap-3 py-2.5 border-b last:border-b-0"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                <span
                  className="text-[9px] font-bold px-2 py-0.5 rounded-[6px] flex-shrink-0 uppercase"
                  style={s}
                >
                  {a.severity}
                </span>
                <span className="flex-1 text-[13px]" style={{ color: "var(--prv-text-2)" }}>
                  {a.title}
                </span>
                <span className="text-[11px]" style={{ color: "var(--prv-text-3)" }}>
                  {a.timeAgo}
                </span>
              </div>
            )
          })}
        </GlassCard>
      )}
    </>
  )
}

function SupportContent({ roleData }: { roleData: SpecialistRoleData | null }) {
  const tickets = roleData?.supportTickets ?? []

  return (
    <GlassCard className="mb-3.5">
      <SectionLabel>Active tickets · {tickets.length}</SectionLabel>
      {tickets.length === 0 && (
        <p className="py-3 text-[13px]" style={{ color: "var(--prv-text-3)" }}>
          No open tickets
        </p>
      )}
      {tickets.map((t: SpecialistTicketItem) => (
        <div
          key={t.id}
          className="flex items-center gap-3 py-2.5 border-b last:border-b-0"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded-[6px] flex-shrink-0"
            style={PRIORITY_STYLES[t.priority] ?? PRIORITY_STYLES["P3"]}
          >
            {t.priority}
          </span>
          <span className="flex-1 text-[13px]" style={{ color: "var(--prv-text-2)" }}>
            {t.title}
          </span>
          <span className="text-[11px]" style={{ color: "var(--prv-text-3)" }}>
            {t.timeAgo}
          </span>
        </div>
      ))}
    </GlassCard>
  )
}

function SysadminContent({ roleData }: { roleData: SpecialistRoleData | null }) {
  const health = roleData?.systemHealth ?? [
    { label: "Database", status: "Connected", ok: true },
    { label: "Active sessions", status: "—", ok: true },
    { label: "Open anomalies", status: "—", ok: true },
    { label: "Audit log", status: "—", ok: true },
  ]

  return (
    <>
      <GlassCard className="mb-3.5">
        <SectionLabel>System health</SectionLabel>
        {health.map((item: SpecialistHealthItem) => (
          <div
            key={item.label}
            className="flex items-center justify-between py-2.5 border-b last:border-b-0"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                style={{ background: item.ok ? "rgba(80,220,120,0.90)" : "rgba(255,99,90,0.90)" }}
                aria-hidden="true"
              />
              <span className="text-[13px]" style={{ color: "var(--prv-text-2)" }}>
                {item.label}
              </span>
            </div>
            <span
              className="text-[11px]"
              style={{ color: item.ok ? "rgba(80,220,120,0.75)" : "rgba(255,99,90,0.75)" }}
            >
              {item.status}
            </span>
          </div>
        ))}
      </GlassCard>

      {roleData?.auditErrors && roleData.auditErrors.length > 0 && (
        <GlassCard className="mb-3.5">
          <SectionLabel>Recent access failures</SectionLabel>
          {roleData.auditErrors.map((e: SpecialistAuditErrorItem) => (
            <div
              key={e.id}
              className="flex items-center gap-3 py-2.5 border-b last:border-b-0"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              <span
                className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                style={{ background: "rgba(255,99,90,0.90)" }}
                aria-hidden="true"
              />
              <span
                className="flex-1 text-[13px] font-mono truncate"
                style={{ color: "var(--prv-text-2)" }}
              >
                {e.action}
              </span>
              <span className="text-[11px]" style={{ color: "var(--prv-text-3)" }}>
                {e.timeAgo}
              </span>
            </div>
          ))}
        </GlassCard>
      )}
    </>
  )
}

const ROLE_LABELS: Partial<Record<PRVSession["role"], string>> = {
  data_analyst: "Analytics",
  qa_tester: "QA",
  app_support_specialist: "Support",
  system_administrator: "System",
}

interface Props {
  session: PRVSession
}

export async function SpecialistDashboard({ session }: Props) {
  let ctx
  try {
    ctx = await cacheMemo(
      "specialist_ctx",
      `${session.userId}`,
      () => querySpecialistContext(session.userId, session.companyId),
      { ttl: 30 }
    )
  } catch {
    ctx = null
  }

  let roleData: SpecialistRoleData | null = null
  try {
    roleData = await cacheMemo(
      "specialist_role",
      `${session.userId}:${session.role}`,
      () => querySpecialistRoleData(session.role, session.companyId, session.userId),
      { ttl: 60 }
    )
  } catch {
    roleData = null
  }

  const firstName = ctx?.firstName ?? "there"
  const inboxCount = ctx?.inboxCount ?? 0
  const alertCount = ctx?.alertCount ?? 0
  const roleLabel = ROLE_LABELS[session.role] ?? "Workspace"
  const quickActions = resolveQuickActions(session.role)

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[13px] font-medium mb-0.5" style={{ color: "var(--prv-text-3)" }}>
            PRV
          </p>
          <h1
            className="text-[26px] font-semibold tracking-tight leading-tight"
            style={{ color: "var(--prv-text-1)" }}
          >
            {roleLabel}
          </h1>
        </div>
        {inboxCount > 0 && (
          <Link
            href="/notifications"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-medium"
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              color: "var(--prv-text-2)",
            }}
          >
            <span
              className="w-[18px] h-[18px] rounded-full text-[9px] font-bold flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.14)", color: "var(--prv-text-1)" }}
            >
              {inboxCount}
            </span>
            Inbox
          </Link>
        )}
      </div>

      {/* Greeting */}
      <DashboardGreeting name={firstName} />

      {/* Alerts */}
      {alertCount > 0 && (
        <InlineAlert
          type="warning"
          title={`${alertCount} item${alertCount === 1 ? "" : "s"} need your attention`}
        />
      )}

      {/* Role-specific content */}
      {session.role === "data_analyst" && <AnalystContent roleData={roleData} />}
      {session.role === "qa_tester" && <QAContent roleData={roleData} />}
      {session.role === "app_support_specialist" && <SupportContent roleData={roleData} />}
      {session.role === "system_administrator" && <SysadminContent roleData={roleData} />}

      {/* Quick Actions */}
      <QuickActionsGrid actions={quickActions} />
    </div>
  )
}
