"use client"

import { useState } from "react"
import Link from "next/link"
import { useRequisitions, useCreateRequisition, type RequisitionSummary } from "@/lib/api-hooks"

const TYPES = ["permanent", "fixed_term", "contractor", "intern"] as const
const TYPE_LABEL: Record<string, string> = {
  permanent: "Permanent",
  fixed_term: "Fixed-term",
  contractor: "Contractor",
  intern: "Intern",
}
const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  on_hold: "On hold",
  filled: "Filled",
  closed: "Closed",
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: "14px 16px",
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--prv-text-3)",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 6 }}>
        {value}
      </div>
    </div>
  )
}

function ReqRow({ r }: { r: RequisitionSummary }) {
  return (
    <Link
      href={`/recruitment/${r.id}`}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 13,
          padding: "14px 16px",
          borderBottom: "1px solid var(--prv-border-subtle)",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 640, letterSpacing: "-0.01em" }}>{r.title}</div>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--prv-text-3)",
              marginTop: 3,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: "var(--prv-text-4)",
                border: "1px solid var(--prv-border-subtle)",
                borderRadius: 5,
                padding: "2px 6px",
              }}
            >
              {TYPE_LABEL[r.employmentType]}
            </span>
            {r.departmentName && <span>{r.departmentName}</span>}
            {r.location && <span>{r.location}</span>}
            <span>
              {r.headcount} opening{r.headcount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {r.activeCount}{" "}
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--prv-text-3)" }}>
              active
            </span>
          </div>
          <div style={{ fontSize: 11, color: "var(--prv-text-3)", marginTop: 3 }}>
            {r.hiredCount} hired · {r.candidateCount} total
          </div>
        </div>
        <span
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            borderRadius: 100,
            padding: "3px 9px",
            color: r.status === "open" ? "rgba(48,209,88,0.9)" : "var(--prv-text-2)",
            background: r.status === "open" ? "rgba(48,209,88,0.12)" : "transparent",
            border: `1px solid ${r.status === "open" ? "rgba(48,209,88,0.26)" : "var(--prv-border)"}`,
          }}
        >
          {STATUS_LABEL[r.status]}
        </span>
      </div>
    </Link>
  )
}

export function RecruitmentClient() {
  const { data, isLoading } = useRequisitions()
  const create = useCreateRequisition()

  const requisitions = data?.requisitions ?? []
  const meta = data?.meta

  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState("")
  const [type, setType] = useState<(typeof TYPES)[number]>("permanent")
  const [headcount, setHeadcount] = useState("1")
  const [location, setLocation] = useState("")

  function submit() {
    if (!title.trim()) return
    create.mutate(
      {
        title: title.trim(),
        employmentType: type,
        headcount: Number(headcount) || 1,
        location: location.trim() || null,
      },
      {
        onSuccess: () => {
          setTitle("")
          setLocation("")
          setHeadcount("1")
          setShowForm(false)
        },
      }
    )
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "8px 4px 60px" }}>
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
            People · Recruitment
          </div>
          <h1
            style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-0.02em", margin: "3px 0 0" }}
          >
            Requisitions
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
          {showForm ? "Cancel" : "＋ Open role"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
          margin: "20px 0 22px",
        }}
      >
        <Stat label="Open roles" value={meta?.open ?? 0} />
        <Stat label="Open headcount" value={meta?.openHeadcount ?? 0} />
        <Stat label="In pipeline" value={meta?.candidatesInPipeline ?? 0} />
      </div>

      {showForm && (
        <div
          style={{
            borderRadius: 20,
            padding: 16,
            marginBottom: 22,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <Field label="Role title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Site Electrician"
              style={{ ...inp, minWidth: 180 }}
            />
          </Field>
          <Field label="Type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as (typeof TYPES)[number])}
              style={inp}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Headcount">
            <input
              value={headcount}
              onChange={(e) => setHeadcount(e.target.value)}
              inputMode="numeric"
              style={{ ...inp, width: 80 }}
            />
          </Field>
          <Field label="Location">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="optional"
              style={{ ...inp, width: 130 }}
            />
          </Field>
          <button
            onClick={submit}
            disabled={create.isPending}
            style={{
              padding: "9px 18px",
              borderRadius: 100,
              background: "rgba(255,255,255,0.92)",
              color: "#000",
              border: "none",
              fontSize: 13,
              fontWeight: 640,
              cursor: "pointer",
              opacity: create.isPending ? 0.5 : 1,
            }}
          >
            Open
          </button>
        </div>
      )}

      <div
        style={{
          borderRadius: 22,
          overflow: "hidden",
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
        }}
      >
        {isLoading ? (
          <p style={{ padding: "40px 20px", textAlign: "center", color: "var(--prv-text-4)" }}>
            Loading requisitions…
          </p>
        ) : requisitions.length === 0 ? (
          <p
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--prv-text-4)",
              fontSize: 14,
            }}
          >
            No open roles yet. Use “Open role” to create the first requisition.
          </p>
        ) : (
          requisitions.map((r) => <ReqRow key={r.id} r={r} />)
        )}
      </div>
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
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--prv-text-3)",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}
