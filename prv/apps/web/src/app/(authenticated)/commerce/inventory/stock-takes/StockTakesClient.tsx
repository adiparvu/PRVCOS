"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useToast } from "@prv/ui"
import type { StockTakeSummaryRow } from "@/app/api/inventory/stock-takes/route"

type Store = { id: string; name: string }

const STATUS_META: Record<
  StockTakeSummaryRow["status"],
  { label: string; color: string; bg: string }
> = {
  draft: { label: "Ciornă", color: "var(--prv-text-3)", bg: "rgba(255,255,255,0.06)" },
  counting: { label: "În numărare", color: "rgba(10,132,255,0.95)", bg: "rgba(10,132,255,0.13)" },
  posted: { label: "Postat", color: "rgba(48,209,88,0.95)", bg: "rgba(48,209,88,0.14)" },
  cancelled: { label: "Anulat", color: "var(--prv-text-3)", bg: "rgba(255,255,255,0.06)" },
}

const card: React.CSSProperties = {
  background: "var(--prv-g1)",
  border: "1px solid var(--prv-border)",
  borderRadius: 18,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
}
const input: React.CSSProperties = {
  boxSizing: "border-box",
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid var(--prv-border)",
  borderRadius: 10,
  padding: "9px 10px",
  color: "var(--prv-text-1)",
  fontSize: 13.5,
  fontFamily: "inherit",
}

export function StockTakesClient() {
  const router = useRouter()
  const { toast } = useToast()
  const [sessions, setSessions] = useState<StockTakeSummaryRow[] | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [storeId, setStoreId] = useState("")
  const [name, setName] = useState("")

  const load = useCallback(() => {
    return fetch("/api/inventory/stock-takes")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d: { sessions: StockTakeSummaryRow[] }) => setSessions(d.sessions))
      .catch(() => setSessions([]))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (showForm && stores.length === 0) {
      fetch("/api/stores")
        .then((r) => r.json())
        .then((d: { stores?: Store[] }) => setStores(d.stores ?? []))
        .catch(() => setStores([]))
    }
  }, [showForm, stores.length])

  const create = () => {
    if (!storeId || !name.trim() || busy) return
    setBusy(true)
    fetch("/api/inventory/stock-takes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ storeId, name: name.trim() }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Create failed")
        const j = (await r.json()) as { id: string }
        toast.success("Inventariere creată")
        router.push(`/commerce/inventory/stock-takes/${j.id}`)
      })
      .catch(() => toast.error("Nu s-a putut crea"))
      .finally(() => setBusy(false))
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "36px 24px 80px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <Link
            href="/commerce/inventory"
            style={{ color: "rgba(10,132,255,0.9)", fontSize: 13, textDecoration: "none" }}
          >
            ← Inventar
          </Link>
          <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em", marginTop: 6 }}>
            Inventarieri
          </h1>
          <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 4 }}>
            Numărare fizică pe magazin, cu reconciliere controlată a diferențelor
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          style={{
            background: showForm ? "rgba(255,255,255,0.06)" : "#fff",
            color: showForm ? "var(--prv-text-2)" : "#000",
            border: showForm ? "1px solid var(--prv-border)" : "none",
            borderRadius: 12,
            padding: "10px 16px",
            fontSize: 13.5,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {showForm ? "Anulează" : "＋ Inventariere nouă"}
        </button>
      </div>

      {showForm && (
        <div
          style={{
            ...card,
            padding: 18,
            marginTop: 20,
            display: "grid",
            gridTemplateColumns: "1fr 1fr auto",
            gap: 10,
          }}
        >
          <select value={storeId} onChange={(e) => setStoreId(e.target.value)} style={input}>
            <option value="">Alege magazin…</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={input}
            placeholder="Ex: Inventar trimestrial"
          />
          <button
            type="button"
            disabled={!storeId || !name.trim() || busy}
            onClick={create}
            style={{
              background: storeId && name.trim() ? "#fff" : "rgba(255,255,255,0.07)",
              color: storeId && name.trim() ? "#000" : "var(--prv-text-3)",
              border: "none",
              borderRadius: 10,
              padding: "9px 18px",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: storeId && name.trim() && !busy ? "pointer" : "default",
            }}
          >
            Începe
          </button>
        </div>
      )}

      <div style={{ marginTop: 24, display: "grid", gap: 10 }}>
        {sessions === null ? (
          <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Se încarcă…</div>
        ) : sessions.length === 0 ? (
          <div style={{ ...card, padding: 24, color: "var(--prv-text-3)", fontSize: 14 }}>
            Nicio inventariere încă.
          </div>
        ) : (
          sessions.map((s) => {
            const m = STATUS_META[s.status]
            return (
              <Link
                key={s.id}
                href={`/commerce/inventory/stock-takes/${s.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    ...card,
                    padding: "14px 18px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 640 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: "var(--prv-text-3)", marginTop: 3 }}>
                      {s.storeName ?? "—"} · {s.lineCount} produse
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: "2px 9px",
                      borderRadius: 100,
                      background: m.bg,
                      color: m.color,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {m.label}
                  </span>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
