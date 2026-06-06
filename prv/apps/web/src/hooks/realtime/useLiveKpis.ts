"use client"

import { useEffect, useState } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

export interface LiveKpis {
  revenue: string
  workforce: number
  activeProjects: number
  alerts: number
  pendingApprovals?: number
}

export function useLiveKpis(initial: LiveKpis, companyId: string, enabled = true): LiveKpis {
  const [kpis, setKpis] = useState<LiveKpis>(initial)

  useEffect(() => {
    if (!enabled) return

    async function refetch() {
      try {
        const res = await fetch("/api/dashboard/live-kpis", { credentials: "include" })
        if (!res.ok) return
        const data = (await res.json()) as LiveKpis
        setKpis(data)
      } catch {}
    }

    const supabase = createSupabaseBrowserClient()

    const channel = supabase
      .channel(`live-kpis:${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "invoices",
          filter: `company_id=eq.${companyId}`,
        },
        () => void refetch()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
          filter: `company_id=eq.${companyId}`,
        },
        () => void refetch()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "company_memberships",
          filter: `company_id=eq.${companyId}`,
        },
        () => void refetch()
      )
      .subscribe()

    // Safety-net polling every 60 s
    const interval = setInterval(refetch, 60_000)

    return () => {
      void supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [companyId, enabled])

  return kpis
}
