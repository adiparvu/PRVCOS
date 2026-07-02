"use client"

import { useState } from "react"
import Link from "next/link"
import {
  useProductVariants,
  useCreateVariant,
  useDeleteVariant,
  type ProductVariant,
} from "@/lib/api-hooks"

// Parse "Colour=Black, Size=L" into { Colour: "Black", Size: "L" }.
function parseOptions(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of text.split(",")) {
    const [k, ...rest] = part.split("=")
    const key = (k ?? "").trim()
    const val = rest.join("=").trim()
    if (key && val) out[key] = val
  }
  return out
}

function optionsText(o: Record<string, string>): string {
  return Object.entries(o)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ")
}

function VariantRow({ v, onDelete }: { v: ProductVariant; onDelete: () => void }) {
  const stockClass = v.stockQuantity <= 0 ? "out" : v.stockQuantity <= 5 ? "low" : "ok"
  const stockColor =
    stockClass === "out"
      ? "rgba(255,69,58,0.9)"
      : stockClass === "low"
        ? "rgba(255,159,10,0.95)"
        : "var(--prv-text-4)"
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
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 640,
            letterSpacing: "-0.01em",
            opacity: v.isActive ? 1 : 0.5,
          }}
        >
          {v.name}
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
          {v.sku && <span style={{ fontFamily: "'SF Mono', monospace" }}>{v.sku}</span>}
          {Object.keys(v.options).length > 0 && <span>{optionsText(v.options)}</span>}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          {v.price != null ? `€${v.price}` : "—"}
        </div>
        <div style={{ fontSize: 10.5, marginTop: 2, color: stockColor }}>
          {v.stockQuantity <= 0 ? "Out" : `${v.stockQuantity} in stock`}
        </div>
      </div>
      <button
        onClick={onDelete}
        aria-label="Remove variant"
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

export function VariantsClient({ productId }: { productId: string }) {
  const { data, isLoading } = useProductVariants(productId)
  const create = useCreateVariant(productId)
  const del = useDeleteVariant(productId)

  const variants = data?.variants ?? []
  const axes = data?.axes ?? {}
  const range = data?.priceRange ?? null

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [sku, setSku] = useState("")
  const [options, setOptions] = useState("")
  const [price, setPrice] = useState("")
  const [stock, setStock] = useState("")

  function submit() {
    if (!name.trim()) return
    create.mutate(
      {
        name: name.trim(),
        sku: sku.trim() || null,
        options: parseOptions(options),
        price: price.trim() ? Number(price) : null,
        stockQuantity: Number(stock) || 0,
      },
      {
        onSuccess: () => {
          setName("")
          setSku("")
          setOptions("")
          setPrice("")
          setStock("")
          setShowForm(false)
        },
      }
    )
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "8px 4px 60px" }}>
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
            Variants
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
          {showForm ? "Cancel" : "＋ Variant"}
        </button>
      </div>

      {(Object.keys(axes).length > 0 || range) && (
        <div
          style={{
            display: "flex",
            gap: 18,
            flexWrap: "wrap",
            borderRadius: 18,
            padding: "14px 16px",
            margin: "20px 0",
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
          }}
        >
          {Object.entries(axes).map(([key, vals]) => (
            <div key={key}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--prv-text-3)",
                  marginBottom: 7,
                }}
              >
                {key}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {vals.map((v) => (
                  <span
                    key={v}
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "var(--prv-text-2)",
                      background: "var(--prv-g1)",
                      border: "1px solid var(--prv-border-subtle)",
                      borderRadius: 100,
                      padding: "3px 10px",
                    }}
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {range && (
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--prv-text-3)",
                }}
              >
                Price range
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>
                €{range.min} – €{range.max}
              </div>
            </div>
          )}
        </div>
      )}

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
              placeholder="e.g. Black / L"
              style={{ ...inp, minWidth: 140 }}
            />
          </Field>
          <Field label="SKU">
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="optional"
              style={{ ...inp, width: 120 }}
            />
          </Field>
          <Field label="Options">
            <input
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              placeholder="Colour=Black, Size=L"
              style={{ ...inp, minWidth: 160 }}
            />
          </Field>
          <Field label="Price">
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              placeholder="base"
              style={{ ...inp, width: 80 }}
            />
          </Field>
          <Field label="Stock">
            <input
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              inputMode="numeric"
              placeholder="0"
              style={{ ...inp, width: 70 }}
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
            Add
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
            Loading variants…
          </p>
        ) : variants.length === 0 ? (
          <p
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--prv-text-4)",
              fontSize: 14,
            }}
          >
            No variants yet. Add one to sell this product in multiple options.
          </p>
        ) : (
          variants.map((v) => <VariantRow key={v.id} v={v} onDelete={() => del.mutate(v.id)} />)
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
