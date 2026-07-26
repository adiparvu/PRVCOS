import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { mutateOrQueue } from "@/lib/offline-queue"

export interface MyAttendanceRecord {
  id: string
  date: string
  status: string
  clockIn: string | null
  clockOut: string | null
  lateMinutes: number | null
}

interface MyAttendanceResponse {
  record: MyAttendanceRecord | null
  date: string
}

export function useMyAttendance() {
  return useQuery<MyAttendanceResponse>({
    queryKey: ["my-attendance"],
    queryFn: () => api.get<MyAttendanceResponse>("/api/mobile/attendance/clock"),
    staleTime: 30_000,
    retry: 2,
  })
}

export function useClockMutation() {
  const qc = useQueryClient()
  return useMutation({
    // Offline-safe (P2.10): a clock on a job site with no signal is queued
    // durably and replayed on reconnect — losing it is a payroll problem.
    mutationFn: (action: "in" | "out") =>
      mutateOrQueue<MyAttendanceRecord>({
        path: "/api/mobile/attendance/clock",
        method: "POST",
        body: { action },
        label: action === "in" ? "Clock in" : "Clock out",
      }),
    onSuccess: (result, action) => {
      if (result.queued) {
        // No server truth yet — reflect the intent locally so the card (and
        // the persisted cache) match what will be replayed. The server remains
        // authoritative for status/lateMinutes once the queue flushes.
        const nowIso = new Date().toISOString()
        qc.setQueryData<MyAttendanceResponse>(["my-attendance"], (old) => {
          const base: MyAttendanceRecord = old?.record ?? {
            id: "pending-sync",
            date: old?.date ?? nowIso.slice(0, 10),
            status: "present",
            clockIn: null,
            clockOut: null,
            lateMinutes: null,
          }
          const record: MyAttendanceRecord =
            action === "in"
              ? { ...base, clockIn: nowIso }
              : { ...base, clockOut: nowIso, status: "clocked_out" }
          return { date: base.date, record }
        })
        return
      }
      qc.setQueryData<MyAttendanceResponse>(["my-attendance"], (old) => ({
        date: old?.date ?? result.data.date,
        record: result.data,
      }))
      void qc.invalidateQueries({ queryKey: ["people"] })
    },
  })
}
