"use client"

import {
  useAnnouncementReceipts,
  useAcknowledgeAnnouncement,
  type ReceiptsResponse,
} from "@/lib/api-hooks"

type Row = ReceiptsResponse["announcements"][number]

const PRI_STYLE: Record<string, { label: string; color: string; bd: string; bg: string }> = {
  critical: {
    label: "Critical",
    color: "rgba(255,120,110,0.92)",
    bd: "rgba(255,90,80,0.3)",
    bg: "rgba(255,90,80,0.12)",
  },
  important: {
    label: "Important",
    color: "rgba(255,190,90,0.92)",
    bd: "rgba(255,176,64,0.32)",
    bg: "rgba(255,176,64,0.1)",
  },
  info: { label: "Info", color: "var(--prv-text-2)", bd: "var(--prv-border)", bg: "transparent" },
}

function shortDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function Tile({ label, value, tone }: { label: string; value: number; tone?: "red" | "amber" }) {
  const color =
    tone === "red"
      ? "rgba(255,120,110,0.92)"
      : tone === "amber"
        ? "rgba(255,190,90,0.92)"
        : undefined
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
      <div
        style={{
          fontSize: 23,
          fontWeight: 680,
          marginTop: 8,
          color: tone && value > 0 ? color : undefined,
        }}
      >
        {value}
      </div>
    </div>
  )
}

function Bar({
  label,
  pct,
  detail,
  ack,
}: {
  label: string
  pct: number
  detail: string
  ack?: boolean
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "64px 1fr auto",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span style={{ color: "var(--prv-text-3)", fontSize: 11.5 }}>{label}</span>
      <div
        style={{ height: 8, borderRadius: 100, background: "var(--prv-g2)", overflow: "hidden" }}
      >
        <i
          style={{
            display: "block",
            height: "100%",
            borderRadius: 100,
            width: `${pct}%`,
            background: ack
              ? "linear-gradient(90deg,rgba(255,176,64,.4),rgba(255,176,64,.16))"
              : "linear-gradient(90deg,rgba(255,255,255,.32),rgba(255,255,255,.14))",
          }}
        />
      </div>
      <span
        style={{
          fontSize: 11.5,
          color: "var(--prv-text-2)",
          fontVariantNumeric: "tabular-nums",
          minWidth: 96,
          textAlign: "right",
        }}
      >
        {detail}
      </span>
    </div>
  )
}

function Card({ a, onAck, acking }: { a: Row; onAck: () => void; acking: boolean }) {
  const pri = PRI_STYLE[a.priority] ?? PRI_STYLE.info!
  const r = a.receipt
  return (
    <div
      style={{
        border: "1px solid var(--prv-border)",
        background: "var(--prv-g1)",
        borderRadius: 18,
        padding: "16px 18px",
        marginBottom: 11,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
        opacity: a.lifecycle === "expired" ? 0.6 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 14.5, fontWeight: 600, flex: 1, minWidth: 0 }}>{a.title}</span>
        <span
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            borderRadius: 6,
            padding: "3px 8px",
            border: `1px solid ${pri.bd}`,
            color: pri.color,
            background: pri.bg,
          }}
        >
          {pri.label}
        </span>
        <span style={{ color: "var(--prv-text-3)", fontSize: 11.5, whiteSpace: "nowrap" }}>
          {a.audience} · {shortDate(a.publishedAt)}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        <Bar
          label="Read"
          pct={r.readPct}
          detail={`${r.readPct}% · ${r.readCount}/${r.totalAudience}`}
        />
        {a.acknowledgmentRequired && (
          <Bar
            label="Ack"
            pct={r.ackPct}
            detail={`${r.ackPct}% · ${r.ackCount}/${r.totalAudience}`}
            ack
          />
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
        {a.lifecycle === "expired" && (
          <span style={{ color: "var(--prv-text-3)", fontSize: 11 }}>
            Expired {shortDate(a.expiresAt)}
          </span>
        )}
        {a.lifecycle === "active" && a.expiresAt && (
          <span style={{ color: "rgba(255,190,90,0.92)", fontSize: 11 }}>
            Expires {shortDate(a.expiresAt)}
          </span>
        )}
        {a.lifecycle === "scheduled" && (
          <span style={{ color: "var(--prv-text-3)", fontSize: 11 }}>Scheduled</span>
        )}
        {a.acknowledgmentRequired && a.lifecycle === "active" && (
          <button
            onClick={onAck}
            disabled={acking}
            style={{
              marginLeft: "auto",
              border: "1px solid var(--prv-border)",
              background: "var(--prv-g2)",
              color: "var(--prv-text-1)",
              borderRadius: 9,
              font: "inherit",
              fontSize: 11.5,
              padding: "6px 12px",
              cursor: "pointer",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
            }}
          >
            {acking ? "…" : "Acknowledge"}
          </button>
        )}
      </div>
    </div>
  )
}

export function ReceiptsClient() {
  const { data, isLoading } = useAnnouncementReceipts()
  const ack = useAcknowledgeAnnouncement()
  const meta = data?.meta
  const rows = data?.announcements ?? []

  return (
    <div style={{ maxWidth: 840, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>
        Announcement receipts
      </h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Communications · who has read &amp; acknowledged each announcement
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          margin: "24px 0",
        }}
      >
        <Tile label="Announcements" value={meta?.total ?? 0} />
        <Tile label="Needs ack" value={meta?.needsAttention ?? 0} tone="amber" />
        <Tile label="Critical live" value={meta?.critical ?? 0} tone="red" />
      </div>

      {isLoading && <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading…</div>}
      {!isLoading && rows.length === 0 && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>No announcements yet.</div>
      )}
      {rows.map((a) => (
        <Card key={a.id} a={a} onAck={() => ack.mutate(a.id)} acking={ack.isPending} />
      ))}
    </div>
  )
}
