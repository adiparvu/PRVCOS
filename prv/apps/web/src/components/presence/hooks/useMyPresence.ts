"use client"

import { useState, useCallback } from "react"
import type { PresenceStatus } from "../PresenceDot"

interface SetStatusOptions {
  status: PresenceStatus
  message?: string
  clearAfterMinutes?: number
}

interface MyPresenceState {
  isLoading: boolean
  error: string | null
}

export function useMyPresence() {
  const [state, setState] = useState<MyPresenceState>({ isLoading: false, error: null })

  const setStatus = useCallback(async (opts: SetStatusOptions) => {
    setState({ isLoading: true, error: null })
    try {
      const expiresAt = opts.clearAfterMinutes
        ? new Date(Date.now() + opts.clearAfterMinutes * 60 * 1000).toISOString()
        : undefined

      const res = await fetch("/api/presence/override", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: opts.status,
          statusMessage: opts.message ?? null,
          isManualOverride: true,
          manualOverrideExpiresAt: expiresAt,
        }),
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        setState({ isLoading: false, error: err.error ?? "Failed to set status" })
        return false
      }

      setState({ isLoading: false, error: null })
      return true
    } catch {
      setState({ isLoading: false, error: "Network error" })
      return false
    }
  }, [])

  const clearStatus = useCallback(async () => {
    return setStatus({ status: "online" })
  }, [setStatus])

  return { ...state, setStatus, clearStatus }
}
