import { describe, it, expect } from "vitest"
import { isOriginAllowed, isStateChanging } from "@/lib/origin-check"

const ALLOWED = new Set(["https://app.prvrenovations.ro"])

describe("isStateChanging", () => {
  it("flags POST/PUT/PATCH/DELETE and not GET/HEAD/OPTIONS", () => {
    for (const m of ["POST", "PUT", "PATCH", "DELETE", "post"]) {
      expect(isStateChanging(m)).toBe(true)
    }
    for (const m of ["GET", "HEAD", "OPTIONS"]) {
      expect(isStateChanging(m)).toBe(false)
    }
  })
})

describe("isOriginAllowed", () => {
  it("allows requests without an Origin header (native apps, curl)", () => {
    expect(isOriginAllowed(null, "app.prvrenovations.ro", ALLOWED)).toBe(true)
  })

  it("allows same-host origins regardless of scheme (TLS-terminating proxy)", () => {
    expect(
      isOriginAllowed("https://app.prvrenovations.ro", "app.prvrenovations.ro", new Set())
    ).toBe(true)
  })

  it("allows origins on the explicit allow-list even on another host", () => {
    expect(isOriginAllowed("https://app.prvrenovations.ro", "internal-host:3000", ALLOWED)).toBe(
      true
    )
  })

  it("rejects a foreign origin", () => {
    expect(isOriginAllowed("https://evil.example", "app.prvrenovations.ro", ALLOWED)).toBe(false)
  })

  it("rejects a subdomain lookalike of the real host", () => {
    expect(
      isOriginAllowed(
        "https://app.prvrenovations.ro.evil.example",
        "app.prvrenovations.ro",
        ALLOWED
      )
    ).toBe(false)
  })

  it('rejects the literal "null" origin (sandboxed iframe, file://)', () => {
    expect(isOriginAllowed("null", "app.prvrenovations.ro", ALLOWED)).toBe(false)
  })

  it("rejects an unparsable origin", () => {
    expect(isOriginAllowed("not a url", "app.prvrenovations.ro", ALLOWED)).toBe(false)
  })

  it("host with port must match exactly", () => {
    expect(isOriginAllowed("http://localhost:3000", "localhost:3000", new Set())).toBe(true)
    expect(isOriginAllowed("http://localhost:4000", "localhost:3000", new Set())).toBe(false)
  })

  it("rejects when the Host header is missing and origin is not allow-listed", () => {
    expect(isOriginAllowed("https://app.prvrenovations.ro", null, new Set())).toBe(false)
  })
})
