import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

export type IncidentSeverity = "low" | "medium" | "high" | "critical"
export type IncidentStatus = "open" | "investigating" | "resolved" | "closed"
export type InspectionStatus = "scheduled" | "in_progress" | "completed" | "overdue"

export interface SafetyIncident {
  id: string
  type: string
  title: string
  severity: IncidentSeverity
  status: IncidentStatus
  location: string
  date: string
}

export interface SafetyInspection {
  id: string
  title: string
  scheduledDate: string
  status: InspectionStatus
  score: number | null
  maxScore: number | null
}

export interface SafetyKpi {
  openIncidents: number
  critical: number
  overdueInspections: number
  nextInspection: string | null
}

export interface SafetyData {
  kpi: SafetyKpi
  incidents: SafetyIncident[]
  inspections: SafetyInspection[]
}

export function useSafety() {
  return useQuery<SafetyData>({
    queryKey: ["safety"],
    queryFn: () => api.get<SafetyData>("/api/mobile/safety"),
    staleTime: 60_000,
    retry: 2,
  })
}
