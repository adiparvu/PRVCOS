"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useToast } from "@prv/ui"
import type { StockTakeDetail } from "@/app/api/inventory/stock-takes/[id]/route"

type Product = { id: string; name: string; sku: string | null }

const card: React.CSSProperties = {
  background: "var(--prv-g1)",
  border: "1px solid var(--prv-border)",
  borderRadius: 18,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
  overflow: "hidden",
}
const input: React.CSSProperties = {
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid var(--prv-border)",
  borderRadius: 10,
  padding: "9px 10px",
  color: "var(--prv-text-1)",
  fontSize: 13.5,
  fontFamily: "inherit",
}

function vColor(v: number): string {
  if (v > 0) return "rgba(48,209,88,0.95)"
  if (v < 0) return "rgba(255,69,58,0.95)"
  return "var(--prv-text-3)"
}

export function StockTakeSessionClient({ id }: { id: string }) {
  const { toast } = useToast()
  const [data, setData] = useState<StockTakeDetail | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [busy, setBusy] = useState(false)
  const [productId, setProductId] = useState("")
  const [counted, setCounted] = useState("")

  const load = useCallback(() => {
    return fetch(`/api/inventory/stock-takes/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d: StockTakeDetail) => setData(d))
      .catch(() => setData(null))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const counting = data?.status === "counting"

  useEffect(() => {
    if (counting && products.length === 0) {
      fetch("/api/shop/products?limit=500")
        .then((r) => r.json())
        .then((d: { products?: Product[] }) => setProducts(d.products ?? []))
        .catch(() => setProducts([]))
    }
  }, [counting, products.length])

  const addLine = () => {
    if (!productId || counted === "" || busy) return
    setBusy(true)
    fetch(`/api/inventory/stock-takes/${id}/lines`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, countedQty: Math.max(0, parseInt(counted, 10) || 0) }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("fail")
        setProductId("")
        setCounted("")
        await load()
      })
      .catch(() => toast.error("Nu s-a putut salva numărătoarea"))
      .finally(() => setBusy(false))
  }

  const post = () => {
    if (busy || !data) return
    const disc = data.summary.discrepancies
    if (
      !window.confirm(
        `Postezi inventarierea? ${disc} diferențe vor ajusta stocul prin mișcări „count".`
      )
    )
      return
    setBusy(true)
    fetch(`/api/inventory/stock-takes/${id}/post`, { method: "POST" })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          throw new Error(j.error ?? "Post failed")
        }
        const j = (await r.json()) as { posted: number }
        await load()
        toast.success(`Postat · ${j.posted} ajustări de stoc`)
      })
      .catch((e) => toast.error("Nu s-a putut posta", e instanceof Error ? e.message : undefined))
      .finally(() => setBusy(false))
  }

  if (!data)
    return <div style={{ padding: "40px 24px", color: "var(--prv-text-3)" }}>Se încarcă…</div>

  const s = data.summary

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "28px 24px 96px" }}>
      <Link
        href="/commerce/inventory/stock-takes"
        style={{ color: "rgba(10,132,255,0.9)", fontSize: 13, textDecoration: "none" }}
      >
        ← Inventarieri
      </Link>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginTop: 8,
        }}
      >
        <h1 style={{ fontSize: 25, fontWeight: 680, letterSpacing: "-0.02em", margin: 0 }}>
          {data.name}
        </h1>
        {counting ? (
          <button
            type="button"
            disabled={busy || data.lines.length === 0}
            onClick={post}
            style={{
              background: "rgba(48,209,88,0.15)",
              color: "rgba(48,209,88,0.95)",
              border: "1px solid rgba(48,209,88,0.3)",
              borderRadius: 11,
              padding: "9px 16px",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: busy || data.lines.length === 0 ? "default" : "pointer",
              opacity: data.lines.length === 0 ? 0.5 : 1,
            }}
          >
            Postează &amp; reconciliază
          </button>
        ) : (
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              padding: "4px 11px",
              borderRadius: 100,
              background: "rgba(48,209,88,0.14)",
              color: "rgba(48,209,88,0.95)",
            }}
          >
            Postat
          </span>
        )}
      </div>

      {/* summary tiles */}
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, margin: "18px 0" }}
      >
        {[
          { k: "Produse", v: s.totalLines },
          { k: "Diferențe", v: s.discrepancies },
          { k: "Surplus", v: `+${s.overCount}` },
          { k: "Lipsă", v: `−${s.underCount}` },
        ].map((t) => (
          <div key={t.k} style={{ ...card, padding: "13px 15px" }}>
            <div style={{ fontSize: 22, fontWeight: 680 }}>{t.v}</div>
            <div style={{ fontSize: 11, color: "var(--prv-text-3)", marginTop: 2 }}>{t.k}</div>
          </div>
        ))}
      </div>

      {counting && (
        <div
          style={{
            ...card,
            padding: 16,
            marginBottom: 16,
            display: "grid",
            gridTemplateColumns: "1fr 130px auto",
            gap: 10,
          }}
        >
          <select value={productId} onChange={(e) => setProductId(e.target.value)} style={input}>
            <option value="">Alege produs…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.sku ? ` · ${p.sku}` : ""}
              </option>
            ))}
          </select>
          <input
            value={counted}
            onChange={(e) => setCounted(e.target.value)}
            style={input}
            placeholder="Numărat"
            inputMode="numeric"
          />
          <button
            type="button"
            disabled={!productId || counted === "" || busy}
            onClick={addLine}
            style={{
              background: productId && counted !== "" ? "#fff" : "rgba(255,255,255,0.07)",
              color: productId && counted !== "" ? "#000" : "var(--prv-text-3)",
              border: "none",
              borderRadius: 10,
              padding: "9px 16px",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: productId && counted !== "" && !busy ? "pointer" : "default",
            }}
          >
            Adaugă
          </button>
        </div>
      )}

      <div style={card}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 70px 70px 70px",
            gap: 8,
            padding: "11px 16px",
            fontSize: 10.5,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--prv-text-3)",
            fontWeight: 600,
            borderBottom: "1px solid var(--prv-border-subtle)",
          }}
        >
          <div>Produs</div>
          <div style={{ textAlign: "right" }}>Sistem</div>
          <div style={{ textAlign: "right" }}>Numărat</div>
          <div style={{ textAlign: "right" }}>Diferență</div>
        </div>
        {data.lines.length === 0 ? (
          <div style={{ padding: "16px", color: "var(--prv-text-3)", fontSize: 13 }}>
            Niciun produs numărat încă.
          </div>
        ) : (
          data.lines.map((l, i) => (
            <div
              key={l.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 70px 70px 70px",
                gap: 8,
                padding: "11px 16px",
                alignItems: "center",
                borderBottom:
                  i < data.lines.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 560 }}>{l.productName ?? "—"}</div>
                {l.sku && <div style={{ fontSize: 11, color: "var(--prv-text-3)" }}>{l.sku}</div>}
              </div>
              <div
                style={{
                  textAlign: "right",
                  fontSize: 13,
                  fontVariantNumeric: "tabular-nums",
                  color: "var(--prv-text-2)",
                }}
              >
                {l.systemQty}
              </div>
              <div style={{ textAlign: "right", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
                {l.countedQty}
              </div>
              <div
                style={{
                  textAlign: "right",
                  fontSize: 13,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  color: vColor(l.variance),
                }}
              >
                {l.variance > 0 ? "+" : ""}
                {l.variance}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
