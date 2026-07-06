import { describe, it, expect } from "vitest"
import { redactPii, redactPiiWithCount } from "../pii"

describe("redactPii", () => {
  it("redacts email addresses", () => {
    expect(redactPii("contact john.doe@example.co.uk please")).toBe("contact [EMAIL] please")
  })

  it("redacts IBANs", () => {
    expect(redactPii("pay to RO49AAAA1B31007593840000 today")).toBe("pay to [IBAN] today")
  })

  it("redacts a Romanian CNP (13 digits)", () => {
    expect(redactPii("CNP 1960731123456 on file")).toBe("CNP [CNP] on file")
  })

  it("redacts payment card numbers, grouped or not", () => {
    expect(redactPii("card 4111 1111 1111 1111 expires")).toBe("card [CARD] expires")
    expect(redactPii("card 4111111111111111 expires")).toBe("card [CARD] expires")
  })

  it("redacts international and long bare phone numbers", () => {
    expect(redactPii("call +40 721 234 567 now")).toBe("call [PHONE] now")
    expect(redactPii("mobile 0721234567 asap")).toBe("mobile [PHONE] asap")
  })

  it("leaves ordinary text and small numbers untouched", () => {
    const s = "Revenue rose 12% to 4200 across 3 stores in Q3."
    expect(redactPii(s)).toBe(s)
  })

  it("redacts multiple PII types in one string and counts them", () => {
    const res = redactPiiWithCount("email a@b.com or call +40721234567")
    expect(res.text).toBe("email [EMAIL] or call [PHONE]")
    expect(res.redactions).toBe(2)
  })

  it("handles empty input", () => {
    expect(redactPiiWithCount("")).toEqual({ text: "", redactions: 0 })
  })

  it("does not misclassify a CNP as a card or phone", () => {
    // exactly 13 digits, leading 1 → CNP wins because it runs before card/phone
    expect(redactPii("1960731123456")).toBe("[CNP]")
  })
})
