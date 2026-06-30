"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { GlassStatCard, GlassAreaChart } from "@prv/ui"
import { useGroups, useGroupRollup } from "@/lib/api-hooks"
import { eurK } from "@/lib/metrics-helpers"
import { CreateGroupSheet } from "./CreateGroupSheet"

// ── CSS variable shorthands (Liquid Glass tokens) ─────────────────────────────
const g1 = "var(--prv-g1)"
const g2 = "var(--prv-g2)"
const t1 = "var(--prv-text-1)"
const t3 = "var(--prv-text-3)"
const bds = "var(--prv-border-subtle)"

const PERIODS: { id: string; label: string }[] = [
  { id: "1w", label: "1W" },
  { id: "1m", label: "1M" },
  { id: "qtd", label: "QTD" },
  { id: "ytd", label: "YTD" },
]

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mx-1 mt-6 mb-2.5">
      {children}
    </p>
  )
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function GroupRollupWorkspace() {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { data: groupsData } = useGroups()
  const groups = groupsData?.groups ?? []

  const [showCreate, setShowCreate] = useState(searchParams.get("new") === "1")
  const handleCreated = (newId: string) => {
    void queryClient.invalidateQueries({ queryKey: ["groups"] })
    setActiveId(newId)
    setShowCreate(false)
  }

  const [activeId, setActiveId] = useState<string | null>(null)
  // Default to the first group once the list loads (render-time seed).
  const groupId = activeId ?? groups[0]?.id ?? null

  const [period, setPeriod] = useState("qtd")
  const { data, isLoading } = useGroupRollup(groupId, period)
  const kpis = data?.kpis
  const breakdown = data?.breakdown ?? []
  const trend = data?.trend ?? { labels: [], revenue: [] }

  const revenueLabel = kpis ? eurK(Number(kpis.totalRevenue)) : "—"

  return (
    <div className="px-4 pb-32">
      {/* Header */}
      <div className="pt-7 pb-2">
        <p
          className="text-[12px] font-semibold uppercase tracking-widest mb-1.5"
          style={{ color: t3 }}
        >
          Command · Group Rollup
        </p>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[30px] font-semibold tracking-tight" style={{ color: t1 }}>
            {data?.group.name ?? "Group"}
          </h1>
          <div className="flex items-center gap-2">
            {kpis && (
              <span
                className="inline-flex items-center px-3.5 py-2 rounded-full text-[13px] font-semibold"
                style={{ background: g1, border: `1px solid ${bds}`, color: "var(--prv-text-2)" }}
              >
                {kpis.companiesIncluded} {kpis.companiesIncluded === 1 ? "company" : "companies"}
              </span>
            )}
            {groupId && (
              <Link
                href={`/groups/manage?group=${groupId}`}
                aria-label="Manage group"
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: g1, border: `1px solid ${bds}` }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--prv-text-2)"
                  strokeWidth="2"
                  className="w-[17px] h-[17px]"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path
                    d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            )}
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              aria-label="New group"
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: g1, border: `1px solid ${bds}` }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--prv-text-2)"
                strokeWidth="2.2"
                className="w-[17px] h-[17px]"
              >
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Group switcher — only when the user can see more than one group */}
        {groups.length > 1 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {groups.map((g) => {
              const on = g.id === groupId
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setActiveId(g.id)}
                  className="px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold transition-colors"
                  style={{
                    background: on ? "rgba(255,255,255,0.92)" : g1,
                    color: on ? "#000" : t3,
                    border: `1px solid ${bds}`,
                  }}
                >
                  {g.name}
                </button>
              )
            })}
          </div>
        )}

        {/* Period selector */}
        <div
          className="inline-flex gap-0.5 mt-3.5 p-[3px] rounded-full"
          style={{ background: g1, border: `1px solid ${bds}` }}
        >
          {PERIODS.map((p) => {
            const on = p.id === period
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className="px-4 py-1.5 rounded-full text-[12.5px] font-semibold transition-colors"
                style={{
                  background: on ? "rgba(255,255,255,0.92)" : "transparent",
                  color: on ? "#000" : t3,
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* CEO 60-second KPIs */}
      <Label>CEO 60-Second · All Companies</Label>
      <div className="grid grid-cols-2 gap-3">
        <GlassStatCard
          label="Total Revenue"
          value={isLoading ? "…" : revenueLabel}
          trend={trend.revenue.length > 1 ? { direction: "up", value: "this month" } : undefined}
          sparkline={trend.revenue}
        />
        <GlassStatCard
          label="Active Projects"
          value={isLoading ? "…" : String(kpis?.totalActiveProjects ?? 0)}
        />
        <GlassStatCard
          label="Active Employees"
          value={isLoading ? "…" : String(kpis?.totalActiveEmployees ?? 0)}
        />
        <GlassStatCard
          label="Open Alerts"
          value={isLoading ? "…" : String(kpis?.totalOpenAlerts ?? 0)}
          trend={
            (kpis?.totalOpenAlerts ?? 0) > 0
              ? { direction: "down", value: "need review" }
              : undefined
          }
        />
      </div>

      {/* Group revenue trend (nightly snapshots) */}
      {trend.revenue.length > 0 && (
        <>
          <Label>Group Revenue · Snapshot Trend</Label>
          <div
            className="rounded-[24px] p-4"
            style={{ background: g1, border: `1px solid ${bds}` }}
          >
            <GlassAreaChart
              series={[{ label: "Revenue", data: trend.revenue }]}
              labels={trend.labels}
              height={170}
              animated
            />
          </div>
        </>
      )}

      {/* Per-company breakdown */}
      {breakdown.length > 0 && (
        <>
          <Label>Per-Company Breakdown · Share of Revenue</Label>
          <div
            className="rounded-[22px] overflow-hidden"
            style={{ background: g1, border: `1px solid ${bds}` }}
          >
            {breakdown.map((c, i) => (
              <div
                key={c.companyId}
                className="flex items-center gap-3 px-4 py-3.5"
                style={{
                  borderBottom: i < breakdown.length - 1 ? `1px solid ${bds}` : "none",
                }}
              >
                <div
                  className="w-9 h-9 rounded-[12px] flex items-center justify-center flex-shrink-0 text-[13px] font-bold"
                  style={{ background: g2, color: t1 }}
                >
                  {initials(c.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold truncate" style={{ color: t1 }}>
                    {c.name}
                  </div>
                  <div className="text-[11.5px] mt-0.5" style={{ color: t3 }}>
                    {c.activeProjects} projects · {c.headcount} staff
                  </div>
                  <div
                    className="h-[5px] rounded-full overflow-hidden mt-2"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${c.share}%`, background: "rgba(255,255,255,0.85)" }}
                    />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[14px] font-bold" style={{ color: t1 }}>
                    {eurK(c.revenue)}
                  </div>
                  <div className="text-[11px] font-semibold mt-0.5" style={{ color: t3 }}>
                    {c.share}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty state — user not in a group, or no data yet */}
      {!isLoading && !kpis && (
        <div
          className="rounded-[22px] p-6 mt-6 text-center"
          style={{ background: g1, border: `1px solid ${bds}` }}
        >
          <p className="text-[13px]" style={{ color: t3 }}>
            No group rollup available for your account.
          </p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold"
            style={{ background: "rgba(255,255,255,0.92)", color: "#000" }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#000"
              strokeWidth="2.4"
              className="w-3.5 h-3.5"
            >
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            New Group
          </button>
        </div>
      )}

      <CreateGroupSheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}
