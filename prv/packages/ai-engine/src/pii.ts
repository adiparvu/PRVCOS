// PII redaction — AI governance (roadmap 17.8). Pure + unit-tested.
//
// Strips personally-identifiable information from free text before it is sent to
// the Anthropic API, enforcing the "PII redacted before API calls" governance
// rule. Deterministic, order-sensitive regex passes: the most structured
// identifiers (email, IBAN, national ID, card) are redacted before the broad
// phone pass so they are never misclassified. Security over convenience —
// over-redaction is acceptable, leaking PII is not.

export interface RedactionResult {
  text: string
  redactions: number
}

interface Rule {
  label: string
  pattern: RegExp
}

// Order matters: structured identifiers first, broad phone last.
const RULES: Rule[] = [
  // Email addresses.
  { label: "[EMAIL]", pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  // IBAN (e.g. RO49 AAAA 1B31 0075 9384 0000) — 2 letters, 2 check digits, up to 30 alnum.
  { label: "[IBAN]", pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g },
  // Romanian CNP — 13 digits, leading 1–8.
  { label: "[CNP]", pattern: /\b[1-8]\d{12}\b/g },
  // Payment card — 13–19 digits, optionally grouped by spaces or dashes.
  { label: "[CARD]", pattern: /\b(?:\d[ -]?){12,18}\d\b/g },
  // Phone — international "+" numbers, or a bare run of 9+ digits.
  { label: "[PHONE]", pattern: /\+\d[\d\s().-]{6,}\d/g },
  { label: "[PHONE]", pattern: /\b\d{9,}\b/g },
]

/** Redact PII from `input`, returning the cleaned text plus a redaction count. */
export function redactPiiWithCount(input: string): RedactionResult {
  if (!input) return { text: input, redactions: 0 }
  let text = input
  let redactions = 0
  for (const rule of RULES) {
    text = text.replace(rule.pattern, () => {
      redactions += 1
      return rule.label
    })
  }
  return { text, redactions }
}

/** Redact PII from `input` and return the cleaned text. */
export function redactPii(input: string): string {
  return redactPiiWithCount(input).text
}
