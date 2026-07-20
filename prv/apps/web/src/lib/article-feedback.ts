// Knowledge article helpfulness feedback (Phase 13) — pure + unit-tested.
//
// Aggregates the per-user helpful / not_helpful votes on an article into the
// counts and helpful-share the reader UI shows. One vote per user is enforced by
// a unique constraint at the DB; this module just summarises whatever rows exist.

export type ArticleFeedbackRating = "helpful" | "not_helpful"

export const ARTICLE_FEEDBACK_RATINGS: ArticleFeedbackRating[] = ["helpful", "not_helpful"]

export function isArticleFeedbackRating(v: string): v is ArticleFeedbackRating {
  return v === "helpful" || v === "not_helpful"
}

export interface ArticleFeedbackSummary {
  helpful: number
  notHelpful: number
  total: number
  /** Share of votes that were "helpful", 0–100; null when there are no votes. */
  helpfulPct: number | null
}

export function summarizeArticleFeedback(ratings: ArticleFeedbackRating[]): ArticleFeedbackSummary {
  let helpful = 0
  let notHelpful = 0
  for (const r of ratings) {
    if (r === "helpful") helpful += 1
    else notHelpful += 1
  }
  const total = helpful + notHelpful
  return {
    helpful,
    notHelpful,
    total,
    helpfulPct: total > 0 ? Math.round((helpful / total) * 100) : null,
  }
}
