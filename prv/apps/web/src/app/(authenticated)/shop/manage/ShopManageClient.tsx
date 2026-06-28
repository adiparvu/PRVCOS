"use client"

import { useState, useCallback, useRef } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import type { Product, ProductCategory } from "@/app/api/shop/products/route"

// ── Types ─────────────────────────────────────────────────────────────────────

interface StockSheetState {
  product: Product
  adjustment: number
  reason: string
  saving: boolean
}

interface CreateSheetState {
  open: boolean
  name: string
  sku: string
  price: string
  unit: string
  stockQuantity: string
  stockMinimum: string
  saving: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CAT_LABELS: Record<ProductCategory, string> = {
  tamplarie: "Carpentry",
  sanitare: "Sanitare",
  electrice: "Electrice",
  pardoseli: "Pardoseli",
  vopsele: "Vopsele",
  scule: "Scule",
}

function stockColor(stock: number, min: number): string {
  if (stock === 0) return "rgba(255,69,58,0.9)"
  if (stock <= min) return "rgba(255,159,10,0.9)"
  return "rgba(90,255,160,0.9)"
}

function stockLabel(stock: number, min: number): string {
  if (stock === 0) return "Epuizat"
  if (stock <= min) return "Low Stock"
  return "In Stock"
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconChevronLeft() {
  return (
    <svg
      width="9"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.35)"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

function IconChart() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      <div
        style={{
          height: 32,
          width: 200,
          background: "var(--prv-g2)",
          borderRadius: 8,
          marginBottom: 20,
        }}
        className="animate-pulse"
      />
      <div
        style={{ height: 40, background: "var(--prv-g1)", borderRadius: 100, marginBottom: 14 }}
        className="animate-pulse"
      />
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 18 }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: 64,
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 16,
            }}
            className="animate-pulse"
          />
        ))}
      </div>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            height: 68,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            borderRadius: 14,
            marginBottom: 6,
          }}
          className="animate-pulse"
        />
      ))}
    </div>
  )
}

// ── Stock Adjustment Sheet ────────────────────────────────────────────────────

function StockSheet({
  state,
  onClose,
  onAdjChange,
  onReasonChange,
  onSave,
}: {
  state: StockSheetState
  onClose: () => void
  onAdjChange: (v: number) => void
  onReasonChange: (v: string) => void
  onSave: () => void
}) {
  const { product, adjustment, reason, saving } = state
  const after = product.stock + adjustment

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)" }}
      />
      <div
        style={{
          position: "relative",
          background: "rgba(18,18,18,0.97)",
          backdropFilter: "blur(48px)",
          WebkitBackdropFilter: "blur(48px)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 -24px 64px rgba(0,0,0,0.7)",
          borderRadius: "24px 24px 0 0",
          padding: "20px 20px 44px",
          maxWidth: 480,
          width: "100%",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 100,
            background: "rgba(255,255,255,0.18)",
            margin: "0 auto 20px",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "rgba(255,255,255,0.95)",
                letterSpacing: "-0.3px",
              }}
            >
              Ajustare stoc
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", marginTop: 2 }}>
              {product.name}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 100,
              width: 30,
              height: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.55)",
              cursor: "pointer",
            }}
          >
            <IconClose />
          </button>
        </div>

        {/* Current / After */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {[
            { label: "Curent", value: product.stock },
            { label: "Ajustare", value: adjustment > 0 ? `+${adjustment}` : adjustment },
            { label: "Rezultat", value: after, highlight: true },
          ].map(({ label, value, highlight }) => (
            <div
              key={label}
              style={{
                flex: 1,
                background: highlight ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${highlight ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.07)"}`,
                borderRadius: 14,
                padding: "10px 12px",
              }}
            >
              <p
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: highlight
                    ? after < 0
                      ? "rgba(255,69,58,0.9)"
                      : "rgba(255,255,255,0.95)"
                    : "rgba(255,255,255,0.70)",
                  letterSpacing: "-0.4px",
                }}
              >
                {value}
              </p>
              <p
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.30)",
                  marginTop: 2,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Adjustment stepper */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button
            onClick={() => onAdjChange(adjustment - 1)}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 12,
              background: "rgba(255,69,58,0.14)",
              border: "1px solid rgba(255,69,58,0.24)",
              color: "rgba(255,69,58,0.9)",
              fontSize: 22,
              fontWeight: 300,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            −
          </button>
          <input
            type="number"
            value={adjustment}
            onChange={(e) => onAdjChange(parseInt(e.target.value) || 0)}
            style={{
              flex: 2,
              height: 44,
              borderRadius: 12,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.95)",
              fontSize: 20,
              fontWeight: 700,
              textAlign: "center",
              outline: "none",
            }}
          />
          <button
            onClick={() => onAdjChange(adjustment + 1)}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 12,
              background: "rgba(90,255,160,0.12)",
              border: "1px solid rgba(90,255,160,0.22)",
              color: "rgba(90,255,160,0.9)",
              fontSize: 22,
              fontWeight: 300,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            +
          </button>
        </div>

        {/* Quick preset buttons */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {[-10, -5, +5, +10, +50, +100].map((v) => (
            <button
              key={v}
              onClick={() => onAdjChange(v)}
              style={{
                flex: 1,
                padding: "6px 0",
                borderRadius: 9,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                background: v < 0 ? "rgba(255,69,58,0.10)" : "rgba(90,255,160,0.08)",
                border: `1px solid ${v < 0 ? "rgba(255,69,58,0.18)" : "rgba(90,255,160,0.16)"}`,
                color: v < 0 ? "rgba(255,69,58,0.80)" : "rgba(90,255,160,0.80)",
              }}
            >
              {v > 0 ? `+${v}` : v}
            </button>
          ))}
        </div>

        {/* Reason */}
        <input
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Adjustment reason (optional)"
          style={{
            width: "100%",
            height: 42,
            borderRadius: 12,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.85)",
            fontSize: 13,
            padding: "0 14px",
            outline: "none",
            boxSizing: "border-box",
            marginBottom: 16,
          }}
        />

        <button
          onClick={onSave}
          disabled={saving || adjustment === 0 || after < 0}
          style={{
            width: "100%",
            height: 48,
            borderRadius: 14,
            background:
              adjustment === 0 || after < 0 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.92)",
            color: adjustment === 0 || after < 0 ? "rgba(255,255,255,0.30)" : "#000",
            fontSize: 15,
            fontWeight: 700,
            border: "none",
            cursor: adjustment === 0 || after < 0 || saving ? "default" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving..." : "Save adjustment"}
        </button>
      </div>
    </div>
  )
}

// ── Create Product Sheet ──────────────────────────────────────────────────────

const UNITS = ["buc", "m²", "ml", "kg", "l", "sac", "set", "m"]
const CATS: { id: ProductCategory; label: string }[] = [
  { id: "tamplarie", label: "Carpentry" },
  { id: "sanitare", label: "Sanitare" },
  { id: "electrice", label: "Electrice" },
  { id: "pardoseli", label: "Pardoseli" },
  { id: "vopsele", label: "Vopsele" },
  { id: "scule", label: "Scule" },
]

function CreateSheet({
  state,
  onClose,
  onChange,
  onSave,
}: {
  state: CreateSheetState
  onClose: () => void
  onChange: (field: keyof Omit<CreateSheetState, "open" | "saving">, value: string) => void
  onSave: () => void
}) {
  const { name, sku, price, unit, stockQuantity, stockMinimum, saving } = state
  const valid = name.trim().length > 0 && Number(price) >= 0

  const field = (
    label: string,
    field: keyof Omit<CreateSheetState, "open" | "saving">,
    placeholder: string,
    type = "text",
    hint?: string
  ) => (
    <div style={{ marginBottom: 12 }}>
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "rgba(255,255,255,0.35)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 5,
        }}
      >
        {label}
      </p>
      <input
        type={type}
        value={state[field] as string}
        onChange={(e) => onChange(field, e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          height: 42,
          borderRadius: 12,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          color: "rgba(255,255,255,0.88)",
          fontSize: 14,
          padding: "0 14px",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      {hint && (
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 3 }}>{hint}</p>
      )}
    </div>
  )

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)" }}
      />
      <div
        style={{
          position: "relative",
          background: "rgba(18,18,18,0.97)",
          backdropFilter: "blur(48px)",
          WebkitBackdropFilter: "blur(48px)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 -24px 64px rgba(0,0,0,0.7)",
          borderRadius: "24px 24px 0 0",
          padding: "20px 20px 44px",
          maxWidth: 480,
          width: "100%",
          margin: "0 auto",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 100,
            background: "rgba(255,255,255,0.18)",
            margin: "0 auto 20px",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <p
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "rgba(255,255,255,0.95)",
              letterSpacing: "-0.3px",
            }}
          >
            Produs nou
          </p>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 100,
              width: 30,
              height: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.55)",
              cursor: "pointer",
            }}
          >
            <IconClose />
          </button>
        </div>

        {field("Denumire *", "name", "ex. Robinet Grohe Essence")}
        {field("SKU", "sku", "ex. ROB-GRO-001")}
        {field("Price (€) *", "price", "0.00", "number")}

        <div style={{ marginBottom: 12 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,0.35)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 5,
            }}
          >
            Unit of measure
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {UNITS.map((u) => (
              <button
                key={u}
                onClick={() => onChange("unit", u)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 100,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: unit === u ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.07)",
                  color: unit === u ? "#000" : "rgba(255,255,255,0.55)",
                  border: unit === u ? "none" : "1px solid rgba(255,255,255,0.11)",
                }}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 5,
              }}
            >
              Initial stock
            </p>
            <input
              type="number"
              value={stockQuantity}
              onChange={(e) => onChange("stockQuantity", e.target.value)}
              placeholder="0"
              style={{
                width: "100%",
                height: 42,
                borderRadius: 12,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "rgba(255,255,255,0.88)",
                fontSize: 14,
                padding: "0 14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 5,
              }}
            >
              Stoc minim
            </p>
            <input
              type="number"
              value={stockMinimum}
              onChange={(e) => onChange("stockMinimum", e.target.value)}
              placeholder="0"
              style={{
                width: "100%",
                height: 42,
                borderRadius: 12,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "rgba(255,255,255,0.88)",
                fontSize: 14,
                padding: "0 14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        <button
          onClick={onSave}
          disabled={!valid || saving}
          style={{
            width: "100%",
            height: 48,
            borderRadius: 14,
            background: !valid ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.92)",
            color: !valid ? "rgba(255,255,255,0.30)" : "#000",
            fontSize: 15,
            fontWeight: 700,
            border: "none",
            cursor: !valid || saving ? "default" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Creating..." : "Create product"}
        </button>
      </div>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 100,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 300,
        background: type === "success" ? "rgba(30,30,30,0.96)" : "rgba(40,10,10,0.96)",
        border: `1px solid ${type === "success" ? "rgba(90,255,160,0.25)" : "rgba(255,69,58,0.30)"}`,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRadius: 14,
        padding: "10px 18px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: type === "success" ? "rgba(90,255,160,0.9)" : "rgba(255,69,58,0.9)",
        }}
      >
        {type === "success" ? "✓" : "✕"}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.90)" }}>
        {message}
      </span>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

const EMPTY_CREATE: CreateSheetState = {
  open: false,
  name: "",
  sku: "",
  price: "",
  unit: "buc",
  stockQuantity: "0",
  stockMinimum: "0",
  saving: false,
}

export function ShopManageClient() {
  const queryClient = useQueryClient()
  const { data: productsData, isLoading: loading } = useQuery({
    queryKey: ["shop-products-manage"],
    queryFn: () =>
      fetch("/api/shop/products?limit=200").then((r) => {
        if (!r.ok) throw new Error("Failed to load products")
        return r.json() as Promise<{ products: Product[] }>
      }),
  })
  const products = productsData?.products ?? []
  const [search, setSearch] = useState("")
  const [stockSheet, setStockSheet] = useState<StockSheetState | null>(null)
  const [createSheet, setCreateSheet] = useState<CreateSheetState>(EMPTY_CREATE)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }, [])

  const saveStock = useCallback(async () => {
    if (!stockSheet || stockSheet.adjustment === 0) return
    setStockSheet((s) => s && { ...s, saving: true })
    try {
      const res = await fetch(`/api/shop/products/${stockSheet.product.id}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adjustment: stockSheet.adjustment,
          reason: stockSheet.reason || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        showToast((err as { error?: string }).error ?? "Eroare la ajustare stoc", "error")
        setStockSheet((s) => s && { ...s, saving: false })
        return
      }
      const { stockQuantity } = (await res.json()) as { stockQuantity: number }
      queryClient.setQueryData<{ products: Product[] }>(["shop-products-manage"], (cache) =>
        cache
          ? {
              products: cache.products.map((p) =>
                p.id === stockSheet.product.id
                  ? {
                      ...p,
                      stock: stockQuantity,
                      badge:
                        stockQuantity === 0
                          ? "low-stock"
                          : stockQuantity <=
                              (stockSheet.product as Product & { stockMinimum?: number })
                                .stockMinimum!
                            ? "low-stock"
                            : p.badge,
                    }
                  : p
              ),
            }
          : cache
      )
      setStockSheet(null)
      showToast("Stoc actualizat", "success")
    } catch {
      showToast("Network error", "error")
      setStockSheet((s) => s && { ...s, saving: false })
    }
  }, [stockSheet, showToast])

  const saveCreate = useCallback(async () => {
    if (!createSheet.name.trim()) return
    setCreateSheet((s) => ({ ...s, saving: true }))
    try {
      const res = await fetch("/api/shop/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createSheet.name.trim(),
          sku: createSheet.sku.trim() || undefined,
          price: Number(createSheet.price) || 0,
          unit: createSheet.unit,
          stockQuantity: parseInt(createSheet.stockQuantity) || 0,
          stockMinimum: parseInt(createSheet.stockMinimum) || 0,
        }),
      })
      if (!res.ok) {
        showToast("Eroare la creare produs", "error")
        setCreateSheet((s) => ({ ...s, saving: false }))
        return
      }
      const { product } = (await res.json()) as { product: Product }
      queryClient.setQueryData<{ products: Product[] }>(["shop-products-manage"], (cache) =>
        cache ? { products: [product, ...cache.products] } : cache
      )
      setCreateSheet(EMPTY_CREATE)
      showToast("Produs creat", "success")
    } catch {
      showToast("Network error", "error")
      setCreateSheet((s) => ({ ...s, saving: false }))
    }
  }, [createSheet, showToast])

  if (loading) return <Skeleton />

  const lowStockCount = products.filter((p) => p.stock <= 0 || p.badge === "low-stock").length
  const outCount = products.filter((p) => p.stock === 0).length

  const visible = search
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
      )
    : products

  return (
    <>
      <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <Link
            href="/shop"
            style={{
              display: "flex",
              alignItems: "center",
              color: "rgba(255,255,255,0.40)",
              textDecoration: "none",
              marginRight: 2,
            }}
          >
            <IconChevronLeft />
          </Link>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "-0.5px",
              color: "rgba(255,255,255,0.95)",
              flex: 1,
            }}
          >
            Gestionare produse
          </h1>
          <Link
            href="/shop/analytics"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              color: "rgba(255,255,255,0.40)",
              textDecoration: "none",
              padding: "6px 10px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <IconChart /> Analize
          </Link>
        </div>

        {/* KPI strip */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}
        >
          {[
            {
              label: "Total produse",
              value: String(products.length),
              color: "rgba(255,255,255,0.95)",
            },
            {
              label: "Low Stock",
              value: String(lowStockCount),
              color: lowStockCount > 0 ? "rgba(255,159,10,0.9)" : "rgba(255,255,255,0.40)",
            },
            {
              label: "Epuizate",
              value: String(outCount),
              color: outCount > 0 ? "rgba(255,69,58,0.9)" : "rgba(255,255,255,0.40)",
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                background: "var(--prv-g1)",
                border: "1px solid var(--prv-border-subtle)",
                borderRadius: 16,
                padding: "10px 12px 9px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 1,
                  background:
                    "linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)",
                }}
              />
              <p
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color,
                  letterSpacing: "-0.4px",
                  lineHeight: 1.2,
                }}
              >
                {value}
              </p>
              <p
                style={{
                  fontSize: 9,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.32)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginTop: 3,
                }}
              >
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            borderRadius: 100,
            padding: "0 14px",
            height: 40,
            marginBottom: 14,
          }}
        >
          <IconSearch />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product or SKU..."
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              fontSize: 13,
              color: "rgba(255,255,255,0.85)",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(255,255,255,0.30)",
                display: "flex",
                padding: 0,
              }}
            >
              <IconClose />
            </button>
          )}
        </div>

        {/* Section header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,0.35)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {search ? `${visible.length} rezultate` : `${products.length} produse`}
          </p>
        </div>

        {/* Product list */}
        {visible.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 0",
              color: "rgba(255,255,255,0.25)",
              fontSize: 13,
            }}
          >
            {search ? "No products found" : "No products registered"}
          </div>
        ) : (
          visible.map((p) => {
            const color = stockColor(p.stock, 0)
            const label = stockLabel(p.stock, 0)
            return (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "11px 14px",
                  background: "var(--prv-g1)",
                  border: "1px solid var(--prv-border-subtle)",
                  borderRadius: 14,
                  marginBottom: 6,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Left color stripe for low/out */}
                {p.badge === "low-stock" && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 3,
                      background:
                        p.stock === 0
                          ? "linear-gradient(180deg,rgba(255,69,58,0.8),rgba(255,69,58,0.4))"
                          : "linear-gradient(180deg,rgba(255,159,10,0.8),rgba(255,159,10,0.4))",
                      borderRadius: "14px 0 0 14px",
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0, paddingLeft: p.badge === "low-stock" ? 4 : 0 }}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.92)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {p.name}
                  </p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.32)", marginTop: 1 }}>
                    {p.sku ? `${p.sku} · ` : ""}
                    {CAT_LABELS[p.category]} · €{p.price}/{p.unit}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color, letterSpacing: "-0.3px" }}>
                      {p.stock}
                    </p>
                    <p
                      style={{
                        fontSize: 9,
                        color: "rgba(255,255,255,0.28)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {label}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setStockSheet({ product: p, adjustment: 0, reason: "", saving: false })
                    }
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 100,
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "rgba(255,255,255,0.60)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <IconPlus />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* FAB — new product */}
      <button
        onClick={() => setCreateSheet({ ...EMPTY_CREATE, open: true })}
        style={{
          position: "fixed",
          bottom: 28,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: 100,
          background: "rgba(255,255,255,0.92)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 50,
          border: "none",
          color: "#000",
        }}
      >
        <IconPlus />
      </button>

      {/* Stock adjustment sheet */}
      {stockSheet && (
        <StockSheet
          state={stockSheet}
          onClose={() => setStockSheet(null)}
          onAdjChange={(v) => setStockSheet((s) => s && { ...s, adjustment: v })}
          onReasonChange={(v) => setStockSheet((s) => s && { ...s, reason: v })}
          onSave={saveStock}
        />
      )}

      {/* Create product sheet */}
      {createSheet.open && (
        <CreateSheet
          state={createSheet}
          onClose={() => setCreateSheet(EMPTY_CREATE)}
          onChange={(f, v) => setCreateSheet((s) => ({ ...s, [f]: v }))}
          onSave={saveCreate}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  )
}
