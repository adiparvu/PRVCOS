import { describe, it, expect } from "vitest"
import {
  extractMentionHandles,
  resolveMentions,
  mentionSpans,
  summarizeMentions,
} from "@/lib/mentions"

describe("extractMentionHandles", () => {
  it("extracts unique lowercased handles", () => {
    expect(extractMentionHandles("hey @Ana and @bo, cc @ana")).toEqual(["ana", "bo"])
  })
  it("ignores emails and mid-word @", () => {
    expect(extractMentionHandles("email me at ana@example.com")).toEqual([])
    expect(extractMentionHandles("x@y")).toEqual([])
  })
  it("handles dotted / hyphenated handles", () => {
    expect(extractMentionHandles("ping @maria.popescu and @vlad-d")).toEqual([
      "maria.popescu",
      "vlad-d",
    ])
  })
})

describe("resolveMentions", () => {
  const dir = [
    { userId: "u1", handle: "ana" },
    { userId: "u2", handle: "bo" },
  ]
  it("maps matched handles to ids, dedup, ignores unknown", () => {
    expect(resolveMentions("@ana @bo @ghost @ana", dir)).toEqual(["u1", "u2"])
  })
  it("returns empty when nothing matches", () => {
    expect(resolveMentions("no tags here", dir)).toEqual([])
  })
})

describe("mentionSpans", () => {
  it("locates @handle offsets for highlighting", () => {
    const text = "hi @ana!"
    const spans = mentionSpans(text)
    expect(spans).toHaveLength(1)
    expect(text.slice(spans[0]!.start, spans[0]!.end)).toBe("@ana")
    expect(spans[0]!.handle).toBe("ana")
  })
})

describe("summarizeMentions", () => {
  const NOW = Date.parse("2026-07-02T12:00:00Z")
  it("buckets into total / today / week", () => {
    const s = summarizeMentions(
      [
        { createdAt: "2026-07-02T09:00:00Z" }, // today
        { createdAt: "2026-06-30T09:00:00Z" }, // this week
        { createdAt: "2026-06-01T09:00:00Z" }, // older
      ],
      NOW
    )
    expect(s.total).toBe(3)
    expect(s.today).toBe(1)
    expect(s.week).toBe(2)
  })
})
