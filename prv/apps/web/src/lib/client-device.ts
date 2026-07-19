"use client"

// A stable, per-browser device identifier persisted in localStorage. Sent as the
// `x-device-id` header so the server can recognise a "remembered" device and skip
// MFA within the trust window. It is an opaque UUID — it carries no PII and grants
// nothing on its own; trust is always established server-side after a full login.

const KEY = "prv_device_id"

function makeUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  // Fallback for older browsers without crypto.randomUUID.
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] ?? 0) & 15
    const v = c === "0" ? r : c === "1" ? (r & 0x3) | 0x8 : r & 0xf
    return v.toString(16)
  })
}

// Returns the current browser's device id, creating and persisting one on first use.
export function getClientDeviceId(): string {
  if (typeof window === "undefined") return ""
  try {
    let id = window.localStorage.getItem(KEY)
    if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
      id = makeUuid()
      window.localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    // Private mode / storage disabled: fall back to a per-session id.
    return makeUuid()
  }
}
