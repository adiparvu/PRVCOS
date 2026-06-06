"use client"

import { useEffect, useRef } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { usePresenceStore } from "../store/presenceStore"
import type { PresenceMember } from "../store/presenceStore"

const HEARTBEAT_INTERVAL_MS = 30_000

interface UsePresenceOptions {
  companyId: string
  currentUserId?: string
  initialMembers?: PresenceMember[]
}

export function usePresence({ companyId, currentUserId, initialMembers }: UsePresenceOptions) {
  const { setMembers, upsertMember } = usePresenceStore()
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Seed store with SSR data
  useEffect(() => {
    if (initialMembers?.length) setMembers(initialMembers)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Initial fetch from REST (covers the gap before Realtime connects)
  useEffect(() => {
    async function fetchInitial() {
      const res = await fetch("/api/presence?limit=50", { credentials: "include" })
      if (!res.ok) return
      const { members } = (await res.json()) as { members: PresenceMember[] }
      setMembers(members)
    }
    void fetchInitial()
  }, [setMembers])

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    const channel = supabase
      .channel(`presence:${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence",
          filter: `company_id=eq.${companyId}`,
        },
        (payload: { eventType: string; new: unknown }) => {
          if (payload.eventType === "DELETE") return
          const row = payload.new as Record<string, unknown>
          upsertMember({
            userId: row["user_id"] as string,
            status: row["status"] as PresenceMember["status"],
            statusMessage: (row["status_message"] as string | null) ?? null,
            platform: (row["platform"] as string | null) ?? null,
            lastSeenAt: row["last_seen_at"] as string,
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [companyId, upsertMember])

  // Heartbeat — keeps own presence fresh
  useEffect(() => {
    async function sendHeartbeat() {
      await fetch("/api/presence", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "online",
          platform: "web",
          activeRoute: window.location.pathname,
        }),
      }).catch(() => null)
    }

    void sendHeartbeat()
    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }
  }, [currentUserId])
}
