// 360° peer feedback aggregation (Phase 8.4) — pure + unit-tested.
//
// A performance review can collect feedback from any number of peers. Each peer
// independently submits a 1–5 rating (and optional comments) or declines. This
// module aggregates those responses — no I/O — into the counts, average, and
// distribution surfaced next to the self/manager/HR dimensions.
//
// SAFE-by-design:
//   • Only SUBMITTED responses with a valid 1–5 rating count toward the average
//     and distribution. Pending and declined never distort the score.
//   • The average is rounded to one decimal; with zero submissions it is null,
//     never 0 (0 would read as a real "bad" score).

export type PeerFeedbackStatus = "pending" | "submitted" | "declined"

export const PEER_FEEDBACK_STATUSES: PeerFeedbackStatus[] = ["pending", "submitted", "declined"]

export function isPeerFeedbackStatus(v: string): v is PeerFeedbackStatus {
  return (PEER_FEEDBACK_STATUSES as string[]).includes(v)
}

/** Ratings are the same 1–5 scale as the self/manager/HR dimensions. */
export function isValidPeerRating(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 5
}

export interface PeerFeedbackItem {
  id: string
  peerId: string
  status: PeerFeedbackStatus
  rating: number | null
}

export interface PeerFeedbackSummary {
  requested: number
  submitted: number
  declined: number
  pending: number
  /** Average of submitted 1–5 ratings, one decimal; null when none submitted. */
  averageRating: number | null
  /** Count of submitted ratings at each score, index 1..5 (index 0 unused). */
  distribution: [number, number, number, number, number, number]
  /** Share of requests that have been submitted or declined, 0–100. */
  responseRate: number
}

export function summarizePeerFeedback(items: PeerFeedbackItem[]): PeerFeedbackSummary {
  const distribution: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0]
  let submitted = 0
  let declined = 0
  let pending = 0
  let sum = 0
  let scored = 0

  for (const it of items) {
    if (it.status === "submitted") {
      submitted += 1
      if (isValidPeerRating(it.rating)) {
        distribution[it.rating] = (distribution[it.rating] ?? 0) + 1
        sum += it.rating
        scored += 1
      }
    } else if (it.status === "declined") {
      declined += 1
    } else {
      pending += 1
    }
  }

  const requested = items.length
  const responded = submitted + declined
  return {
    requested,
    submitted,
    declined,
    pending,
    averageRating: scored > 0 ? Math.round((sum / scored) * 10) / 10 : null,
    distribution,
    responseRate: requested > 0 ? Math.round((responded / requested) * 100) : 0,
  }
}

/**
 * Whether `viewerId` may submit/decline `item`. Only the assigned peer, and only
 * while the request is still pending. A submitted or declined request is final.
 */
export function canSubmitPeerFeedback(item: PeerFeedbackItem, viewerId: string): boolean {
  return item.peerId === viewerId && item.status === "pending"
}
