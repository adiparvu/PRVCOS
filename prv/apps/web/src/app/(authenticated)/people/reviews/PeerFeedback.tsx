"use client"

import { useCallback, useEffect, useState } from "react"
import { useToast } from "@prv/ui"
import type { PeerFeedbackDto } from "@/app/api/reviews/[id]/peer-feedback/route"
import type { AssignedPeerFeedbackDto } from "@/app/api/reviews/peer-feedback/assigned/route"
import type { PeerFeedbackSummary } from "@/lib/peer-feedback"

const green = "rgba(48,209,88,0.9)"
const muted = "var(--prv-text-3)"

function stars(n: number | null): string {
  return n ? "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n) : "—"
}

const STATUS_LABEL: Record<string, string> = {
  pending: "În așteptare",
  submitted: "Trimis",
  declined: "Refuzat",
}

const panel: React.CSSProperties = {
  background: "var(--prv-g1)",
  border: "1px solid var(--prv-border-subtle)",
  borderRadius: 14,
  padding: 14,
}
const chip: React.CSSProperties = {
  fontSize: 9.5,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderRadius: 100,
  padding: "2px 8px",
}
const smallBtn: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  borderRadius: 100,
  padding: "4px 11px",
  cursor: "pointer",
  border: "1px solid var(--prv-border)",
  background: "var(--prv-g1)",
  color: "var(--prv-text-2)",
}

// ─── Per-review panel (managers / HR): request + view attributed feedback ──────

interface Person {
  id: string
  fullName: string
}

export function ReviewPeerPanel({
  reviewId,
  subjectUserId,
  people,
}: {
  reviewId: string
  subjectUserId: string
  people: Person[]
}) {
  const { toast } = useToast()
  const [feedback, setFeedback] = useState<PeerFeedbackDto[] | null>(null)
  const [summary, setSummary] = useState<PeerFeedbackSummary | null>(null)
  const [peerId, setPeerId] = useState("")
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    return fetch(`/api/reviews/${reviewId}/peer-feedback`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d: { feedback: PeerFeedbackDto[]; summary: PeerFeedbackSummary }) => {
        setFeedback(d.feedback)
        setSummary(d.summary)
      })
      .catch(() => setFeedback([]))
  }, [reviewId])

  useEffect(() => {
    load()
  }, [load])

  const requested = new Set((feedback ?? []).map((f) => f.peerId))
  const candidates = people.filter((p) => p.id !== subjectUserId && !requested.has(p.id))

  const request = () => {
    if (!peerId || busy) return
    setBusy(true)
    fetch(`/api/reviews/${reviewId}/peer-feedback`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ peerId }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          throw new Error(typeof j.error === "string" ? j.error : "Request failed")
        }
        setPeerId("")
        await load()
        toast.success("Feedback cerut")
      })
      .catch((e) => toast.error("Nu s-a putut cere", e instanceof Error ? e.message : undefined))
      .finally(() => setBusy(false))
  }

  const cancel = (f: PeerFeedbackDto) => {
    if (busy) return
    setBusy(true)
    fetch(`/api/reviews/${reviewId}/peer-feedback/${f.id}`, { method: "DELETE" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Cancel failed")
        await load()
      })
      .catch(() => toast.error("Nu s-a putut anula"))
      .finally(() => setBusy(false))
  }

  return (
    <div style={{ ...panel, margin: "0 16px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: muted,
          }}
        >
          Feedback 360°
        </span>
        {summary && (
          <span style={{ fontSize: 12, color: "var(--prv-text-2)", marginLeft: "auto" }}>
            {summary.averageRating !== null ? (
              <>
                <span style={{ color: "#fff", letterSpacing: 1 }}>
                  {stars(Math.round(summary.averageRating))}
                </span>{" "}
                {summary.averageRating.toFixed(1)} · {summary.submitted}/{summary.requested}
              </>
            ) : (
              <span style={{ color: muted }}>
                {summary.requested === 0 ? "Niciun peer" : `0/${summary.requested} răspunsuri`}
              </span>
            )}
          </span>
        )}
      </div>

      {feedback && feedback.length > 0 && (
        <div style={{ display: "grid", gap: 7, marginBottom: 12 }}>
          {feedback.map((f) => (
            <div
              key={f.id}
              style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}
            >
              <span style={{ minWidth: 120, fontWeight: 600 }}>{f.peerName ?? "—"}</span>
              <span
                style={{
                  ...chip,
                  color:
                    f.status === "submitted"
                      ? green
                      : f.status === "declined"
                        ? "var(--prv-text-3)"
                        : "var(--prv-text-2)",
                  background: f.status === "submitted" ? "rgba(48,209,88,0.12)" : "var(--prv-g2)",
                }}
              >
                {STATUS_LABEL[f.status]}
              </span>
              {f.status === "submitted" && (
                <span style={{ color: "#fff", letterSpacing: 1 }}>{stars(f.rating)}</span>
              )}
              {f.comments && (
                <span
                  style={{
                    color: muted,
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {f.comments}
                </span>
              )}
              {f.status === "pending" && (
                <button
                  onClick={() => cancel(f)}
                  disabled={busy}
                  style={{ ...smallBtn, marginLeft: "auto" }}
                >
                  Anulează
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <select
          value={peerId}
          onChange={(e) => setPeerId(e.target.value)}
          style={{
            flex: 1,
            padding: "7px 10px",
            borderRadius: 10,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border)",
            color: "var(--prv-text-1)",
            fontSize: 12.5,
            fontFamily: "inherit",
          }}
        >
          <option value="">＋ Cere feedback de la un coleg…</option>
          {candidates.map((p) => (
            <option key={p.id} value={p.id}>
              {p.fullName}
            </option>
          ))}
        </select>
        <button
          onClick={request}
          disabled={!peerId || busy}
          style={{
            ...smallBtn,
            background: peerId ? "rgba(255,255,255,0.92)" : "var(--prv-g1)",
            color: peerId ? "#000" : "var(--prv-text-3)",
            border: "none",
          }}
        >
          Cere
        </button>
      </div>
    </div>
  )
}

// ─── My assigned peer reviews (self-service, any employee) ─────────────────────

function AssignedRow({ a, onDone }: { a: AssignedPeerFeedbackDto; onDone: () => void }) {
  const { toast } = useToast()
  const [rating, setRating] = useState(0)
  const [comments, setComments] = useState("")
  const [busy, setBusy] = useState(false)

  const submit = () => {
    if (!rating || busy) return
    setBusy(true)
    fetch(`/api/reviews/${a.reviewId}/peer-feedback/${a.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "submit", rating, comments: comments.trim() || null }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("submit")
        toast.success("Feedback trimis")
        onDone()
      })
      .catch(() => toast.error("Nu s-a putut trimite"))
      .finally(() => setBusy(false))
  }

  const decline = () => {
    if (busy) return
    setBusy(true)
    fetch(`/api/reviews/${a.reviewId}/peer-feedback/${a.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "decline" }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("decline")
        onDone()
      })
      .catch(() => toast.error("Nu s-a putut refuza"))
      .finally(() => setBusy(false))
  }

  return (
    <div style={{ ...panel }}>
      <div style={{ fontSize: 13.5, fontWeight: 640 }}>{a.subjectName ?? "Coleg"}</div>
      <div style={{ fontSize: 11.5, color: muted, marginTop: 2 }}>{a.cycleName ?? "Evaluare"}</div>
      <div style={{ display: "flex", gap: 4, margin: "10px 0" }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setRating(n)}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: "1px solid var(--prv-border)",
              background: n <= rating ? "rgba(255,255,255,0.92)" : "var(--prv-g1)",
              color: n <= rating ? "#000" : "var(--prv-text-3)",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <textarea
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        placeholder="Comentarii (opțional)"
        style={{
          width: "100%",
          boxSizing: "border-box",
          minHeight: 54,
          resize: "vertical",
          borderRadius: 10,
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border)",
          color: "var(--prv-text-1)",
          padding: 10,
          fontSize: 12.5,
          fontFamily: "inherit",
        }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button
          onClick={submit}
          disabled={!rating || busy}
          style={{
            ...smallBtn,
            background: rating ? "rgba(255,255,255,0.92)" : "var(--prv-g1)",
            color: rating ? "#000" : "var(--prv-text-3)",
            border: "none",
          }}
        >
          Trimite feedback
        </button>
        <button onClick={decline} disabled={busy} style={smallBtn}>
          Refuz
        </button>
      </div>
    </div>
  )
}

export function MyPeerReviewsSection() {
  const [assigned, setAssigned] = useState<AssignedPeerFeedbackDto[] | null>(null)

  const load = useCallback(() => {
    return fetch("/api/reviews/peer-feedback/assigned")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d: { assigned: AssignedPeerFeedbackDto[] }) => setAssigned(d.assigned))
      .catch(() => setAssigned([]))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const pending = (assigned ?? []).filter((a) => a.status === "pending")
  if (pending.length === 0) return null

  return (
    <div style={{ margin: "18px 0 8px" }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: muted,
          margin: "0 4px 10px",
        }}
      >
        Feedback cerut de la tine · {pending.length}
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {pending.map((a) => (
          <AssignedRow key={a.id} a={a} onDone={load} />
        ))}
      </div>
    </div>
  )
}
