import { describe, it, expect } from "vitest"
import {
  isPeerFeedbackStatus,
  isValidPeerRating,
  summarizePeerFeedback,
  canSubmitPeerFeedback,
  type PeerFeedbackItem,
} from "@/lib/peer-feedback"

function item(over: Partial<PeerFeedbackItem> = {}): PeerFeedbackItem {
  return { id: "f1", peerId: "p1", status: "pending", rating: null, ...over }
}

describe("isPeerFeedbackStatus", () => {
  it("accepts the three statuses, rejects others", () => {
    expect(isPeerFeedbackStatus("pending")).toBe(true)
    expect(isPeerFeedbackStatus("submitted")).toBe(true)
    expect(isPeerFeedbackStatus("declined")).toBe(true)
    expect(isPeerFeedbackStatus("approved")).toBe(false)
  })
})

describe("isValidPeerRating", () => {
  it("only integers 1..5", () => {
    expect(isValidPeerRating(1)).toBe(true)
    expect(isValidPeerRating(5)).toBe(true)
    expect(isValidPeerRating(0)).toBe(false)
    expect(isValidPeerRating(6)).toBe(false)
    expect(isValidPeerRating(3.5)).toBe(false)
    expect(isValidPeerRating(null)).toBe(false)
    expect(isValidPeerRating("4")).toBe(false)
  })
})

describe("summarizePeerFeedback", () => {
  it("counts statuses and averages only submitted, valid ratings", () => {
    const s = summarizePeerFeedback([
      item({ id: "a", status: "submitted", rating: 4 }),
      item({ id: "b", status: "submitted", rating: 5 }),
      item({ id: "c", status: "declined" }),
      item({ id: "d", status: "pending" }),
    ])
    expect(s.requested).toBe(4)
    expect(s.submitted).toBe(2)
    expect(s.declined).toBe(1)
    expect(s.pending).toBe(1)
    expect(s.averageRating).toBe(4.5)
    expect(s.distribution[4]).toBe(1)
    expect(s.distribution[5]).toBe(1)
    expect(s.responseRate).toBe(75) // 3 of 4 responded (submitted or declined)
  })

  it("null average (not 0) when nothing submitted", () => {
    const s = summarizePeerFeedback([item({ status: "pending" }), item({ status: "declined" })])
    expect(s.averageRating).toBeNull()
    expect(s.responseRate).toBe(50)
  })

  it("ignores a submitted row carrying an out-of-range rating", () => {
    const s = summarizePeerFeedback([
      item({ id: "a", status: "submitted", rating: 4 }),
      item({ id: "b", status: "submitted", rating: 9 }), // corrupt — excluded from avg
    ])
    expect(s.submitted).toBe(2)
    expect(s.averageRating).toBe(4) // only the valid 4 counts
    expect(s.distribution.reduce((a, b) => a + b, 0)).toBe(1)
  })

  it("empty input is all zeros with null average", () => {
    const s = summarizePeerFeedback([])
    expect(s).toMatchObject({ requested: 0, submitted: 0, averageRating: null, responseRate: 0 })
  })
})

describe("canSubmitPeerFeedback", () => {
  it("only the assigned peer while pending", () => {
    expect(canSubmitPeerFeedback(item({ peerId: "p1", status: "pending" }), "p1")).toBe(true)
    expect(canSubmitPeerFeedback(item({ peerId: "p1", status: "pending" }), "other")).toBe(false)
    expect(canSubmitPeerFeedback(item({ peerId: "p1", status: "submitted" }), "p1")).toBe(false)
    expect(canSubmitPeerFeedback(item({ peerId: "p1", status: "declined" }), "p1")).toBe(false)
  })
})
