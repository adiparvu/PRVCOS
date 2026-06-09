"use client"

import { useState, useMemo } from "react"
import { useSuppliers } from "@/lib/api-hooks"
import type { SupplierSummary, SupplierStatus as APISupplierStatus } from "@/app/api/suppliers/route"

type SupplierStatus = "Active" | "Pending" | "Inactive" | "At Risk"
type FilterType = "All" | "Active" | "Review" | "At Risk"

interface Supplier {
  id: string
  initials: string
  name: string
  category: string
  subcategory?: string
  orders: number
  annualSpend: number
  rating: number
  status: SupplierStatus
  trustScore: number
  onTimeDelivery: number
  contractExpiry: string
  paymentTerms: string
  lastOrder: string
  lastOrderAmount: number
  contact: string
  phone: string
  riskReason?: string
}

interface SpendCategory {
  label: string
  amount: number
  pct: number
}

// ── Mapper ────────────────────────────────────────────────────────────────────

function mapAPIStatus(s: APISupplierStatus): SupplierStatus {
  switch (s) {
    case "active":   return "Active"
    case "pending":  return "Pending"
    case "at_risk":  return "At Risk"
    case "inactive": return "Inactive"
  }
}

function mapSupplier(s: SupplierSummary): Supplier {
  return {
    id: s.id,
    initials: s.initials,
    name: s.name,
    category: s.category,
    orders: s.orders,
    annualSpend: s.annualSpend,
    rating: s.rating,
    status: mapAPIStatus(s.status),
    trustScore: s.trustScore,
    onTimeDelivery: s.onTimeDelivery,
    contractExpiry: s.contractExpiry || "—",
    paymentTerms: s.paymentTerms || "—",
    lastOrder: s.lastOrder || "—",
    lastOrderAmount: s.lastOrderAmount,
    contact: "—",
    phone: "—",
  }
}

// ── Tokens ────────────────────────────────────────────────────────────────────

const g1  = "var(--prv-g1)"
const g2  = "var(--prv-g2)"
const bds = "var(--prv-border-subtle)"
const bd  = "var(--prv-border)"
const t1  = "var(--prv-text-1)"
const t2  = "var(--prv-text-2)"
const t3  = "var(--prv-text-3)"

const green  = "rgba(48,209,88,0.90)"
const greenBg = "rgba(48,209,88,0.12)"
const amber  = "rgba(255,159,10,0.95)"
const amberBg = "rgba(255,159,10,0.15)"
const red    = "rgba(255,69,58,0.90)"
const redBg  = "rgba(255,69,58,0.14)"
const redAlertBg = "rgba(255,69,58,0.07)"
const redAlertBorder = "rgba(255,69,58,0.18)"

// ── Helpers ───────────────────────────────────────────────────────────────────

function Specular() {
  return <div style={{ position: "absolute", inset: "0 0 auto", height: 1, background: `linear-gradient(90deg,transparent,${bd},transparent)` }} />
}

function Stars({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width="10" height="10" viewBox="0 0 12 12" fill={i <= Math.round(rating) ? "rgba(255,159,10,0.90)" : bd}>
          <polygon points="6 1 7.5 4.5 11 5 8.5 7.5 9 11 6 9 3 11 3.5 7.5 1 5 4.5 4.5" />
        </svg>
      ))}
      <span style={{ fontSize: 10, color: t3, marginLeft: 4 }}>{rating.toFixed(1)}</span>
    </div>
  )
}

function StatusPill({ status }: { status: SupplierStatus }) {
  const map: Record<SupplierStatus, { bg: string; color: string }> = {
    Active:   { bg: greenBg, color: green  },
    Pending:  { bg: amberBg, color: amber  },
    "At Risk":{ bg: redBg,   color: red    },
    Inactive: { bg: bds,     color: t3     },
  }
  const s = map[status]
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: s.bg, color: s.color, whiteSpace: "nowrap", flexShrink: 0 }}>
      {status}
    </span>
  )
}

// ── Supplier detail sheet ─────────────────────────────────────────────────────

function SupplierDetail({ supplier, onClose }: { supplier: Supplier; onClose: () => void }) {
  const rows = [
    { label: "Contact",          val: supplier.contact !== "—" ? `${supplier.contact} · ${supplier.phone}` : "—" },
    { label: "On-time delivery", val: supplier.onTimeDelivery ? `${supplier.onTimeDelivery}%` : "—" },
    { label: "Contract expires", val: supplier.contractExpiry },
    { label: "Payment terms",    val: supplier.paymentTerms },
    { label: "Last order",       val: supplier.lastOrder !== "—" ? `${supplier.lastOrder} · €${supplier.lastOrderAmount.toLocaleString()}` : "—" },
  ]

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 480, background: g2, border: `1px solid ${bd}`, borderRadius: "28px 28px 0 0", overflow: "hidden", position: "relative", paddingBottom: 36 }}>
        <Specular />
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 6 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: bd }} />
        </div>

        <div style={{ padding: "0 20px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 15, background: supplier.status === "At Risk" ? "rgba(255,69,58,0.10)" : g2, border: `1px solid ${bd}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16, fontWeight: 700, color: supplier.status === "At Risk" ? red : t1, letterSpacing: "0.02em" }}>
              {supplier.initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: t1, marginBottom: 4 }}>{supplier.name}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: g1, border: `1px solid ${bds}`, color: t2 }}>{supplier.category}</span>
                {supplier.subcategory && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: g1, border: `1px solid ${bds}`, color: t2 }}>{supplier.subcategory}</span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "flex-end", gap: 8 }}>
              <StatusPill status={supplier.status} />
              <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", background: g1, border: `1px solid ${bds}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={t3} strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          {/* At Risk warning */}
          {supplier.riskReason && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: redAlertBg, border: `1px solid ${redAlertBorder}`, marginBottom: 14 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={red} strokeWidth="1.8" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span style={{ fontSize: 12, color: red }}>{supplier.riskReason}</span>
            </div>
          )}

          {/* Metric cards */}
          {supplier.status !== "Pending" && (
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[
                { val: String(supplier.trustScore), lbl: "Trust Score" },
                { val: supplier.rating.toFixed(1),  lbl: "Rating" },
                { val: String(supplier.orders),     lbl: "Orders" },
                { val: `€${Math.round(supplier.annualSpend / 1000)}k`, lbl: "Annual" },
              ].map(m => (
                <div key={m.lbl} style={{ flex: 1, padding: "10px 6px", borderRadius: 12, background: g1, border: `1px solid ${bds}`, textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: t1, marginBottom: 2 }}>{m.val}</div>
                  <div style={{ fontSize: 9, color: t3 }}>{m.lbl}</div>
                </div>
              ))}
            </div>
          )}

          {/* Info rows */}
          <div style={{ background: g1, border: `1px solid ${bds}`, borderRadius: 16, padding: "0 14px", marginBottom: 16 }}>
            {rows.map((r, i) => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < rows.length - 1 ? `1px solid ${bds}` : "none" }}>
                <span style={{ fontSize: 13, color: t3 }}>{r.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: t1 }}>{r.val}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ flex: 1, padding: "13px", borderRadius: 14, background: g2, border: `1px solid ${bd}`, color: t1, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              New Order
            </button>
            <button style={{ flex: 1, padding: "13px", borderRadius: 14, background: t1, border: "none", color: "var(--prv-bg)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Contact
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function SuppliersWorkspace() {
  const [filter, setFilter] = useState<FilterType>("All")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Supplier | null>(null)

  const FILTERS: FilterType[] = ["All", "Active", "Review", "At Risk"]

  const { data, isLoading } = useSuppliers()

  const suppliers = useMemo(() => (data?.suppliers ?? []).map(mapSupplier), [data?.suppliers])

  const filtered = useMemo(() => suppliers.filter(s => {
    const matchFilter =
      filter === "All" ||
      (filter === "Active"  && s.status === "Active") ||
      (filter === "Review"  && s.status === "Pending") ||
      (filter === "At Risk" && s.status === "At Risk")
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  }), [suppliers, filter, search])

  const atRiskCount  = suppliers.filter(s => s.status === "At Risk").length
  const pendingCount = suppliers.filter(s => s.status === "Pending").length

  const spendCategories = useMemo<SpendCategory[]>(() => {
    const totals: Record<string, number> = {}
    for (const s of suppliers) {
      if (s.annualSpend > 0) totals[s.category] = (totals[s.category] ?? 0) + s.annualSpend
    }
    const maxSpend = Math.max(...Object.values(totals), 1)
    return Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .map(([label, amount]) => ({
        label,
        amount,
        pct: Math.round((amount / maxSpend) * 100),
      }))
  }, [suppliers])

  const totalSpend = useMemo(() => spendCategories.reduce((s, c) => s + c.amount, 0), [spendCategories])

  return (
    <div style={{ paddingBottom: 120 }}>

      {/* ── Header ── */}
      <div style={{ padding: "6px 16px 4px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: t1 }}>Suppliers</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: g1, border: `1px solid ${bds}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t2} strokeWidth="1.7" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: g1, border: `1px solid ${bds}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t2} strokeWidth="1.7" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            </div>
          </div>
        </div>
        <p style={{ fontSize: 14, color: t2 }}>
          {isLoading ? "Loading…" : `${suppliers.length} suppliers · ${pendingCount} under review`}
        </p>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "flex", gap: 8, padding: "16px 16px 0" }}>
        {[
          { val: isLoading ? "…" : String(suppliers.length),                                lbl: "Total"   },
          { val: isLoading ? "…" : String(suppliers.filter(s => s.status === "Active").length), lbl: "Active" },
          { val: isLoading ? "…" : String(pendingCount),                                    lbl: "Review"  },
          { val: isLoading ? "…" : String(atRiskCount), color: atRiskCount > 0 ? red : t1, lbl: "At Risk" },
        ].map(s => (
          <div key={s.lbl} style={{ flex: 1, padding: "12px 8px", borderRadius: 14, background: g1, border: `1px solid ${bds}`, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color ?? t1, marginBottom: 2 }}>{s.val}</div>
            <div style={{ fontSize: 10, color: t3 }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 14, background: "var(--prv-border-subtle)", border: `1px solid ${bds}`, margin: "14px 16px 0" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t3} strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers, categories…" style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 14, color: t1, fontFamily: "inherit" }} />
      </div>

      {/* ── Filter ── */}
      <div style={{ display: "flex", gap: 4, padding: "3px", background: g1, borderRadius: 10, margin: "12px 16px 0" }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ flex: 1, padding: "6px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, color: filter === f ? t1 : t3, background: filter === f ? g2 : "transparent", border: "none", cursor: "pointer", transition: "all 0.15s" }}>
            {f}
          </button>
        ))}
      </div>

      {/* ── At Risk alert ── */}
      {atRiskCount > 0 && (filter === "All" || filter === "At Risk") && (
        <div style={{ margin: "16px 16px 0", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 14, background: redAlertBg, border: `1px solid ${redAlertBorder}` }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={red} strokeWidth="1.8" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: red }}>{atRiskCount} supplier{atRiskCount > 1 ? "s" : ""} require attention</div>
            <div style={{ fontSize: 12, color: t3, marginTop: 1 }}>Contract expiry · Late deliveries</div>
          </div>
          <span style={{ fontSize: 12, color: t3 }}>Review →</span>
        </div>
      )}

      {/* ── Supplier list ── */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: t3, marginBottom: 12 }}>
          {filter === "All" ? "All Suppliers" : filter === "Review" ? "Pending Review" : `${filter} Suppliers`}
        </div>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: t3, fontSize: 14 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: t3, fontSize: 14 }}>No suppliers found</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
            {filtered.map(s => (
              <div key={s.id} onClick={() => setSelected(s)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", borderRadius: 16, background: g1, border: `1px solid ${s.status === "At Risk" ? "rgba(255,69,58,0.22)" : bds}`, cursor: "pointer", position: "relative" }}>
                <Specular />
                <div style={{ width: 44, height: 44, borderRadius: 13, background: s.status === "At Risk" ? "rgba(255,69,58,0.10)" : s.status === "Pending" ? "rgba(255,159,10,0.10)" : g2, border: `1px solid ${bd}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, fontWeight: 700, color: s.status === "At Risk" ? red : s.status === "Pending" ? amber : t1, letterSpacing: "0.02em" }}>
                  {s.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: t1, marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: t3, marginBottom: 2 }}>{s.category}{s.orders > 0 ? ` · ${s.orders} orders` : " · New supplier"}</div>
                  {s.rating > 0 && <Stars rating={s.rating} />}
                  {s.status === "Pending" && <div style={{ fontSize: 11, color: t3, marginTop: 2 }}>Pending onboarding</div>}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column" as const, alignItems: "flex-end", gap: 4 }}>
                  <StatusPill status={s.status} />
                  {s.annualSpend > 0 && <div style={{ fontSize: 12, color: t3 }}>€{Math.round(s.annualSpend / 1000)}k / yr</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Spend by Category ── */}
      {(filter === "All" && !search) && spendCategories.length > 0 && (
        <div style={{ padding: "24px 16px 0" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: t3, marginBottom: 12 }}>Spend by Category</div>
          <div style={{ padding: 16, borderRadius: 18, background: g1, border: `1px solid ${bds}`, position: "relative" }}>
            <Specular />
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
              {spendCategories.map(cat => (
                <div key={cat.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: t2 }}>{cat.label}</span>
                    <span style={{ fontWeight: 600, color: t1 }}>€{Math.round(cat.amount / 1000)}k</span>
                  </div>
                  <div style={{ height: 5, background: bd, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${cat.pct}%`, background: t2, borderRadius: 3, opacity: 0.4 + (cat.pct / 100) * 0.5 }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${bds}` }}>
              <span style={{ fontSize: 13, color: t3 }}>Total Annual Spend</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: t1 }}>€{Math.round(totalSpend / 1000)}k</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail sheet ── */}
      {selected && <SupplierDetail supplier={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
