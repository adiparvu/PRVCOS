import { describe, it, expect } from "vitest"
import {
  applyReaction,
  reactionTotal,
  canModifyMessage,
  TOMBSTONE_CONTENT,
} from "@/lib/message-actions"

describe("applyReaction", () => {
  it("adds a new emoji and increments an existing one", () => {
    expect(applyReaction({}, "👍", "add")).toEqual({ "👍": 1 })
    expect(applyReaction({ "👍": 2 }, "👍", "add")).toEqual({ "👍": 3 })
  })
  it("removes and drops an emoji at zero", () => {
    expect(applyReaction({ "👍": 1 }, "👍", "remove")).toEqual({})
    expect(applyReaction({ "👍": 3, "❤️": 1 }, "👍", "remove")).toEqual({ "👍": 2, "❤️": 1 })
  })
  it("never goes below zero on remove", () => {
    expect(applyReaction({}, "👍", "remove")).toEqual({})
  })
  it("does not mutate the input map", () => {
    const src = { "👍": 1 }
    applyReaction(src, "👍", "add")
    expect(src).toEqual({ "👍": 1 })
  })
})

describe("reactionTotal", () => {
  it("sums all emoji counts", () => {
    expect(reactionTotal({ "👍": 3, "❤️": 2 })).toBe(5)
    expect(reactionTotal({})).toBe(0)
  })
})

describe("canModifyMessage", () => {
  it("allows only the author of a live message", () => {
    expect(canModifyMessage({ authorId: "u1", deletedAt: null }, "u1")).toBe(true)
    expect(canModifyMessage({ authorId: "u1", deletedAt: null }, "u2")).toBe(false)
  })
  it("blocks modifying a deleted message", () => {
    expect(canModifyMessage({ authorId: "u1", deletedAt: "2026-01-01" }, "u1")).toBe(false)
  })
})

describe("TOMBSTONE_CONTENT", () => {
  it("is a stable placeholder", () => {
    expect(TOMBSTONE_CONTENT).toBe("[message deleted]")
  })
})
