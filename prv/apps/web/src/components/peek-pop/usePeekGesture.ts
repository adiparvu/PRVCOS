"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import type { PeekState } from "./types"

interface UsePeekGestureOptions {
  onPeek: () => void
  onDismiss: () => void
  holdDuration?: number
  autoDissmissMs?: number
}

export function usePeekGesture({
  onPeek,
  onDismiss,
  holdDuration = 200,
  autoDissmissMs = 3000,
}: UsePeekGestureOptions) {
  const [state, setState] = useState<PeekState>("idle")
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startPos = useRef<{ x: number; y: number } | null>(null)
  const activePointerId = useRef<number | null>(null)

  const clearTimers = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current)
    if (autoTimer.current) clearTimeout(autoTimer.current)
    holdTimer.current = null
    autoTimer.current = null
  }, [])

  const dismiss = useCallback(() => {
    clearTimers()
    setState("dismissed")
    onDismiss()
    // Brief dismissed state so exit animations can play, then idle
    setTimeout(() => setState("idle"), 320)
  }, [clearTimers, onDismiss])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 && e.pointerType !== "touch") return
      if (state !== "idle") return
      activePointerId.current = e.pointerId
      startPos.current = { x: e.clientX, y: e.clientY }
      setState("holding")
      holdTimer.current = setTimeout(() => {
        setState("peeking")
        onPeek()
        autoTimer.current = setTimeout(dismiss, autoDissmissMs)
      }, holdDuration)
    },
    [state, holdDuration, autoDissmissMs, onPeek, dismiss]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (state !== "holding") return
      if (e.pointerId !== activePointerId.current) return
      if (!startPos.current) return
      const dist = Math.hypot(e.clientX - startPos.current.x, e.clientY - startPos.current.y)
      // Cancel if finger moved more than 5px before threshold
      if (dist > 5) {
        clearTimers()
        setState("idle")
      }
    },
    [state, clearTimers]
  )

  const handlePointerUp = useCallback(() => {
    if (state === "holding") {
      clearTimers()
      setState("idle")
    }
    // If already peeking, keep showing until auto-dismiss or explicit dismiss
  }, [state, clearTimers])

  useEffect(() => () => clearTimers(), [clearTimers])

  return {
    state,
    dismiss,
    pointerHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
    },
  }
}
