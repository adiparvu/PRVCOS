import { describe, it, expect } from "vitest"
import {
  phoneSchema,
  emailSchema,
  passwordSchema,
  isoDateSchema,
  currencyAmountSchema,
  percentSchema,
  timezoneSchema,
  localeSchema,
} from "../common"

describe("phoneSchema", () => {
  it("accepts valid E.164 numbers", () => {
    expect(phoneSchema.safeParse("+40721234567").success).toBe(true)
    expect(phoneSchema.safeParse("+12025551234").success).toBe(true)
    expect(phoneSchema.safeParse("+447911123456").success).toBe(true)
  })

  it("rejects numbers without + prefix", () => {
    expect(phoneSchema.safeParse("0721234567").success).toBe(false)
  })

  it("rejects numbers that are too short", () => {
    expect(phoneSchema.safeParse("+4072").success).toBe(false)
  })
})

describe("emailSchema", () => {
  it("accepts valid emails and lowercases them", () => {
    const result = emailSchema.safeParse("USER@EXAMPLE.COM")
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe("user@example.com")
  })

  it("rejects invalid emails", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false)
    expect(emailSchema.safeParse("missing@").success).toBe(false)
  })
})

describe("passwordSchema", () => {
  it("accepts a strong password", () => {
    expect(passwordSchema.safeParse("Secure#Pass1234!").success).toBe(true)
  })

  it("rejects passwords shorter than 12 chars", () => {
    expect(passwordSchema.safeParse("Short#1!").success).toBe(false)
  })

  it("rejects passwords without uppercase", () => {
    expect(passwordSchema.safeParse("alllowercase1!valid").success).toBe(false)
  })

  it("rejects passwords without special characters", () => {
    expect(passwordSchema.safeParse("NoSpecialChar1234").success).toBe(false)
  })
})

describe("isoDateSchema", () => {
  it("accepts valid ISO dates", () => {
    expect(isoDateSchema.safeParse("2024-01-15").success).toBe(true)
    expect(isoDateSchema.safeParse("2000-12-31").success).toBe(true)
  })

  it("rejects non-ISO formats", () => {
    expect(isoDateSchema.safeParse("15/01/2024").success).toBe(false)
    expect(isoDateSchema.safeParse("2024-1-1").success).toBe(false)
  })
})

describe("currencyAmountSchema", () => {
  it("accepts valid amounts", () => {
    expect(currencyAmountSchema.safeParse(0).success).toBe(true)
    expect(currencyAmountSchema.safeParse(1234.56).success).toBe(true)
    expect(currencyAmountSchema.safeParse(999_999_999.99).success).toBe(true)
  })

  it("rejects negative amounts", () => {
    expect(currencyAmountSchema.safeParse(-0.01).success).toBe(false)
  })

  it("rejects amounts exceeding max", () => {
    expect(currencyAmountSchema.safeParse(1_000_000_000).success).toBe(false)
  })
})

describe("percentSchema", () => {
  it("accepts 0–100 range", () => {
    expect(percentSchema.safeParse(0).success).toBe(true)
    expect(percentSchema.safeParse(100).success).toBe(true)
    expect(percentSchema.safeParse(99.9).success).toBe(true)
  })

  it("rejects values outside range", () => {
    expect(percentSchema.safeParse(-1).success).toBe(false)
    expect(percentSchema.safeParse(100.1).success).toBe(false)
  })
})

describe("timezoneSchema", () => {
  it("accepts valid IANA timezones", () => {
    expect(timezoneSchema.safeParse("Europe/Bucharest").success).toBe(true)
    expect(timezoneSchema.safeParse("UTC").success).toBe(true)
    expect(timezoneSchema.safeParse("America/New_York").success).toBe(true)
  })

  it("rejects invalid timezone strings", () => {
    expect(timezoneSchema.safeParse("Not/ATimezone").success).toBe(false)
    expect(timezoneSchema.safeParse("").success).toBe(false)
  })
})

describe("localeSchema", () => {
  it("accepts supported locales", () => {
    expect(localeSchema.safeParse("ro-RO").success).toBe(true)
    expect(localeSchema.safeParse("en-US").success).toBe(true)
    expect(localeSchema.safeParse("en-GB").success).toBe(true)
  })

  it("rejects unsupported locales", () => {
    expect(localeSchema.safeParse("fr-FR").success).toBe(false)
    expect(localeSchema.safeParse("").success).toBe(false)
  })
})
