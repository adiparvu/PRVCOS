"use client"

import { useState } from "react"
import {
  useReviewCycles,
  useCreateReviewCycle,
  useReviews,
  useCreateReview,
  useAdvanceReview,
  usePeople,
  type ReviewCycleSummary,
  type ReviewSummary,
} from "@/lib/api-hooks"

const CADENCE = ["annual", "semi_annual", "quarterly"] as const
const CADENCE_LABEL: Record<string, string> = {
  annual: "Annual",
  semi_annual: "Semi-annual",
  quarterly: "Quarterly",
}
const STAGE_LABEL: Record<string, string> = {
  self_review: "Self review",
  manager_review: "Manager review",
  hr_review: "HR review",
  signed_off: "Signed off",
}
const STAGE_INDEX: Record<string, number> = {
  self_review: 1,
  manager_review: 2,
  hr_review: 3,
  signed_off: 4,
}

function initials(name: string | null): string {
  if (!name) return "?"
  const p = name.trim().split(/\s+/)
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "?"
}
function stars(n: number | null): string {
  return n ? "★★★★★".slice(0, n) : ""
}

function CycleCard({
  c,
  selected,
  onSelect,
}: {
  c: ReviewCycleSummary
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      style={{
        textAlign: "left",
        width: "100%",
        borderRadius: 20,
        padding: "16px 18px",
        marginBottom: 12,
        cursor: "pointer",
        background: "var(--prv-g1)",
        border: `1px solid ${selected ? "var(--prv-border)" : "var(--prv-border-subtle)"}`,
        boxShadow: selected
          ? "inset 0 1px 0 rgba(255,255,255,0.28)"
          : "inset 0 1px 0 rgba(255,255,255,0.22)",
        fontFamily: "inherit",
        color: "inherit",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 680 }}>{c.name}</div>
          <div style={{ fontSize: 11.5, color: "var(--prv-text-3)", marginTop: 2 }}>
            {CADENCE_LABEL[c.cadence]}
            {c.dueDate ? ` · due ${c.dueDate}` : ""}
          </div>
        </div>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 9.5,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            borderRadius: 100,
            padding: "3px 9px",
            color: c.status === "active" ? "rgba(48,209,88,0.9)" : "var(--prv-text-2)",
            background: c.status === "active" ? "rgba(48,209,88,0.12)" : "transparent",
            border: `1px solid ${c.status === "active" ? "rgba(48,209,88,0.26)" : "var(--prv-border)"}`,
          }}
        >
          {c.status}
        </span>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 100,
          background: "rgba(255,255,255,0.08)",
          marginTop: 13,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${c.progress.percent}%`,
            borderRadius: 100,
            background: "rgba(255,255,255,0.8)",
            transition: "width 0.4s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        />
      </div>
      <div
        style={{ fontSize: 11, color: "var(--prv-text-3)", marginTop: 8, display: "flex", gap: 12 }}
      >
        <span>{c.progress.percent}% complete</span>
        <span>
          {c.progress.signedOff} of {c.progress.total} signed off
        </span>
      </div>
    </button>
  )
}

function ReviewRow({ r, onAdvance }: { r: ReviewSummary; onAdvance: () => void }) {
  const idx = STAGE_INDEX[r.stage] ?? 1
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: "13px 16px",
        borderBottom: "1px solid var(--prv-border-subtle)",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: "var(--prv-g2)",
          display: "grid",
          placeItems: "center",
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
        }}
      >
        {initials(r.userName)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 640 }}>{r.userName ?? "—"}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5 }}>
          {[1, 2, 3, 4].map((n) => (
            <span
              key={n}
              style={{
                width: 22,
                height: 5,
                borderRadius: 100,
                background: n <= idx ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.10)",
              }}
            />
          ))}
        </div>
        {r.stage !== "signed_off" && (
          <div style={{ fontSize: 10.5, color: "var(--prv-text-3)", marginTop: 4 }}>
            {STAGE_LABEL[r.stage]}
          </div>
        )}
      </div>
      {r.signedOff ? (
        <span
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "rgba(48,209,88,0.9)",
          }}
        >
          Signed off{r.overallRating ? ` · ${stars(r.overallRating)}` : ""}
        </span>
      ) : (
        <button
          onClick={onAdvance}
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--prv-text-2)",
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border)",
            borderRadius: 100,
            padding: "4px 11px",
            cursor: "pointer",
          }}
        >
          Advance ›
        </button>
      )}
    </div>
  )
}

export function ReviewsClient() {
  const { data: cyclesData, isLoading } = useReviewCycles()
  const { data: peopleData } = usePeople()
  const createCycle = useCreateReviewCycle()

  const cycles = cyclesData?.cycles ?? []
  const people = peopleData?.members ?? []

  const [selected, setSelected] = useState<string | null>(null)
  const activeCycle = selected ?? cycles[0]?.id ?? null

  const { data: reviewsData } = useReviews(activeCycle)
  const createReview = useCreateReview(activeCycle ?? "")
  const advance = useAdvanceReview(activeCycle ?? "")
  const reviews = reviewsData?.reviews ?? []

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [cadence, setCadence] = useState<(typeof CADENCE)[number]>("annual")
  const [addUser, setAddUser] = useState("")

  function submitCycle() {
    if (!name.trim()) return
    createCycle.mutate(
      { name: name.trim(), cadence },
      {
        onSuccess: () => {
          setName("")
          setShowForm(false)
        },
      }
    )
  }

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "8px 4px 60px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--prv-text-3)",
            }}
          >
            People · HR
          </div>
          <h1
            style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-0.02em", margin: "3px 0 0" }}
          >
            Performance Reviews
          </h1>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            padding: "9px 16px",
            borderRadius: 100,
            background: showForm ? "var(--prv-g2)" : "rgba(255,255,255,0.92)",
            color: showForm ? "var(--prv-text-1)" : "#000",
            border: showForm ? "1px solid var(--prv-border)" : "none",
            fontSize: 13,
            fontWeight: 640,
            cursor: "pointer",
          }}
        >
          {showForm ? "Cancel" : "＋ New cycle"}
        </button>
      </div>

      {showForm && (
        <div
          style={{
            borderRadius: 20,
            padding: 16,
            margin: "18px 0",
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <label style={fieldWrap}>
            <span style={fieldLbl}>Cycle name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 2026 Annual Review"
              style={{ ...inp, minWidth: 200 }}
            />
          </label>
          <label style={fieldWrap}>
            <span style={fieldLbl}>Cadence</span>
            <select
              value={cadence}
              onChange={(e) => setCadence(e.target.value as (typeof CADENCE)[number])}
              style={inp}
            >
              {CADENCE.map((c) => (
                <option key={c} value={c}>
                  {CADENCE_LABEL[c]}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={submitCycle}
            disabled={createCycle.isPending}
            style={{
              padding: "9px 18px",
              borderRadius: 100,
              background: "rgba(255,255,255,0.92)",
              color: "#000",
              border: "none",
              fontSize: 13,
              fontWeight: 640,
              cursor: "pointer",
              opacity: createCycle.isPending ? 0.5 : 1,
            }}
          >
            Open
          </button>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        {isLoading ? (
          <p style={{ padding: "40px 20px", color: "var(--prv-text-4)" }}>Loading cycles…</p>
        ) : cycles.length === 0 ? (
          <p
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--prv-text-4)",
              fontSize: 14,
              borderRadius: 20,
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
            }}
          >
            No review cycles yet. Use “New cycle” to start one.
          </p>
        ) : (
          cycles.map((c) => (
            <CycleCard
              key={c.id}
              c={c}
              selected={c.id === activeCycle}
              onSelect={() => setSelected(c.id)}
            />
          ))
        )}
      </div>

      {activeCycle && cycles.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "24px 4px 12px" }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--prv-text-3)",
              }}
            >
              Reviews · this cycle
            </span>
            <select
              value={addUser}
              onChange={(e) => {
                const v = e.target.value
                if (v) {
                  createReview.mutate({ userId: v })
                  setAddUser("")
                }
              }}
              style={{ ...inp, marginLeft: "auto", fontSize: 12 }}
            >
              <option value="">＋ Add employee…</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </select>
          </div>
          <div
            style={{
              borderRadius: 20,
              overflow: "hidden",
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
            }}
          >
            {reviews.length === 0 ? (
              <p
                style={{
                  padding: "36px 20px",
                  textAlign: "center",
                  color: "var(--prv-text-4)",
                  fontSize: 14,
                }}
              >
                No employees in this cycle yet.
              </p>
            ) : (
              reviews.map((r) => (
                <ReviewRow
                  key={r.id}
                  r={r}
                  onAdvance={() => advance.mutate({ id: r.id, rating: 4 })}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

const inp: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  background: "var(--prv-g1)",
  border: "1px solid var(--prv-border)",
  color: "var(--prv-text-1)",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
}
const fieldWrap: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5 }
const fieldLbl: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--prv-text-3)",
}
