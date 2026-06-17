import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

export type RenovationStatus =
  | "planning"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "cancelled"

export type RenovationPriority = "low" | "medium" | "high" | "urgent"

export interface RenovationProject {
  id: string
  projectCode: string | null
  title: string
  status: RenovationStatus
  priority: RenovationPriority | null
  projectType: string | null
  estimatedValue: number | null
  contractedValue: number | null
  currency: string | null
  completionPercentage: number | null
  estimatedStartDate: string | null
  estimatedEndDate: string | null
  city: string | null
  clientName: string | null
  projectManagerName: string | null
}

export interface RenovationListData {
  projects: RenovationProject[]
  nextCursor: string | null
}

export function useRenovation(params?: { status?: RenovationStatus }) {
  const search = new URLSearchParams()
  if (params?.status) search.set("status", params.status)
  const qs = search.toString()

  return useQuery<RenovationListData>({
    queryKey: ["renovation", params],
    queryFn: () =>
      api.get<RenovationListData>(`/api/mobile/renovation/projects${qs ? `?${qs}` : ""}`),
    staleTime: 60_000,
    retry: 2,
  })
}
