import { cacheMemo } from "@prv/cache"
import { querySpecialistContext } from "@prv/db"
import type { PRVSession } from "@prv/auth"
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting"
import { resolveQuickActions } from "@/lib/quick-actions"
import { GlassCard, SectionLabel, QuickActionsGrid, InlineAlert } from "../_shared"
import Link from "next/link"

const ANALYST_REPORTS = [
  { label: "Revenue by store · Jun 2026", updated: "2m ago", href: "/intelligence" },
  { label: "Margin trend · Q2 2026", updated: "1h ago", href: "/intelligence" },
  { label: "Workforce forecast · Jul", updated: "Draft", href: "/intelligence" },
]

const QA_ITEMS = [
  { label: "Login flow regression", severity: "high", status: "Open" },
  { label: "Search result ranking bug", severity: "med", status: "In Review" },
  { label: "PDF export encoding issue", severity: "low", status: "Open" },
]

const SUPPORT_TICKETS = [
  { label: "User can't reset password", priority: "P1", age: "2h" },
  { label: "Invoice PDF blank page", priority: "P2", age: "4h" },
  { label: "Schedule shows wrong timezone", priority: "P3", age: "1d" },
]

const SYSADMIN_ITEMS = [
  { label: "API gateway", status: "Healthy", ok: true },
  { label: "Database replicas", status: "Synced", ok: true },
  { label: "Redis cluster", status: "Healthy", ok: true },
  { label: "Background jobs", status: "3 queued", ok: true },
]

const SEVERITY_STYLES: Record<string, { bg: string; color: string }> = {
  high: { bg: "rgba(255,59,48,0.14)", color: "rgba(255,99,90,0.90)" },
  med: { bg: "rgba(255,159,10,0.14)", color: "rgba(255,179,64,0.90)" },
  low: { bg: "rgba(48,209,88,0.14)", color: "rgba(80,220,120,0.90)" },
}

function AnalystContent() {
  return (
    <>
      <GlassCard className="mb-3.5">
        <SectionLabel>Pinned reports</SectionLabel>
        {ANALYST_REPORTS.map((r) => (
          <Link
            key={r.label}
            href={r.href}
            className="flex items-center justify-between py-2.5 border-b last:border-b-0"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <span className="text-[13px]" style={{ color: "var(--prv-text-2)" }}>
              {r.label}
            </span>
            <span className="text-[11px]" style={{ color: "var(--prv-text-3)" }}>
              {r.updated}
            </span>
          </Link>
        ))}
      </GlassCard>

      <div className="grid grid-cols-2 gap-3 mb-3.5">
        <GlassCard>
          <p
            className="text-[11px] font-semibold uppercase tracking-widest mb-1"
            style={{ color: "var(--prv-text-3)" }}
          >
            Events/min
          </p>
          <p
            className="text-[24px] font-bold tracking-tight"
            style={{ color: "var(--prv-text-1)" }}
          >
            4.2K
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(80,220,120,0.85)" }}>
            ↑ normal
          </p>
        </GlassCard>
        <GlassCard>
          <p
            className="text-[11px] font-semibold uppercase tracking-widest mb-1"
            style={{ color: "var(--prv-text-3)" }}
          >
            Freshness
          </p>
          <p
            className="text-[24px] font-bold tracking-tight"
            style={{ color: "var(--prv-text-1)" }}
          >
            99.8%
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(80,220,120,0.85)" }}>
            ↑ SLA met
          </p>
        </GlassCard>
      </div>
    </>
  )
}

function QAContent() {
  return (
    <GlassCard className="mb-3.5">
      <SectionLabel>Open bugs · {QA_ITEMS.length}</SectionLabel>
      {QA_ITEMS.map((item) => {
        const s = SEVERITY_STYLES[item.severity] ?? SEVERITY_STYLES["low"]!
        return (
          <div
            key={item.label}
            className="flex items-center gap-3 py-2.5 border-b last:border-b-0"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-[6px] flex-shrink-0"
              style={s}
            >
              {item.severity.toUpperCase()}
            </span>
            <span className="flex-1 text-[13px]" style={{ color: "var(--prv-text-2)" }}>
              {item.label}
            </span>
            <span className="text-[11px]" style={{ color: "var(--prv-text-3)" }}>
              {item.status}
            </span>
          </div>
        )
      })}
    </GlassCard>
  )
}

function SupportContent() {
  return (
    <GlassCard className="mb-3.5">
      <SectionLabel>Active tickets · {SUPPORT_TICKETS.length}</SectionLabel>
      {SUPPORT_TICKETS.map((t) => (
        <div
          key={t.label}
          className="flex items-center gap-3 py-2.5 border-b last:border-b-0"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded-[6px] flex-shrink-0"
            style={
              t.priority === "P1"
                ? SEVERITY_STYLES["high"]
                : t.priority === "P2"
                  ? SEVERITY_STYLES["med"]
                  : SEVERITY_STYLES["low"]
            }
          >
            {t.priority}
          </span>
          <span className="flex-1 text-[13px]" style={{ color: "var(--prv-text-2)" }}>
            {t.label}
          </span>
          <span className="text-[11px]" style={{ color: "var(--prv-text-3)" }}>
            {t.age}
          </span>
        </div>
      ))}
    </GlassCard>
  )
}

function SysadminContent() {
  return (
    <GlassCard className="mb-3.5">
      <SectionLabel>System health</SectionLabel>
      {SYSADMIN_ITEMS.map((item) => (
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
      {session.role === "data_analyst" && <AnalystContent />}
      {session.role === "qa_tester" && <QAContent />}
      {session.role === "app_support_specialist" && <SupportContent />}
      {session.role === "system_administrator" && <SysadminContent />}

      {/* Quick Actions */}
      <QuickActionsGrid actions={quickActions} />
    </div>
  )
}
