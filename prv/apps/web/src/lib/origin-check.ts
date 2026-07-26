// CSRF origin verification for state-changing API requests.
//
// Browsers attach an Origin header to every cross-origin (and same-origin
// non-GET) request, and it cannot be forged from a page. Native apps, curl and
// server-to-server calls typically send none — those are not CSRF vectors,
// because CSRF is specifically an attack that rides a browser's ambient
// cookies. So the rule is: no Origin → allow; Origin present → it must match
// the request's own host or the configured allow-list.

const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"])

export function isStateChanging(method: string): boolean {
  return STATE_CHANGING.has(method.toUpperCase())
}

/**
 * @param origin   value of the Origin header (null when absent)
 * @param host     value of the Host header for this request
 * @param allowed  full origins (scheme://host[:port]) additionally allowed
 */
export function isOriginAllowed(
  origin: string | null,
  host: string | null,
  allowed: ReadonlySet<string>
): boolean {
  if (origin === null) return true
  // Some browsers send the literal string "null" for sandboxed/opaque
  // contexts (file://, sandboxed iframes). Never a legitimate client.
  if (origin === "null") return false
  if (allowed.has(origin)) return true
  // Same-host comparison ignores the scheme deliberately: behind a TLS-
  // terminating proxy the request protocol reads http while the browser's
  // Origin says https, and a scheme-sensitive check would 403 every
  // legitimate same-origin request.
  try {
    return host !== null && new URL(origin).host === host
  } catch {
    return false
  }
}
