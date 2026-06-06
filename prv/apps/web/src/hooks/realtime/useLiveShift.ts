"use client"

import { useEffect, useState } from "react"

export interface ShiftState {
  start: string
  end: string
  location: string
  progressPct: number
  remainingH: number
  remainingM: number
}

// Stub — replaced by Attendance module data when that module ships
const STUB_START_H = 9
const STUB_END_H = 17

export function useLiveShift(_userId: string, enabled = true): ShiftState {
  const [state, setState] = useState<ShiftState>({
    start: "09:00",
    end: "17:00",
    location: "Main Floor",
    progressPct: 0,
    remainingH: 0,
    remainingM: 0,
  })

  useEffect(() => {
    if (!enabled) return

    function tick() {
      const now = new Date()
      const nowMs = (now.getHours() * 60 + now.getMinutes()) * 60_000 + now.getSeconds() * 1_000
      const startMs = STUB_START_H * 3_600_000
      const endMs = STUB_END_H * 3_600_000
      const pct = Math.min(100, Math.max(0, ((nowMs - startMs) / (endMs - startMs)) * 100))
      const remMs = Math.max(0, endMs - nowMs)
      setState({
        start: "09:00",
        end: "17:00",
        location: "Main Floor",
        progressPct: Math.round(pct),
        remainingH: Math.floor(remMs / 3_600_000),
        remainingM: Math.floor((remMs % 3_600_000) / 60_000),
      })
    }

    tick()
    const t = setInterval(tick, 60_000)
    return () => clearInterval(t)
  }, [_userId, enabled])

  return state
}
