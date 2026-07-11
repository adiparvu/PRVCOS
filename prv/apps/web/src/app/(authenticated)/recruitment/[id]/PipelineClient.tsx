"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useSheetStack } from "@prv/ui"
import {
  useCandidates,
  useCreateCandidate,
  useUpdateCandidate,
  useDeleteCandidate,
  type Candidate,
  type CandidateStage,
} from "@/lib/api-hooks"

const COLUMNS: { stage: CandidateStage; label: string }[] = [
  { stage: "sourcing", label: "Sourcing" },
  { stage: "screening", label: "Screening" },
  { stage: "phone_screen", label: "Phone" },
  { stage: "interview", label: "Interview" },
  { stage: "assessment", label: "Assessment" },
  { stage: "offer", label: "Offer" },
  { stage: "hired", label: "Hired" },
  { stage: "rejected", label: "Rejected" },
]

function stars(rating: number | null): string {
  if (!rating) return ""
  return "★★★★★".slice(0, rating) + "☆☆☆☆☆".slice(0, 5 - rating)
}

export function PipelineClient({ requisitionId }: { requisitionId: string }) {
  const { data, isLoading } = useCandidates(requisitionId)
  const create = useCreateCandidate(requisitionId)
  const update = useUpdateCandidate(requisitionId)
  const del = useDeleteCandidate(requisitionId)

  const candidates = useMemo(() => data?.candidates ?? [], [data])
  const [dragId, setDragId] = useState<string | null>(null)
  const { openSheet } = useSheetStack()

  function openMove(c: Candidate) {
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: `Move ${c.fullName}`,
      render: (onClose) => (
        <div style={{ padding: "0 14px 26px", display: "flex", flexDirection: "column", gap: 6 }}>
          <p
            style={{
              fontSize: 12,
              color: "var(--prv-text-3)",
              textAlign: "center",
              margin: "0 0 8px",
            }}
          >
            Currently in {COLUMNS.find((col) => col.stage === c.stage)?.label ?? c.stage}
          </p>
          {COLUMNS.map((col) => {
            const isCurrent = col.stage === c.stage
            const dot =
              col.stage === "hired"
                ? "rgba(48,209,88,0.9)"
                : col.stage === "rejected"
                  ? "rgba(255,69,58,0.85)"
                  : "rgba(255,255,255,0.4)"
            return (
              <button
                key={col.stage}
                disabled={isCurrent}
                onClick={() => {
                  update.mutate({ id: c.id, patch: { stage: col.stage } })
                  onClose()
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--prv-border-subtle)",
                  color: "var(--prv-text-1)",
                  fontSize: 14,
                  fontWeight: 600,
                  textAlign: "left",
                  cursor: isCurrent ? "default" : "pointer",
                  opacity: isCurrent ? 0.4 : 1,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: dot,
                    flexShrink: 0,
                  }}
                />
                {col.label}
                {isCurrent ? " · current" : ""}
              </button>
            )
          })}
        </div>
      ),
    })
  }
  const [overCol, setOverCol] = useState<CandidateStage | null>(null)
  const [addingIn, setAddingIn] = useState<CandidateStage | null>(null)
  const [draftName, setDraftName] = useState("")

  const byStage = (s: CandidateStage) => candidates.filter((c) => c.stage === s)

  function onDrop(stage: CandidateStage) {
    setOverCol(null)
    const c = candidates.find((x) => x.id === dragId)
    setDragId(null)
    if (!c || c.stage === stage) return
    update.mutate({ id: c.id, patch: { stage } })
  }

  function submitDraft(stage: CandidateStage) {
    const name = draftName.trim()
    if (!name) {
      setAddingIn(null)
      return
    }
    create.mutate({ requisitionId, fullName: name, stage })
    setDraftName("")
    setAddingIn(null)
  }

  return (
    <div style={{ padding: "8px 4px 60px" }}>
      <Link
        href="/recruitment"
        style={{
          fontSize: 12.5,
          color: "var(--prv-text-3)",
          textDecoration: "none",
          display: "inline-flex",
          gap: 5,
          marginBottom: 12,
        }}
      >
        ‹ Back to requisitions
      </Link>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--prv-text-3)",
        }}
      >
        People · Recruitment
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-0.02em", margin: "3px 0 20px" }}>
        Candidate Pipeline
      </h1>

      {isLoading ? (
        <p style={{ padding: "40px 20px", color: "var(--prv-text-4)" }}>Loading pipeline…</p>
      ) : (
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
          {COLUMNS.map((col) => {
            const list = byStage(col.stage)
            return (
              <div key={col.stage} style={{ flex: "0 0 200px" }}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "0 4px 10px" }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      color: "var(--prv-text-2)",
                    }}
                  >
                    {col.label}
                  </span>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: "var(--prv-text-3)",
                      background: "var(--prv-g1)",
                      border: "1px solid var(--prv-border-subtle)",
                      borderRadius: 100,
                      padding: "1px 7px",
                    }}
                  >
                    {list.length}
                  </span>
                </div>
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    if (overCol !== col.stage) setOverCol(col.stage)
                  }}
                  onDragLeave={() => setOverCol((c) => (c === col.stage ? null : c))}
                  onDrop={() => onDrop(col.stage)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 9,
                    borderRadius: 18,
                    padding: 9,
                    minHeight: 100,
                    background:
                      overCol === col.stage ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                    border:
                      overCol === col.stage
                        ? "1px solid var(--prv-border)"
                        : "1px solid var(--prv-border-subtle)",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                >
                  {list.map((c) => (
                    <Card
                      key={c.id}
                      c={c}
                      dragging={dragId === c.id}
                      onDragStart={() => setDragId(c.id)}
                      onDragEnd={() => {
                        setDragId(null)
                        setOverCol(null)
                      }}
                      onDelete={() => del.mutate(c.id)}
                      onMove={() => openMove(c)}
                    />
                  ))}
                  {addingIn === col.stage ? (
                    <input
                      autoFocus
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onBlur={() => submitDraft(col.stage)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitDraft(col.stage)
                        if (e.key === "Escape") {
                          setDraftName("")
                          setAddingIn(null)
                        }
                      }}
                      placeholder="Candidate name…"
                      style={{
                        padding: "9px 11px",
                        borderRadius: 11,
                        background: "var(--prv-g1)",
                        border: "1px solid var(--prv-border)",
                        color: "var(--prv-text-1)",
                        fontSize: 13,
                        outline: "none",
                        fontFamily: "inherit",
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => {
                        setDraftName("")
                        setAddingIn(col.stage)
                      }}
                      style={{
                        padding: 8,
                        borderRadius: 11,
                        border: "1px dashed var(--prv-border)",
                        background: "transparent",
                        color: "var(--prv-text-3)",
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      ＋ Add
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Card({
  c,
  dragging,
  onDragStart,
  onDragEnd,
  onDelete,
  onMove,
}: {
  c: Candidate
  dragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onDelete: () => void
  onMove: () => void
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        borderRadius: 14,
        padding: "11px 12px",
        background: "var(--prv-g1)",
        border: `1px solid ${c.stage === "hired" ? "rgba(48,209,88,0.3)" : "var(--prv-border-subtle)"}`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
        cursor: "grab",
        opacity: dragging ? 0.5 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 640,
            letterSpacing: "-0.01em",
            flex: 1,
            minWidth: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {c.fullName}
        </span>
        <button
          onClick={onMove}
          aria-label="Move candidate to another stage"
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            border: "1px solid var(--prv-border-subtle)",
            background: "transparent",
            color: "var(--prv-text-3)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          aria-label="Remove candidate"
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            border: "1px solid var(--prv-border-subtle)",
            background: "transparent",
            color: "var(--prv-text-4)",
            cursor: "pointer",
            fontSize: 12,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
      <div
        style={{
          fontSize: 10.5,
          color: "var(--prv-text-3)",
          marginTop: 5,
          display: "flex",
          alignItems: "center",
          gap: 7,
        }}
      >
        {c.rating ? (
          <span style={{ color: "var(--prv-text-2)", letterSpacing: "1px" }}>
            {stars(c.rating)}
          </span>
        ) : null}
        {c.source && (
          <span
            style={{
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 100,
              padding: "1px 7px",
            }}
          >
            {c.source}
          </span>
        )}
      </div>
    </div>
  )
}
