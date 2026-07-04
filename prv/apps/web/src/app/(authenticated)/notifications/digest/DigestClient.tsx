"use client"

import Link from "next/link"
import {
  useNotificationDigest,
  useMarkAllNotificationsRead,
  type DigestResponse,
} from "@/lib/api-hooks"

type Group = DigestResponse["groups"][number]
type Item = Group["items"][number]

const GROUP_GLYPH: Record<string, string> = {
  task: "☑︎",
  project: "◧",
  invoice: "€",
  expense: "€",
  leave: "◷",
  order: "🛒",
  document: "📄",
  announcement: "📣",
  approval: "✓",
  client: "◎",
  lead: "◎",
  general: "•",
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 60) return `${Math.max(1, min)}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function Row({ n }: { n: Item }) {
  const ar = n.type === "action_required"
  const inner = (
    <>
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          marginTop: 6,
          flex: "none",
          background: ar ? "rgba(255,190,90,0.92)" : "var(--prv-text-3)",
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 560 }}>{n.title}</div>
        {n.body && (
          <div
            style={{ color: "var(--prv-text-3)", fontSize: 12.5, marginTop: 3, lineHeight: 1.45 }}
          >
            {n.body}
          </div>
        )}
      </div>
      <span
        style={{ color: "var(--prv-text-3)", fontSize: 11, whiteSpace: "nowrap", marginTop: 2 }}
      >
        {timeAgo(n.createdAt)}
      </span>
    </>
  )
  const style = {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    padding: "13px 15px",
    border: "1px solid var(--prv-border)",
    background: "var(--prv-g1)",
    borderRadius: 14,
    marginBottom: 8,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
    textDecoration: "none",
    color: "inherit",
  } as const
  return n.actionUrl ? (
    <Link href={n.actionUrl} style={style}>
      {inner}
    </Link>
  ) : (
    <div style={style}>{inner}</div>
  )
}

export function DigestClient() {
  const { data, isLoading } = useNotificationDigest()
  const markAll = useMarkAllNotificationsRead()
  const groups = data?.groups ?? []

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 24px 80px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>Daily digest</h1>
          <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
            Notifications · your last 24 hours, grouped by module
          </div>
        </div>
        {(data?.total ?? 0) > 0 && (
          <button
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            style={{
              border: "1px solid var(--prv-border)",
              background: "var(--prv-g2)",
              color: "var(--prv-text-1)",
              borderRadius: 11,
              font: "inherit",
              fontSize: 12.5,
              padding: "9px 15px",
              cursor: "pointer",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
            }}
          >
            {markAll.isPending ? "…" : "Mark all read"}
          </button>
        )}
      </div>

      {isLoading && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14, marginTop: 24 }}>Loading…</div>
      )}

      {data && (
        <>
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border)",
              borderRadius: 20,
              padding: "18px 20px",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
              margin: "22px 0",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 560, lineHeight: 1.5 }}>{data.summary}</div>
            {data.actionRequired > 0 && (
              <div style={{ marginTop: 10, color: "rgba(255,190,90,0.92)", fontSize: 12.5 }}>
                ⚠︎ {data.actionRequired} need{data.actionRequired === 1 ? "s" : ""} action
              </div>
            )}
          </div>

          {groups.map((g) => (
            <div key={g.key} style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, margin: "0 4px 10px" }}>
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    background: "var(--prv-g2)",
                    border: "1px solid var(--prv-border-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                  }}
                >
                  {GROUP_GLYPH[g.key] ?? "•"}
                </span>
                <span
                  style={{
                    fontSize: 12.5,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--prv-text-2)",
                    fontWeight: 600,
                  }}
                >
                  {g.label}
                </span>
                <span style={{ color: "var(--prv-text-3)", fontSize: 12 }}>· {g.count}</span>
              </div>
              {g.items.map((n) => (
                <Row key={n.id} n={n} />
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
