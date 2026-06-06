"use client"

import { GlassStatCard } from "@prv/ui"
import { useLiveKpis } from "@/hooks/realtime"
import type { LiveKpis } from "@/hooks/realtime"
import { formatCurrency } from "../_shared"

const SPARK = {
  revenue: [30, 34, 32, 40, 38, 44, 48],
  workforce: [20, 20, 18, 19, 17, 18, 16],
  projects: [24, 22, 24, 20, 21, 26, 28],
  tasks: [22, 20, 18, 16, 15, 14, 13],
}

interface Props {
  initial: LiveKpis
  companyId: string
  variant: "executive" | "manager"
}

export function LiveKpiGrid({ initial, companyId, variant }: Props) {
  const kpis = useLiveKpis(initial, companyId)

  if (variant === "executive") {
    return (
      <div className="grid grid-cols-2 gap-3 mb-3.5">
        <GlassStatCard
          label="Revenue"
          value={formatCurrency(kpis.revenue)}
          trend={{ direction: "up", value: "12.4%" }}
          sparkline={SPARK.revenue}
        />
        <GlassStatCard
          label="Profit"
          value="€138K"
          trend={{ direction: "up", value: "8.1%" }}
          sparkline={SPARK.workforce}
        />
        <GlassStatCard
          label="Active Projects"
          value={String(kpis.activeProjects)}
          trend={{ direction: "up", value: "6 new" }}
          sparkline={SPARK.projects}
        />
        <GlassStatCard
          label="Workforce"
          value={String(kpis.workforce)}
          trend={{ direction: "flat", value: "online" }}
          sparkline={SPARK.workforce}
        />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 mb-3.5">
      <GlassStatCard
        label="Revenue MTD"
        value={formatCurrency(kpis.revenue)}
        trend={{ direction: "up", value: "vs last month" }}
        sparkline={SPARK.revenue}
      />
      <GlassStatCard
        label="Workforce"
        value={String(kpis.workforce)}
        trend={{ direction: "flat", value: "active" }}
        sparkline={SPARK.workforce}
      />
      <GlassStatCard
        label="Active Projects"
        value={String(kpis.activeProjects)}
        trend={{ direction: "up", value: "on track" }}
        sparkline={SPARK.projects}
      />
      <GlassStatCard
        label="Open Tasks"
        value="13"
        trend={{ direction: "down", value: "9 done today" }}
        sparkline={SPARK.tasks}
      />
    </div>
  )
}
