"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { LiveShiftResponse } from "@/app/api/me/shift/route"

export interface ShiftState {
  start: string
  end: string
  location: string
  progressPct: number
  remainingH: number
  remainingM: number
  hasShift: boolean
  isClockedIn: boolean
  isClockedOut: boolean
}

const DEFAULT_STATE: ShiftState = {
  start: "--:--",
  end: "--:--",
  location: "",
  progressPct: 0,
  remainingH: 0,
  remainingM: 0,
  hasShift: false,
  isClockedIn: false,
  isClockedOut: false,
}

function timeToMs(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return ((h ?? 0) * 60 + (m ?? 0)) * 60_000
}

function computeProgress(
  start: string,
  end: string,
  clockIn: string | null
): ShiftState["progressPct"] & number {
  const now = new Date()
  const nowMs = (now.getHours() * 60 + now.getMinutes()) * 60_000
  const ref = clockIn ? new Date(clockIn) : null
  const refMs = ref ? (ref.getHours() * 60 + ref.getMinutes()) * 60_000 : nowMs
  const startMs = timeToMs(start)
  const endMs = timeToMs(end)
  if (endMs <= startMs) return 0
  return Math.min(
    100,
    Math.max(
      0,
      Math.round((((refMs > startMs ? nowMs : refMs) - startMs) / (endMs - startMs)) * 100)
    )
  )
}

function computeRemaining(end: string): { h: number; m: number } {
  const now = new Date()
  const nowMs = (now.getHours() * 60 + now.getMinutes()) * 60_000
  const endMs = timeToMs(end)
  const remMs = Math.max(0, endMs - nowMs)
  return { h: Math.floor(remMs / 3_600_000), m: Math.floor((remMs % 3_600_000) / 60_000) }
}

export function useLiveShift(userId: string, enabled = true): ShiftState & { refetch: () => void } {
  const [raw, setRaw] = useState<LiveShiftResponse | null>(null)
  const [state, setState] = useState<ShiftState>(DEFAULT_STATE)
  const [nonce, setNonce] = useState(0)
  const refetch = useCallback(() => setNonce((n) => n + 1), [])

  // Fetch shift data from the API, refresh every 2 minutes
  useEffect(() => {
    if (!enabled || !userId) return
    let cancelled = false

    async function fetchShift() {
      try {
        const res = await fetch("/api/me/shift", { cache: "no-store" })
        if (!res.ok) return
        const data = (await res.json()) as LiveShiftResponse
        if (!cancelled) setRaw(data)
      } catch {
        // network error — keep previous state
      }
    }

    void fetchShift()
    const interval = setInterval(() => void fetchShift(), 2 * 60_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [userId, enabled, nonce])

  // Recompute progress every minute using cached raw data
  useEffect(() => {
    if (!enabled) return

    function tick() {
      if (!raw?.hasShift) {
        setState(DEFAULT_STATE)
        return
      }
      const start = raw.scheduledStart ?? "09:00"
      const end = raw.scheduledEnd ?? "17:00"
      const rem = computeRemaining(end)
      setState({
        start,
        end,
        location: raw.location ?? "",
        progressPct: computeProgress(start, end, raw.clockIn),
        remainingH: rem.h,
        remainingM: rem.m,
        hasShift: true,
        isClockedIn: !!raw.clockIn && !raw.clockOut,
        isClockedOut: !!raw.clockOut,
      })
    }

    tick()
    const t = setInterval(tick, 60_000)
    return () => clearInterval(t)
  }, [raw, enabled])

  return useMemo(() => ({ ...state, refetch }), [state, refetch])
}
