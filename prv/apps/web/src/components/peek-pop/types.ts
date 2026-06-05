"use client"

export type PeekState = "idle" | "holding" | "peeking" | "dismissed"

export interface PeekPopContainerProps {
  entityType: string
  entityId: string
  /** Shown immediately in the peek card without a network round-trip */
  name?: string
  avatarUrl?: string | null
  /** Called when the user "pops" (lifts or swipes up from peek) */
  onPop?: () => void
  children: React.ReactNode
  /** Disable peek interaction (e.g. when entity type has no preview permission) */
  disabled?: boolean
}
