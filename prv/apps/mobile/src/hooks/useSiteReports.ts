import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { mutateOrQueue } from "@/lib/offline-queue"

export interface SiteReport {
  id: string
  reportDate: string
  reportType: string
  workPerformed: string | null
  issuesEncountered: string | null
  workersOnSite: number
  clientVisible: boolean
  photos: string[]
}

export interface SiteReportsResponse {
  /** false when the core project has no renovation bridge — actions stay disabled */
  renovation: boolean
  reports: SiteReport[]
}

export function useSiteReports(projectId: string | undefined) {
  return useQuery<SiteReportsResponse>({
    queryKey: ["site-reports", projectId],
    queryFn: () => api.get<SiteReportsResponse>(`/api/mobile/projects/${projectId}/site-reports`),
    enabled: !!projectId,
    staleTime: 30_000,
    retry: 2,
  })
}

export interface LogSiteUpdateInput {
  workPerformed: string
  issuesEncountered?: string
  workersOnSite?: number
  completionDelta?: number
  weatherConditions?: string
  clientVisible?: boolean
}

export function useLogSiteUpdate(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    // Offline-safe: a report written on a no-signal site is queued durably.
    // reportDate is stamped when the foreman writes it, so a report replayed
    // the next morning still belongs to the day the work happened.
    mutationFn: (input: LogSiteUpdateInput) =>
      mutateOrQueue<{ id: string; reportDate: string }>({
        path: `/api/mobile/projects/${projectId}/site-reports`,
        method: "POST",
        body: { ...input, reportDate: new Date().toISOString().slice(0, 10) },
        label: "Log site update",
      }),
    onSuccess: (result) => {
      if (!result.queued) void qc.invalidateQueries({ queryKey: ["site-reports", projectId] })
    },
  })
}
