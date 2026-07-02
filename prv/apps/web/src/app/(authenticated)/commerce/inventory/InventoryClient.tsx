"use client"

import { useState } from "react"
import {
  useInventory,
  useStockMovements,
  useRecordMovement,
  useStoreOptions,
  useProductOptions,
  type StockLevelRow,
  type StockMovementRow,
} from "@/lib/api-hooks"

const TYPES = ["receive", "sale", "adjust", "writeoff", "return", "count"] as const
const TYPE_LABEL: Record<string, string> = {
  receive: "Receive",
  sale: "Sale",
  adjust: "Adjust",
  writeoff: "Write-off",
  return: "Return",
  count: "Count",
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warn" | "bad" }) {
  const color =
    tone === "bad"
      ? "rgba(255,69,58,0.9)"
      : tone === "warn"
        ? "rgba(255,159,10,0.95)"
        : "var(--prv-text-1)"
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
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 6, color }}>
        {value}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: StockLevelRow["status"] }) {
  const map = {
    ok: ["rgba(48,209,88,0.9)", "transparent", "rgba(48,209,88,0.26)", "OK"],
    low: ["rgba(255,159,10,0.95)", "rgba(255,159,10,0.14)", "rgba(255,159,10,0.28)", "Low"],
    reorder: ["rgba(255,159,10,0.95)", "rgba(255,159,10,0.2)", "rgba(255,159,10,0.34)", "Reorder"],
    out: ["rgba(255,69,58,0.9)", "rgba(255,69,58,0.14)", "rgba(255,69,58,0.3)", "Out"],
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

function LevelRow({ l }: { l: StockLevelRow }) {
  const qtyColor = l.status === "out" ? "rgba(255,69,58,0.9)" : "var(--prv-text-1)"
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
        <div style={{ fontSize: 14, fontWeight: 640, letterSpacing: "-0.01em" }}>
          {l.productName ?? "—"}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: "var(--prv-text-3)",
            marginTop: 3,
            display: "flex",
            gap: 10,
          }}
        >
          {l.sku && <span style={{ fontFamily: "'SF Mono', monospace" }}>SKU · {l.sku}</span>}
          {l.storeName && <span>{l.storeName}</span>}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 720,
            fontVariantNumeric: "tabular-nums",
            color: qtyColor,
          }}
        >
          {l.quantity}
        </div>
        <div style={{ fontSize: 10.5, color: "var(--prv-text-4)", marginTop: 2 }}>
          {l.reorderPoint != null ? `reorder ${l.reorderPoint}` : `min ${l.minimum}`}
        </div>
      </div>
      <StatusBadge status={l.status} />
    </div>
  )
}

function MovementRow({ m }: { m: StockMovementRow }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 16px",
        borderBottom: "1px solid var(--prv-border-subtle)",
        fontSize: 12.5,
      }}
    >
      <span
        style={{
          fontSize: 9.5,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--prv-text-3)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 5,
          padding: "2px 7px",
          flexShrink: 0,
        }}
      >
        {TYPE_LABEL[m.type]}
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          color: "var(--prv-text-2)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {m.productName ?? "—"}
        {m.reason ? ` · ${m.reason}` : ""}
      </span>
      <span
        style={{
          fontVariantNumeric: "tabular-nums",
          fontWeight: 700,
          color: m.delta >= 0 ? "rgba(48,209,88,0.9)" : "rgba(255,69,58,0.9)",
        }}
      >
        {m.delta >= 0 ? `+${m.delta}` : m.delta}
      </span>
      <span style={{ color: "var(--prv-text-3)", fontVariantNumeric: "tabular-nums" }}>
        → {m.balanceAfter}
      </span>
    </div>
  )
}

export function InventoryClient() {
  const [storeFilter, setStoreFilter] = useState("")
  const { data, isLoading } = useInventory(storeFilter || null)
  const { data: movesData } = useStockMovements()
  const { data: storesData } = useStoreOptions()
  const { data: productsData } = useProductOptions()
  const record = useRecordMovement()

  const levels = data?.levels ?? []
  const meta = data?.meta
  const movements = movesData?.movements ?? []
  const stores = storesData?.stores ?? []
  const products = productsData?.products ?? []

  const [showForm, setShowForm] = useState(false)
  const [productId, setProductId] = useState("")
  const [storeId, setStoreId] = useState("")
  const [type, setType] = useState<(typeof TYPES)[number]>("receive")
  const [quantity, setQuantity] = useState("")

  function submit() {
    if (!productId || !storeId || !quantity.trim()) return
    record.mutate(
      { productId, storeId, type, quantity: Number(quantity) || 0 },
      {
        onSuccess: () => {
          setQuantity("")
          setShowForm(false)
        },
      }
    )
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "8px 4px 60px" }}>
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
            Commerce · Inventory
          </div>
          <h1
            style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-0.02em", margin: "3px 0 0" }}
          >
            Stock Levels
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
          {showForm ? "Cancel" : "＋ Movement"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          margin: "20px 0 22px",
        }}
      >
        <Stat label="SKUs" value={meta?.skus ?? 0} />
        <Stat
          label="Reorder"
          value={meta?.reorder ?? 0}
          tone={meta?.reorder ? "warn" : undefined}
        />
        <Stat label="Low" value={meta?.low ?? 0} tone={meta?.low ? "warn" : undefined} />
        <Stat label="Out" value={meta?.out ?? 0} tone={meta?.out ? "bad" : undefined} />
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
          <Field label="Product">
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              style={{ ...inp, minWidth: 160 }}
            >
              <option value="">Select…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Store">
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              style={{ ...inp, minWidth: 130 }}
            >
              <option value="">Select…</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
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
          <Field label={type === "adjust" || type === "count" ? "Set to" : "Quantity"}>
            <input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              inputMode="numeric"
              placeholder="0"
              style={{ ...inp, width: 90 }}
            />
          </Field>
          <button
            onClick={submit}
            disabled={record.isPending}
            style={{
              padding: "9px 18px",
              borderRadius: 100,
              background: "rgba(255,255,255,0.92)",
              color: "#000",
              border: "none",
              fontSize: 13,
              fontWeight: 640,
              cursor: "pointer",
              opacity: record.isPending ? 0.5 : 1,
            }}
          >
            Record
          </button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 4px 12px" }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--prv-text-3)",
          }}
        >
          Levels · worst first
        </span>
        <select
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          style={{ ...inp, marginLeft: "auto", fontSize: 12 }}
        >
          <option value="">All stores</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
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
            Loading inventory…
          </p>
        ) : levels.length === 0 ? (
          <p
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--prv-text-4)",
              fontSize: 14,
            }}
          >
            No stock levels yet. Record a receive movement to start tracking.
          </p>
        ) : (
          levels.map((l) => <LevelRow key={l.id} l={l} />)
        )}
      </div>

      {movements.length > 0 && (
        <>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--prv-text-3)",
              margin: "22px 4px 12px",
            }}
          >
            Recent movements
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
            {movements.slice(0, 12).map((m) => (
              <MovementRow key={m.id} m={m} />
            ))}
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
