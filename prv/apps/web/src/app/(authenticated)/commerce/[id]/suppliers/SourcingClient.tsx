"use client"

import { useState } from "react"
import Link from "next/link"
import {
  useProductSuppliers,
  useSupplierOptions,
  useLinkSupplier,
  useUpdateProductSupplier,
  useUnlinkSupplier,
  type ProductSupplierLink,
} from "@/lib/api-hooks"

function Star({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={on ? "Preferred supplier" : "Set preferred"}
      aria-pressed={on}
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        border: "1px solid var(--prv-border-subtle)",
        background: on ? "rgba(255,255,255,0.14)" : "var(--prv-g1)",
        color: on ? "var(--prv-text-1)" : "var(--prv-text-3)",
        cursor: "pointer",
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={on ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  )
}

function LinkRow({
  l,
  onPrefer,
  onDelete,
}: {
  l: ProductSupplierLink
  onPrefer: () => void
  onDelete: () => void
}) {
  const bits: string[] = []
  if (l.leadTimeDays != null)
    bits.push(`lead ${l.leadTimeDays} day${l.leadTimeDays === 1 ? "" : "s"}`)
  if (l.minOrderQty != null) bits.push(`MOQ ${l.minOrderQty}`)
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
      <Star on={l.isPreferred} onClick={onPrefer} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 640, letterSpacing: "-0.01em" }}>
          {l.supplierName ?? "—"}
          {l.isPreferred && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--prv-text-1)",
                background: "var(--prv-g2)",
                border: "1px solid var(--prv-border-subtle)",
                borderRadius: 100,
                padding: "2px 8px",
                marginLeft: 8,
              }}
            >
              Preferred
            </span>
          )}
        </div>
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
          {l.supplierSku && (
            <span style={{ fontFamily: "'SF Mono', monospace" }}>{l.supplierSku}</span>
          )}
          {bits.length > 0 && <span>{bits.join(" · ")}</span>}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          {l.cost != null ? `€${l.cost}` : "—"}
        </div>
        <div style={{ fontSize: 10.5, color: "var(--prv-text-4)", marginTop: 2 }}>per unit</div>
      </div>
      <button
        onClick={onDelete}
        aria-label="Unlink supplier"
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          border: "1px solid var(--prv-border-subtle)",
          background: "transparent",
          color: "var(--prv-text-3)",
          cursor: "pointer",
          fontSize: 14,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}

export function SourcingClient({ productId }: { productId: string }) {
  const { data, isLoading } = useProductSuppliers(productId)
  const { data: supData } = useSupplierOptions()
  const link = useLinkSupplier(productId)
  const update = useUpdateProductSupplier(productId)
  const unlink = useUnlinkSupplier(productId)

  const links = data?.links ?? []
  const suppliers = supData?.suppliers ?? []
  const linkedIds = new Set(links.map((l) => l.supplierId))
  const available = suppliers.filter((s) => !linkedIds.has(s.id))

  const [showForm, setShowForm] = useState(false)
  const [supplierId, setSupplierId] = useState("")
  const [cost, setCost] = useState("")
  const [sku, setSku] = useState("")
  const [lead, setLead] = useState("")
  const [preferred, setPreferred] = useState(false)

  function submit() {
    if (!supplierId) return
    link.mutate(
      {
        supplierId,
        cost: cost.trim() ? Number(cost) : null,
        supplierSku: sku.trim() || null,
        leadTimeDays: lead.trim() ? Number(lead) : null,
        isPreferred: preferred,
      },
      {
        onSuccess: () => {
          setSupplierId("")
          setCost("")
          setSku("")
          setLead("")
          setPreferred(false)
          setShowForm(false)
        },
      }
    )
  }

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "8px 4px 60px" }}>
      <Link
        href={`/commerce/${productId}`}
        style={{
          fontSize: 12.5,
          color: "var(--prv-text-3)",
          textDecoration: "none",
          display: "inline-flex",
          gap: 5,
          marginBottom: 12,
        }}
      >
        ‹ Back to product
      </Link>
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
            Commerce · Product
          </div>
          <h1
            style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-0.02em", margin: "3px 0 0" }}
          >
            Sourcing
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
          {showForm ? "Cancel" : "＋ Link supplier"}
        </button>
      </div>

      {showForm && (
        <div
          style={{
            borderRadius: 20,
            padding: 16,
            margin: "20px 0",
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <Field label="Supplier">
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              style={{ ...inp, minWidth: 150 }}
            >
              <option value="">Select…</option>
              {available.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cost / unit">
            <input
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              style={{ ...inp, width: 90 }}
            />
          </Field>
          <Field label="Supplier SKU">
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="optional"
              style={{ ...inp, width: 120 }}
            />
          </Field>
          <Field label="Lead days">
            <input
              value={lead}
              onChange={(e) => setLead(e.target.value)}
              inputMode="numeric"
              placeholder="—"
              style={{ ...inp, width: 80 }}
            />
          </Field>
          <label style={{ ...fieldWrap, flexDirection: "row", alignItems: "center", gap: 7 }}>
            <input
              type="checkbox"
              checked={preferred}
              onChange={(e) => setPreferred(e.target.checked)}
            />
            <span style={{ fontSize: 12, color: "var(--prv-text-2)" }}>Preferred</span>
          </label>
          <button
            onClick={submit}
            disabled={!supplierId || link.isPending}
            style={{
              padding: "9px 18px",
              borderRadius: 100,
              background: "rgba(255,255,255,0.92)",
              color: "#000",
              border: "none",
              fontSize: 13,
              fontWeight: 640,
              cursor: "pointer",
              opacity: supplierId && !link.isPending ? 1 : 0.5,
            }}
          >
            Link
          </button>
        </div>
      )}

      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--prv-text-3)",
          margin: "20px 4px 12px",
        }}
      >
        Suppliers · preferred first
      </div>
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
            Loading suppliers…
          </p>
        ) : links.length === 0 ? (
          <p
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--prv-text-4)",
              fontSize: 14,
            }}
          >
            No suppliers linked yet. Link one to source this product.
          </p>
        ) : (
          links.map((l) => (
            <LinkRow
              key={l.id}
              l={l}
              onPrefer={() => update.mutate({ id: l.id, patch: { isPreferred: !l.isPreferred } })}
              onDelete={() => unlink.mutate(l.id)}
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
const fieldWrap: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5 }
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={fieldWrap}>
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
