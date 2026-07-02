// CRM / sales pipeline analytics (roadmap 10.5). Pure + unit-tested.
//
// Leads live in the `clients` table (status = "prospect") with the sales stage,
// source and estimated value carried in `clients.metadata`. Every metric below
// is derived from that lead shape so the route stays a thin data-fetch wrapper.

export type LeadStage =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost"

export type LeadSource = "website" | "referral" | "cold_call" | "social" | "event" | "partner"

/** Ordered pipeline stages (funnel top → bottom); won/lost are terminal. */
export const STAGE_ORDER: LeadStage[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
]

/** Open stages a lead can still move through (excludes terminal won/lost). */
export const OPEN_STAGES: LeadStage[] = ["new", "contacted", "qualified", "proposal", "negotiation"]

/** Default close-probability per stage — weights the open pipeline value. */
export const STAGE_PROBABILITY: Record<LeadStage, number> = {
  new: 0.1,
  contacted: 0.25,
  qualified: 0.4,
  proposal: 0.6,
  negotiation: 0.8,
  won: 1,
  lost: 0,
}

export const LEAD_SOURCES: LeadSource[] = [
  "website",
  "referral",
  "cold_call",
  "social",
  "event",
  "partner",
]

export interface LeadRecord {
  stage: LeadStage
  source: LeadSource
  estimatedValue: number
  rep: string
  createdAt: string // ISO
  updatedAt: string // ISO
}

export interface StageBucket {
  stage: LeadStage
  count: number
  value: number
}

export interface SourceBucket {
  source: LeadSource
  count: number
  value: number
  won: number
}

export interface RepBucket {
  rep: string
  wonCount: number
  wonValue: number
}

export interface VelocityBucket {
  weekStart: string // ISO date (YYYY-MM-DD), Monday of the week
  count: number
}

export interface CrmAnalytics {
  totalLeads: number
  activeLeads: number
  wonCount: number
  lostCount: number
  winRate: number // 0–100, won / (won + lost)
  pipelineValue: number // Σ estimated value of open leads
  weightedPipelineValue: number // Σ value × stage probability of open leads
  avgDealSize: number // average estimated value of won leads
  avgSalesCycleDays: number // avg days created → closed, over won + lost
  byStage: StageBucket[] // funnel, in STAGE_ORDER
  bySource: SourceBucket[] // in LEAD_SOURCES order, includes empty sources
  topReps: RepBucket[] // by won value, desc
  velocity: VelocityBucket[] // new leads per ISO week, oldest → newest
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function safe(n: number): number {
  return Number.isFinite(n) ? n : 0
}

/** Monday 00:00 UTC of the week containing `ms`, as YYYY-MM-DD. */
function weekStart(ms: number): string {
  const d = new Date(ms)
  const day = (d.getUTCDay() + 6) % 7 // 0 = Monday
  const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day)
  return new Date(monday).toISOString().slice(0, 10)
}

/**
 * Aggregate the full CRM analytics snapshot from lead records.
 *
 * @param leads   lead pipeline records
 * @param nowMs   reference "now" for the velocity window (injected for testability)
 * @param weeks   number of trailing ISO weeks to report velocity for (default 8)
 */
export function computeCrmAnalytics(leads: LeadRecord[], nowMs: number, weeks = 8): CrmAnalytics {
  const byStageMap = new Map<LeadStage, StageBucket>()
  for (const stage of STAGE_ORDER) byStageMap.set(stage, { stage, count: 0, value: 0 })

  const bySourceMap = new Map<LeadSource, SourceBucket>()
  for (const source of LEAD_SOURCES) bySourceMap.set(source, { source, count: 0, value: 0, won: 0 })

  const repMap = new Map<string, RepBucket>()

  let pipelineValue = 0
  let weightedPipelineValue = 0
  let wonCount = 0
  let lostCount = 0
  let wonValueTotal = 0
  let cycleDaysTotal = 0
  let closedCount = 0

  for (const lead of leads) {
    const value = Math.max(0, safe(lead.estimatedValue))

    const stageBucket = byStageMap.get(lead.stage)
    if (stageBucket) {
      stageBucket.count += 1
      stageBucket.value += value
    }

    const sourceBucket = bySourceMap.get(lead.source)
    if (sourceBucket) {
      sourceBucket.count += 1
      sourceBucket.value += value
    }

    if (OPEN_STAGES.includes(lead.stage)) {
      pipelineValue += value
      weightedPipelineValue += value * STAGE_PROBABILITY[lead.stage]
    }

    if (lead.stage === "won") {
      wonCount += 1
      wonValueTotal += value
      if (sourceBucket) sourceBucket.won += value
    }
    if (lead.stage === "lost") lostCount += 1

    if (lead.stage === "won" || lead.stage === "lost") {
      const created = Date.parse(lead.createdAt)
      const closed = Date.parse(lead.updatedAt)
      if (Number.isFinite(created) && Number.isFinite(closed) && closed >= created) {
        cycleDaysTotal += (closed - created) / 86_400_000
        closedCount += 1
      }
    }

    if (lead.stage === "won") {
      const key = lead.rep || "Unassigned"
      const rep = repMap.get(key) ?? { rep: key, wonCount: 0, wonValue: 0 }
      rep.wonCount += 1
      rep.wonValue += value
      repMap.set(key, rep)
    }
  }

  const decided = wonCount + lostCount
  const activeLeads = leads.length - wonCount - lostCount

  // Velocity: trailing `weeks` ISO weeks ending in the current week.
  const currentWeek = weekStart(nowMs)
  const buckets: VelocityBucket[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    buckets.push({ weekStart: weekStart(nowMs - i * 7 * 86_400_000), count: 0 })
  }
  const velocityIndex = new Map(buckets.map((b, i) => [b.weekStart, i]))
  for (const lead of leads) {
    const created = Date.parse(lead.createdAt)
    if (!Number.isFinite(created)) continue
    const wk = weekStart(created)
    if (wk > currentWeek) continue
    const idx = velocityIndex.get(wk)
    if (idx !== undefined) buckets[idx]!.count += 1
  }

  const byStage = STAGE_ORDER.map((s) => {
    const b = byStageMap.get(s)!
    return { stage: b.stage, count: b.count, value: round2(b.value) }
  })
  const bySource = LEAD_SOURCES.map((s) => {
    const b = bySourceMap.get(s)!
    return { source: b.source, count: b.count, value: round2(b.value), won: round2(b.won) }
  })
  const topReps = [...repMap.values()]
    .map((r) => ({ ...r, wonValue: round2(r.wonValue) }))
    .sort((a, b) => b.wonValue - a.wonValue || b.wonCount - a.wonCount)

  return {
    totalLeads: leads.length,
    activeLeads,
    wonCount,
    lostCount,
    winRate: decided > 0 ? round2((wonCount / decided) * 100) : 0,
    pipelineValue: round2(pipelineValue),
    weightedPipelineValue: round2(weightedPipelineValue),
    avgDealSize: wonCount > 0 ? round2(wonValueTotal / wonCount) : 0,
    avgSalesCycleDays: closedCount > 0 ? round2(cycleDaysTotal / closedCount) : 0,
    byStage,
    bySource,
    topReps,
    velocity: buckets,
  }
}
