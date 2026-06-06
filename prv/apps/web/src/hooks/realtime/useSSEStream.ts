"use client"

import { useEffect, useRef, useState } from "react"
import type { RealtimeEvent } from "@prv/cache"

interface UseSSEStreamOptions {
  channels: string[]
  onEvent: (event: RealtimeEvent) => void
  enabled?: boolean
}

const KNOWN_EVENTS = [
  "kpi.update",
  "notification.count",
  "activity.event",
  "shift.update",
  "store.update",
]

export function useSSEStream({ channels, onEvent, enabled = true }: UseSSEStreamOptions): boolean {
  const [connected, setConnected] = useState(false)
  const esRef = useRef<EventSource | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptsRef = useRef(0)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    if (!enabled || channels.length === 0) return

    function connect() {
      const params = new URLSearchParams({ channels: channels.join(",") })
      const es = new EventSource(`/api/realtime/stream?${params}`, { withCredentials: true })
      esRef.current = es

      es.addEventListener("connected", () => {
        setConnected(true)
        attemptsRef.current = 0
      })

      for (const type of KNOWN_EVENTS) {
        es.addEventListener(type, (e) => {
          try {
            onEventRef.current(JSON.parse((e as MessageEvent).data as string) as RealtimeEvent)
          } catch {}
        })
      }

      es.addEventListener("error", () => {
        setConnected(false)
        es.close()
        esRef.current = null
        const delay = Math.min(2_000 * 2 ** attemptsRef.current, 30_000)
        attemptsRef.current += 1
        timerRef.current = setTimeout(connect, delay)
      })
    }

    connect()

    return () => {
      esRef.current?.close()
      esRef.current = null
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabled, channels.join(",")]) // eslint-disable-line react-hooks/exhaustive-deps

  return connected
}
