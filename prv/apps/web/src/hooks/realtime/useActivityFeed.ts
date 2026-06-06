"use client"

import { useEffect, useState } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import type { ActivityEventPayload } from "@prv/cache"

const MAX_FEED = 20

export function useActivityFeed(
  initial: ActivityEventPayload[],
  companyId: string
): ActivityEventPayload[] {
  const [entries, setEntries] = useState<ActivityEventPayload[]>(initial)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    const channel = supabase
      .channel(`activity-feed:${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `company_id=eq.${companyId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new
          const entry: ActivityEventPayload = {
            id: row["id"] as string,
            type: mapType(row["type"] as string),
            title: (row["title"] as string) ?? "New activity",
            description: (row["body"] as string | null) ?? undefined,
            timestamp: "just now",
            actorId: (row["actor_id"] as string | null) ?? undefined,
          }
          setEntries((prev) => [entry, ...prev].slice(0, MAX_FEED))
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [companyId])

  return entries
}

function mapType(type: string): ActivityEventPayload["type"] {
  if (type === "error") return "error"
  if (type === "warning") return "warning"
  if (type === "success") return "success"
  return "info"
}
