import { useMutation, useQueryClient } from "@tanstack/react-query"
import { mutateOrQueue } from "@/lib/offline-queue"

export type IncidentType =
  | "accident"
  | "near_miss"
  | "hazard"
  | "property_damage"
  | "environmental"
  | "security"

export type IncidentSeverity = "low" | "medium" | "high" | "critical"

export interface ReportIncidentInput {
  title: string
  description: string
  type: IncidentType
  severity: IncidentSeverity
  location?: string
  injuriesCount?: number
}

export function useReportIncident() {
  const qc = useQueryClient()
  return useMutation({
    // Offline-safe (P2.10): a report filed on a job site with no signal is
    // queued durably and replayed on reconnect — losing a near-miss report
    // is a compliance problem. incidentAt is stamped at filing time so the
    // replayed record keeps the moment the worker reported it.
    mutationFn: (input: ReportIncidentInput) =>
      mutateOrQueue<{ id: string; title: string }>({
        path: "/api/mobile/safety/incidents",
        method: "POST",
        body: { ...input, incidentAt: new Date().toISOString() },
        label: "Report incident",
      }),
    onSuccess: (result) => {
      if (!result.queued) void qc.invalidateQueries({ queryKey: ["safety-center"] })
    },
  })
}
