"use client"

import { useState } from "react"
import {
  usePromotions,
  useCreatePromotion,
  useUpdatePromotion,
  useDeletePromotion,
  type PromotionSummary,
} from "@/lib/api-hooks"

const TYPES = ["percentage", "fixed_amount", "free_shipping"] as const
const TYPE_LABEL: Record<string, string> = {
  percentage: "Percentage",
  fixed_amount: "Fixed amount",
  free_shipping: "Free shipping",
}

function discountBadge(p: PromotionSummary): { n: string; u: string } {
  if (p.type === "percentage") return { n: `${p.value}%`, u: "Off" }
  if (p.type === "fixed_amount") return { n: `€${p.value}`, u: "Off" }
  return { n: "Free", u: "Ship" }
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

function StatusBadge({ status }: { status: PromotionSummary["status"] }) {
  const map = {
    active: ["rgba(48,209,88,0.9)", "rgba(48,209,88,0.12)", "rgba(48,209,88,0.26)", "Live"],
    paused: ["rgba(255,159,10,0.95)", "rgba(255,159,10,0.14)", "rgba(255,159,10,0.28)", "Paused"],
    draft: ["var(--prv-text-2)", "transparent", "var(--prv-border)", "Draft"],
    expired: ["var(--prv-text-3)", "transparent", "var(--prv-border)", "Expired"],
  } as const
  const [c, b, br, label] = map[status]
  return (
    <span
      style={{
        fontSize: 9.5,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        borderRadius: 100,
        padding: "3px 9px",
        color: c,
        background: b,
        border: `1px solid ${br}`,
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  )
}

function Row({
  p,
  onToggle,
  onDelete,
}: {
  p: PromotionSummary
  onToggle: () => void
  onDelete: () => void
}) {
  const d = discountBadge(p)
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: "14px 16px",
        borderBottom: "1px solid var(--prv-border-subtle)",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: "var(--prv-g2)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
        }}
      >
        <span style={{ fontSize: 17, fontWeight: 720, letterSpacing: "-0.02em", lineHeight: 1 }}>
          {d.n}
        </span>
        <span
          style={{
            fontSize: 8.5,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--prv-text-3)",
            marginTop: 2,
          }}
        >
          {d.u}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 640, letterSpacing: "-0.01em" }}>{p.name}</div>
        <div
          style={{
            fontSize: 11.5,
            color: "var(--prv-text-3)",
            marginTop: 3,
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {p.code ? (
            <span
              style={{
                fontFamily: "'SF Mono', monospace",
                fontWeight: 700,
                color: "var(--prv-text-2)",
                border: "1px dashed var(--prv-border)",
                borderRadius: 6,
                padding: "1px 7px",
              }}
            >
              {p.code}
            </span>
          ) : (
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--prv-text-3)",
                border: "1px solid var(--prv-border-subtle)",
                borderRadius: 100,
                padding: "2px 7px",
              }}
            >
              Auto-apply
            </span>
          )}
          {p.minSubtotal > 0 && <span>min €{p.minSubtotal}</span>}
        </div>
        <div style={{ fontSize: 10.5, color: "var(--prv-text-4)", marginTop: 4 }}>
          {p.usageCount}
          {p.usageLimit != null ? ` / ${p.usageLimit}` : ""} redeemed
          {p.endsAt ? ` · ends ${p.endsAt}` : ""}
        </div>
      </div>
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 8,
        }}
      >
        <StatusBadge status={p.status} />
        <div style={{ display: "flex", gap: 6 }}>
          {p.status === "active" ? (
            <Act label="Pause" onClick={onToggle} />
          ) : p.status === "paused" || p.status === "draft" ? (
            <Act label="Activate" onClick={onToggle} />
          ) : null}
          <Act label="×" onClick={onDelete} />
        </div>
      </div>
    </div>
  )
}
function Act({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
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
      {label}
    </button>
  )
}

export function PromotionsClient() {
  const { data, isLoading } = usePromotions()
  const create = useCreatePromotion()
  const update = useUpdatePromotion()
  const del = useDeletePromotion()

  const promotions = data?.promotions ?? []
  const meta = data?.meta

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [type, setType] = useState<(typeof TYPES)[number]>("percentage")
  const [value, setValue] = useState("")
  const [code, setCode] = useState("")
  const [min, setMin] = useState("")

  function submit() {
    if (!name.trim() || (type !== "free_shipping" && !value.trim())) return
    create.mutate(
      {
        name: name.trim(),
        type,
        value: type === "free_shipping" ? 0 : Number(value) || 0,
        code: code.trim() || null,
        minSubtotal: Number(min) || 0,
        status: "active",
        autoApply: !code.trim(),
      },
      {
        onSuccess: () => {
          setName("")
          setValue("")
          setCode("")
          setMin("")
          setShowForm(false)
        },
      }
    )
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "8px 4px 60px" }}>
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
            Commerce · Promotions
          </div>
          <h1
            style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-0.02em", margin: "3px 0 0" }}
          >
            Promotions
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
          {showForm ? "Cancel" : "＋ New promotion"}
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
        <Stat label="Total" value={meta?.total ?? 0} />
        <Stat label="Active" value={meta?.active ?? 0} />
        <Stat label="Redeemable now" value={meta?.redeemable ?? 0} />
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
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Spring Sale"
              style={{ ...inp, minWidth: 160 }}
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
          {type !== "free_shipping" && (
            <Field label={type === "percentage" ? "Percent" : "Amount"}>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                style={{ ...inp, width: 80 }}
              />
            </Field>
          )}
          <Field label="Code (blank = auto)">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SPRING15"
              style={{ ...inp, width: 120 }}
            />
          </Field>
          <Field label="Min spend">
            <input
              value={min}
              onChange={(e) => setMin(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              style={{ ...inp, width: 90 }}
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
            Create
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
            Loading promotions…
          </p>
        ) : promotions.length === 0 ? (
          <p
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--prv-text-4)",
              fontSize: 14,
            }}
          >
            No promotions yet. Use “New promotion” to create one.
          </p>
        ) : (
          promotions.map((p) => (
            <Row
              key={p.id}
              p={p}
              onToggle={() =>
                update.mutate({
                  id: p.id,
                  patch: { status: p.status === "active" ? "paused" : "active" },
                })
              }
              onDelete={() => del.mutate(p.id)}
            />
          ))
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
