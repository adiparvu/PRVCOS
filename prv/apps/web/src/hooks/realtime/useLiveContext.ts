"use client"

import { useEffect, useState } from "react"
import type { SystemRole } from "@prv/auth"

export interface LiveContext {
  primary: string
  secondary?: string
  indicator?: "normal" | "warning" | "critical"
}

// Roles that show live revenue + alert indicator in the DI
const KPI_ROLES = new Set<SystemRole>([
  "group_ceo",
  "ceo",
  "co_ceo",
  "department_head",
  "oms",
  "operations_manager",
  "hr_payroll",
  "project_oms",
  "project_operations_manager",
  "project_director",
  "store_manager",
  "shop_director",
])

// Roles that show live shift countdown
const SHIFT_ROLES = new Set<SystemRole>([
  "worker",
  "team_leader",
  "project_worker",
  "project_team_leader",
  "seller",
])

interface UseLiveContextOptions {
  role: SystemRole
  diLabel: string
  companyId: string
  userId: string
}

export function useLiveContext({
  role,
  diLabel,
  companyId,
  userId,
}: UseLiveContextOptions): LiveContext {
  const [ctx, setCtx] = useState<LiveContext>({ primary: diLabel, indicator: "normal" })

  useEffect(() => {
    if (KPI_ROLES.has(role)) {
      async function fetchKpis() {
        try {
          const res = await fetch("/api/dashboard/live-kpis", { credentials: "include" })
          if (!res.ok) return
          const data = (await res.json()) as {
            revenue: string
            alerts: number
          }
          const revNum = parseFloat(data.revenue)
          const revStr =
            revNum >= 1_000_000
              ? `€${(revNum / 1_000_000).toFixed(1)}M`
              : revNum >= 1_000
                ? `€${Math.round(revNum / 1_000)}K`
                : `€${Math.round(revNum)}`
          const alerts = data.alerts ?? 0
          setCtx({
            primary: `${diLabel} · ${revStr}`,
            secondary: alerts > 0 ? `${alerts} alert${alerts === 1 ? "" : "s"}` : undefined,
            indicator: alerts > 0 ? "warning" : "normal",
          })
        } catch {}
      }
      void fetchKpis()
      const t = setInterval(fetchKpis, 30_000)
      return () => clearInterval(t)
    }

    if (SHIFT_ROLES.has(role)) {
      function tickShift() {
        const now = new Date()
        const nowMs = (now.getHours() * 60 + now.getMinutes()) * 60_000
        const endMs = 17 * 3_600_000
        const remMs = Math.max(0, endMs - nowMs)
        const h = Math.floor(remMs / 3_600_000)
        const m = Math.floor((remMs % 3_600_000) / 60_000)
        setCtx({
          primary: remMs > 0 ? `${diLabel} · ${h}h ${m}m` : diLabel,
          indicator: "normal",
        })
      }
      tickShift()
      const t = setInterval(tickShift, 60_000)
      return () => clearInterval(t)
    }

    // Specialist / analyst / sysadmin: show notification count
    async function fetchNotifCount() {
      try {
        const res = await fetch(
          `/api/notifications/count?userId=${userId}&companyId=${companyId}`,
          { credentials: "include" }
        )
        if (!res.ok) return
        const { count } = (await res.json()) as { count: number }
        setCtx({
          primary: diLabel,
          secondary: count > 0 ? `${count} new` : undefined,
          indicator: count > 5 ? "warning" : "normal",
        })
      } catch {
        setCtx({ primary: diLabel, indicator: "normal" })
      }
    }
    void fetchNotifCount()
    const t = setInterval(fetchNotifCount, 30_000)
    return () => clearInterval(t)
  }, [role, diLabel, companyId, userId])

  return ctx
}
