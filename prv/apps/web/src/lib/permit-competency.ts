// Phase 18.3 safe-variant — competency gating for permit approvers (pure logic).
//
// Maps each permit type to the safety competencies its approver should hold, then
// checks a person's training records for a matching, non-expired one. Because
// training names are free text, matching is keyword-based and the result is
// ADVISORY (a warning), never a hard block — a false "missing" must not stop
// legitimate safety-critical work. Tighten to a structured competency catalog later.

import type { PermitType } from "./ptw"

export const PERMIT_TYPE_COMPETENCIES: Record<PermitType, string[]> = {
  hot_work: ["lucru la cald", "hot work", "sudur", "welding", "flacar"],
  confined_space: ["spatiu inchis", "spațiu închis", "confined"],
  working_at_height: ["inaltime", "înălțime", "height", "fall", "cadere"],
  electrical: ["electric", "loto", "izolare", "lockout"],
  excavation: ["excava", "sapatur", "săpătur", "excavation", "trench"],
}

export function competenciesForType(type: PermitType): string[] {
  return PERMIT_TYPE_COMPETENCIES[type] ?? []
}

export interface TrainingRecordLite {
  trainingName: string
  expiresAt: string | null // ISO or null (never expires)
}

export type CompetencyStatus = "covered" | "expired" | "missing"

export interface CompetencyAssessment {
  status: CompetencyStatus
  keywords: string[]
  matchedName: string | null
  expiresAt: string | null
}

function norm(s: string): string {
  return s.toLowerCase()
}

// Assess whether the given training records cover the competency required by a
// permit type, as of `now`. A non-expiring or future-dated match => covered; if the
// only matches are expired => expired; no keyword match at all => missing.
export function assessCompetency(
  records: TrainingRecordLite[],
  type: PermitType,
  nowMs: number
): CompetencyAssessment {
  const keywords = competenciesForType(type)
  if (keywords.length === 0)
    return { status: "covered", keywords, matchedName: null, expiresAt: null }

  const matches = records.filter((r) =>
    keywords.some((k) => norm(r.trainingName).includes(norm(k)))
  )
  if (matches.length === 0)
    return { status: "missing", keywords, matchedName: null, expiresAt: null }

  const valid = matches.filter((m) => m.expiresAt === null || Date.parse(m.expiresAt) >= nowMs)
  if (valid.length > 0) {
    // Prefer the one with the furthest / no expiry for a stable "covered" answer.
    const best = valid.reduce((a, b) => {
      const av = a.expiresAt === null ? Infinity : Date.parse(a.expiresAt)
      const bv = b.expiresAt === null ? Infinity : Date.parse(b.expiresAt)
      return bv > av ? b : a
    })
    return {
      status: "covered",
      keywords,
      matchedName: best.trainingName,
      expiresAt: best.expiresAt,
    }
  }

  // All matches are expired — report the most-recently-expired one.
  const latestExpired = matches.reduce((a, b) =>
    Date.parse(b.expiresAt!) > Date.parse(a.expiresAt!) ? b : a
  )
  return {
    status: "expired",
    keywords,
    matchedName: latestExpired.trainingName,
    expiresAt: latestExpired.expiresAt,
  }
}
