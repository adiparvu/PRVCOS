// Notification delivery gate — quiet hours, DND, channel toggles (roadmap 14.3).
// Pure + unit-tested. Critical priority always delivers; normal/low respect the
// user's channel prefs and quiet hours.

export type NotificationPriority = "critical" | "high" | "normal" | "low"
export type DeliveryChannel = "in_app" | "push" | "email" | "sms"

export interface DeliveryPrefs {
  inApp: boolean
  push: boolean
  email: boolean
  sms: boolean
  quietHoursStart: string | null // "HH:MM"
  quietHoursEnd: string | null // "HH:MM"
  doNotDisturb?: boolean
}

/** Parse "HH:MM" → minutes since midnight, or null if malformed. */
export function parseHHMM(v: string | null | undefined): number | null {
  if (!v) return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/**
 * Is `now` within the quiet-hours window? Handles windows that wrap past
 * midnight (e.g. 22:00 → 07:00). A window with equal start/end is treated as
 * empty (never quiet). Returns false if either bound is missing/malformed.
 */
export function isWithinQuietHours(start: string | null, end: string | null, now: string): boolean {
  const s = parseHHMM(start)
  const e = parseHHMM(end)
  const n = parseHHMM(now)
  if (s === null || e === null || n === null) return false
  if (s === e) return false
  if (s < e) return n >= s && n < e // same-day window
  return n >= s || n < e // wraps past midnight
}

const CHANNEL_PREF: Record<DeliveryChannel, keyof DeliveryPrefs> = {
  in_app: "inApp",
  push: "push",
  email: "email",
  sms: "sms",
}

// Channels muted while quiet hours / DND are active (in-app + email still land).
const INTERRUPTIVE: DeliveryChannel[] = ["push", "sms"]

/**
 * Should a notification be delivered on `channel` right now?
 * - Critical bypasses quiet hours and DND (but the channel must be enabled,
 *   except in-app which is always allowed for critical).
 * - Otherwise the channel toggle must be on, and interruptive channels are
 *   suppressed during quiet hours or DND.
 */
export function shouldDeliver(
  prefs: DeliveryPrefs,
  priority: NotificationPriority,
  channel: DeliveryChannel,
  now: string
): boolean {
  const enabled = prefs[CHANNEL_PREF[channel]] === true

  if (priority === "critical") {
    // Critical always reaches the user in-app; other channels still honor the toggle.
    return channel === "in_app" ? true : enabled
  }

  if (!enabled) return false

  const quiet =
    prefs.doNotDisturb === true ||
    isWithinQuietHours(prefs.quietHoursStart, prefs.quietHoursEnd, now)
  if (quiet && INTERRUPTIVE.includes(channel)) return false

  return true
}
