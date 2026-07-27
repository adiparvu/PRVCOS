import { Platform } from "react-native"
import * as Haptics from "expo-haptics"

// Semantic haptic vocabulary (design system: "every action has appropriate
// haptic feedback"). Central so call sites say WHAT happened, not which
// waveform to play. Every call is fire-and-forget and swallows errors —
// haptics must never affect behavior — and no-ops on web.

const enabled = Platform.OS === "ios" || Platform.OS === "android"

/** Light tick for selections: tab switches, pill toggles, steppers. */
export function hapticSelection(): void {
  if (!enabled) return
  void Haptics.selectionAsync().catch(() => {})
}

/** A mutation the user initiated completed. */
export function hapticSuccess(): void {
  if (!enabled) return
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
}

/** Something needs attention but did not fail (queued offline, validation). */
export function hapticWarning(): void {
  if (!enabled) return
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {})
}

/** A mutation failed. */
export function hapticError(): void {
  if (!enabled) return
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
}

/** Medium impact for consequential taps: primary CTAs, destructive confirms. */
export function hapticImpact(): void {
  if (!enabled) return
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
}
