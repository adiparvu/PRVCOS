/**
 * Pure logic for trusted devices and risk-based step-up (Phase 2). A device the
 * user marked trusted (after MFA) can skip the second factor at login for a
 * window; sensitive operations still require step-up re-auth, and always do so
 * on an untrusted device.
 */

export interface DeviceTrust {
  isTrusted: boolean
  trustExpiresAt: Date | null
}

/** Days a device stays trusted after the user opts in. */
export const DEVICE_TRUST_DAYS = 30

/** A device is trusted only while its (non-null) trust window is unexpired. */
export function isDeviceTrusted(device: DeviceTrust | null, now: Date): boolean {
  if (!device || !device.isTrusted || !device.trustExpiresAt) return false
  return device.trustExpiresAt.getTime() > now.getTime()
}

/** The expiry timestamp for a freshly trusted device. */
export function deviceTrustExpiry(now: Date, days: number = DEVICE_TRUST_DAYS): Date {
  return new Date(now.getTime() + days * 86_400_000)
}

/** MFA can be skipped at login only on a currently-trusted device. */
export function canSkipMfa(device: DeviceTrust | null, now: Date): boolean {
  return isDeviceTrusted(device, now)
}

/**
 * Whether a sensitive operation needs step-up re-auth right now. On an untrusted
 * device, step-up is always required; on a trusted device, only when the last
 * re-auth is no longer fresh.
 */
export function requiresStepUp(opts: { deviceTrusted: boolean; reauthFresh: boolean }): boolean {
  if (!opts.deviceTrusted) return true
  return !opts.reauthFresh
}
