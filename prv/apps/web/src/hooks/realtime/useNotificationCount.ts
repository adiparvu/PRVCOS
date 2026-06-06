"use client"

import { useEffect, useState } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

export function useNotificationCount(initial: number, userId: string, companyId: string): number {
  const [count, setCount] = useState(initial)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    const channel = supabase
      .channel(`notif-count:${userId}:${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new
          if (!row["is_read"] && !row["is_dismissed"]) {
            setCount((c) => c + 1)
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => {
          const wasUnread = !payload.old["is_read"] && !payload.old["is_dismissed"]
          const nowRead = payload.new["is_read"] || payload.new["is_dismissed"]
          if (wasUnread && nowRead) setCount((c) => Math.max(0, c - 1))
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, companyId])

  return count
}
