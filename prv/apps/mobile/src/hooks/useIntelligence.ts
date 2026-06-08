import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

export interface IntelligenceAlertItem {
  id: string
  severity: "red" | "amber"
  title: string
  timeAgo: string
}

export interface IntelligenceWeek {
  weekLabel: string
  total: number
  isProjected: boolean
}

export interface IntelligenceForecastDriver {
  label: string
  amountFormatted: string
  positive: boolean
}

export interface DayRevenue {
  date: string
  total: number
}

export interface IntelligenceData {
  aiBriefing: {
    summary: string
    insights: string[]
  } | null
  alerts: IntelligenceAlertItem[]
  analytics: {
    dailyRevenue30: DayRevenue[]
    monthlyRevenue: { label: string; total: number }[]
    collectionRate: number
    activeClients: number
    avgDealSizeFormatted: string
    projectsTotal: number
    deltaPercent: number | null
  }
  forecast: {
    monthEndFormatted: string
    confidence: number
    weeks: IntelligenceWeek[]
    drivers: IntelligenceForecastDriver[]
  }
}

export function useIntelligence() {
  return useQuery<IntelligenceData>({
    queryKey: ["intelligence"],
    queryFn: () => api.get<IntelligenceData>("/api/mobile/intelligence"),
    staleTime: 60_000,
    retry: 2,
  })
}
