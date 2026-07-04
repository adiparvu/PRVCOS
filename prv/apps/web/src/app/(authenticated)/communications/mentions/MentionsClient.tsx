"use client"

import Link from "next/link"
import { useMentions, type MentionsResponse } from "@/lib/api-hooks"
import { mentionSpans } from "@/lib/mentions"

type Mention = MentionsResponse["mentions"][number]

function initials(name: string | null): string {
  if (!name) return "—"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? "—").toUpperCase()
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase()
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "now"
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d === 1) return "yesterday"
  return `${d} days`
}

// Render text with @handle spans emphasized.
function Highlighted({ text }: { text: string }) {
  const spans = mentionSpans(text)
  if (spans.length === 0) return <>{text}</>
  const out: React.ReactNode[] = []
  let cursor = 0
  spans.forEach((s, i) => {
    if (s.start > cursor) out.push(text.slice(cursor, s.start))
    out.push(
      <span key={i} style={{ color: "var(--prv-text-1)", fontWeight: 600 }}>
        {text.slice(s.start, s.end)}
      </span>
    )
    cursor = s.end
  })
  if (cursor < text.length) out.push(text.slice(cursor))
  return <>{out}</>
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border)",
        borderRadius: 18,
        padding: "14px 16px",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      <div
        style={{
          color: "var(--prv-text-3)",
          fontSize: 10.5,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: 560,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 23, fontWeight: 680, marginTop: 8 }}>{value}</div>
    </div>
  )
}

function Row({ m }: { m: Mention }) {
  return (
    <Link
      href={`/communications?channel=${m.channelId}`}
      style={{
        display: "flex",
        gap: 13,
        alignItems: "flex-start",
        padding: "14px 16px",
        border: "1px solid var(--prv-border)",
        background: "var(--prv-g1)",
        borderRadius: 16,
        marginBottom: 10,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          flex: "none",
          borderRadius: "50%",
          background: "var(--prv-g3)",
          border: "1px solid var(--prv-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12.5,
          fontWeight: 600,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
        }}
      >
        {initials(m.authorName)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{m.authorName ?? "Someone"}</span>
          {m.channelName && (
            <span style={{ fontSize: 12, color: "var(--prv-text-3)" }}>
              in{" "}
              <span style={{ color: "var(--prv-text-2)", fontWeight: 560 }}>#{m.channelName}</span>
            </span>
          )}
          <span
            style={{
              marginLeft: "auto",
              color: "var(--prv-text-3)",
              fontSize: 11.5,
              whiteSpace: "nowrap",
            }}
          >
            {timeAgo(m.createdAt)}
          </span>
        </div>
        <div style={{ color: "var(--prv-text-2)", fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
          <Highlighted text={m.snippet} />
        </div>
      </div>
    </Link>
  )
}

export function MentionsClient() {
  const { data, isLoading } = useMentions()
  const mentions = data?.mentions ?? []
  const meta = data?.meta

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>Mentions</h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Communications · every message that @-mentions you, in one place
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          margin: "24px 0",
        }}
      >
        <Tile label="Total" value={meta?.total ?? 0} />
        <Tile label="Today" value={meta?.today ?? 0} />
        <Tile label="This week" value={meta?.week ?? 0} />
      </div>

      {isLoading && <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading…</div>}
      {!isLoading && mentions.length === 0 && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>
          No mentions yet — you&apos;re all caught up.
        </div>
      )}
      {mentions.map((m) => (
        <Row key={m.id} m={m} />
      ))}
    </div>
  )
}
