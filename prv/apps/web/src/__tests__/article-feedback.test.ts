import { describe, it, expect } from "vitest"
import {
  isArticleFeedbackRating,
  summarizeArticleFeedback,
  type ArticleFeedbackRating,
} from "@/lib/article-feedback"

describe("isArticleFeedbackRating", () => {
  it("accepts the two ratings, rejects others", () => {
    expect(isArticleFeedbackRating("helpful")).toBe(true)
    expect(isArticleFeedbackRating("not_helpful")).toBe(true)
    expect(isArticleFeedbackRating("meh")).toBe(false)
    expect(isArticleFeedbackRating("")).toBe(false)
  })
})

describe("summarizeArticleFeedback", () => {
  it("counts both ratings and computes helpful share", () => {
    const votes: ArticleFeedbackRating[] = ["helpful", "helpful", "helpful", "not_helpful"]
    expect(summarizeArticleFeedback(votes)).toEqual({
      helpful: 3,
      notHelpful: 1,
      total: 4,
      helpfulPct: 75,
    })
  })
  it("null helpful share when there are no votes (not 0)", () => {
    expect(summarizeArticleFeedback([])).toEqual({
      helpful: 0,
      notHelpful: 0,
      total: 0,
      helpfulPct: null,
    })
  })
  it("rounds the helpful share", () => {
    // 2 of 3 helpful -> 66.67 -> 67
    expect(summarizeArticleFeedback(["helpful", "helpful", "not_helpful"]).helpfulPct).toBe(67)
  })
})
