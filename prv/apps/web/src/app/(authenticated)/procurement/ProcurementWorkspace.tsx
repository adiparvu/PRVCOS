"use client"

import { useState, useMemo } from "react"
import { usePurchaseOrders } from "@/lib/api-hooks"
import type { POSummary, POStatus, ProcurementMeta } from "@/app/api/procurement/route"

type FilterType = "All" | "Pending" | "Approved" | "Received"

interface LineItem {
  name: string
  ref: string
  qty: string
  price: number
}

interface PurchaseOrder {
  id: string
  ref: string
  description: string
  supplier: string
  date: string
  amount: number
  status: POStatus
  project?: string
  delivery?: string
  neededBy?: string
  paymentTerms?: string
  requestedBy?: string
  items: LineItem[]
}

// ── Mapper ────────────────────────────────────────────────────────────────────

function mapOrder(o: POSummary): PurchaseOrder {
  return {
    id: o.id,
    ref: o.ref,
    description: o.description,
    supplier: o.supplier,
    date: o.date,
    amount: o.amount,
    status: o.status,
    project: o.project ?? undefined,
    neededBy: o.neededBy ?? undefined,
    items: [],
  }
}

const FILTERS: FilterType[] = ["All", "Pending", "Approved", "Received"]

const g1  = "var(--prv-g1)"
const g2  = "var(--prv-g2)"
const bds = "var(--prv-border-subtle)"
const bd  = "var(--prv-border)"
const t1  = "var(--prv-text-1)"
const t2  = "var(--prv-text-2)"
const t3  = "var(--prv-text-3)"
const green = "rgba(48,209,88,0.95)"
const red = "rgba(255,69,58,0.95)"
const amber = "rgba(255,159,10,0.95)"
const blue = "rgba(10,132,255,0.9)"

const card: React.CSSProperties = {
  background: g1,
  border: `1px solid ${bds}`,
  borderRadius: 18,
  position: "relative",
  overflow: "hidden",
  marginBottom: 12,
}

function TopEdge() {
  return <div style={{ position: "absolute", inset: "0 0 auto", height: 1, background: "linear-gradient(90deg,transparent,var(--prv-border),transparent)" }} />
}

function StatusPill({ status }: { status: POStatus }) {
  const styles: Record<POStatus, React.CSSProperties> = {
    Approved: { background: "rgba(48,209,88,0.13)", color: green },
    Pending: { background: "rgba(255,159,10,0.13)", color: amber },
    Draft: { background: "var(--prv-border)", color: t2 },
    Rejected: { background: "rgba(255,69,58,0.12)", color: red },
    "In Transit": { background: "rgba(10,132,255,0.12)", color: blue },
  }
  return (
    <span style={{ ...styles[status], fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6 }}>
      {status}
    </span>
  )
}

function POIcon({ status }: { status: POStatus }) {
  if (status === "Approved")
    return (
      <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(48,209,88,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(48,209,88,0.85)" strokeWidth="1.8" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
      </div>
    )
  if (status === "In Transit")
    return (
      <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(10,132,255,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(10,132,255,0.85)" strokeWidth="1.8" strokeLinecap="round"><rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
      </div>
    )
  if (status === "Pending")
    return (
      <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,159,10,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,159,10,0.9)" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
      </div>
    )
  return (
    <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--prv-g1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--prv-text-3)" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
    </div>
  )
}

export function ProcurementWorkspace() {
  const [filter, setFilter] = useState<FilterType>("All")
  const [selected, setSelected] = useState<PurchaseOrder | null>(null)
  const [decided, setDecided] = useState<Record<string, "Approved" | "Rejected">>({})

  const now = new Date()
  const monthLabel = now.toLocaleDateString("en-US", { month: "short", year: "numeric" })

  const { data, isLoading } = usePurchaseOrders()

  const orders = useMemo(() => (data?.orders ?? []).map(mapOrder), [data?.orders])
  const meta: ProcurementMeta | null = data?.meta ?? null

  const filtered = useMemo(() => orders.filter(o => {
    if (filter === "All") return true
    if (filter === "Pending") return o.status === "Pending"
    if (filter === "Approved") return o.status === "Approved"
    if (filter === "Received") return o.status === "In Transit"
    return true
  }), [orders, filter])

  const pendingCount  = meta?.pending  ?? orders.filter(o => o.status === "Pending").length
  const inTransitCount = meta?.inTransit ?? orders.filter(o => o.status === "In Transit").length
  const totalSpend    = meta?.totalSpend ?? orders.reduce((s, o) => s + o.amount, 0)
  const budget        = meta?.budget ?? 0
  const budgetUsed    = meta?.budgetUsed ?? totalSpend
  const budgetPct     = budget > 0 ? Math.min(Math.round((budgetUsed / budget) * 100), 100) : 0
  const budgetRemaining = budget > 0 ? budget - budgetUsed : 0
  const onBudgetPct   = budget > 0 ? `${budgetPct}%` : "—"

  if (selected) {
    const po = selected
    const resolvedStatus = decided[po.id] ?? po.status
    const total = po.items.reduce((s, i) => s + i.price, 0)

    return (
      <div style={{ padding: "32px 16px 120px", fontFamily: "-apple-system, BlinkMacSystemFont, \'SF Pro Text\', sans-serif", WebkitFontSmoothing: "antialiased" }}>
        <button onClick={() => setSelected(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: t2, fontSize: 14, fontWeight: 500, cursor: "pointer", marginBottom: 20, padding: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          Procurement
        </button>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 13, color: t3, marginBottom: 2 }}>Purchase Order</p>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--prv-text-1)" }}>{po.ref}</h1>
          </div>
          <StatusPill status={resolvedStatus} />
        </div>

        {/* Supplier */}
        <p style={{ fontSize: 11, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 2px 10px" }}>Supplier</p>
        <div style={{ ...card, padding: "14px 16px" }}>
          <TopEdge />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: g2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: t2, flexShrink: 0 }}>
              {po.supplier.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--prv-text-1)" }}>{po.supplier}</div>
              <div style={{ fontSize: 12, color: t3, marginTop: 2 }}>3–5 days lead time</div>
            </div>
          </div>
        </div>

        {/* Details */}
        <p style={{ fontSize: 11, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: "0.07em", margin: "18px 2px 10px" }}>Details</p>
        <div style={card}>
          <TopEdge />
          {[
            { label: "Requested by", val: po.requestedBy ?? "—" },
            { label: "Project", val: po.project ?? "—" },
            { label: "Delivery to", val: po.delivery ?? "—" },
            { label: "Needed by", val: po.neededBy ?? "—" },
            { label: "Payment terms", val: po.paymentTerms ?? "—" },
          ].map((row, i, arr) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 16px", borderBottom: i < arr.length - 1 ? `1px solid ${bds}` : "none" }}>
              <span style={{ fontSize: 13, color: t2 }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--prv-text-1)" }}>{row.val}</span>
            </div>
          ))}
        </div>

        {/* Line items */}
        <p style={{ fontSize: 11, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: "0.07em", margin: "18px 2px 10px" }}>Line Items ({po.items.length})</p>
        <div style={card}>
          <TopEdge />
          {po.items.length === 0 ? (
            <div style={{ padding: "16px", textAlign: "center", color: t3, fontSize: 13 }}>No line items available</div>
          ) : (
            po.items.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderBottom: `1px solid ${bds}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--prv-text-1)" }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: t3, marginTop: 2 }}>{item.ref}</div>
                </div>
                <div style={{ fontSize: 12, color: t3, width: 52, textAlign: "center" }}>{item.qty}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--prv-text-1)", width: 60, textAlign: "right" }}>€{item.price.toLocaleString()}</div>
              </div>
            ))
          )}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "var(--prv-border-subtle)" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--prv-text-1)" }}>Total</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--prv-text-1)" }}>€{(total || po.amount).toLocaleString()}</span>
          </div>
        </div>

        {/* CTAs — only show for pending */}
        {resolvedStatus === "Pending" && (
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button
              onClick={() => setDecided(d => ({ ...d, [po.id]: "Rejected" }))}
              style={{ flex: 1, padding: 14, borderRadius: 14, background: "rgba(255,69,58,0.15)", border: "1px solid rgba(255,69,58,0.25)", color: red, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              Reject
            </button>
            <button
              onClick={() => setDecided(d => ({ ...d, [po.id]: "Approved" }))}
              style={{ flex: 2, padding: 14, borderRadius: 14, background: "rgba(48,209,88,0.85)", border: "none", color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              Approve Order
            </button>
          </div>
        )}
        {resolvedStatus === "Approved" && (
          <div style={{ padding: 14, borderRadius: 14, background: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,0.18)", textAlign: "center", color: green, fontSize: 14, fontWeight: 700 }}>
            Order Approved
          </div>
        )}
        {resolvedStatus === "Rejected" && (
          <div style={{ padding: 14, borderRadius: 14, background: "rgba(255,69,58,0.08)", border: "1px solid rgba(255,69,58,0.18)", textAlign: "center", color: red, fontSize: 14, fontWeight: 700 }}>
            Order Rejected
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: "32px 16px 120px", fontFamily: "-apple-system, BlinkMacSystemFont, \'SF Pro Text\', sans-serif", WebkitFontSmoothing: "antialiased" }}>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 13, color: t3, marginBottom: 2 }}>Operations</p>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--prv-text-1)" }}>Procurement</h1>
        </div>
        <div style={{ padding: "6px 12px", borderRadius: 10, background: g1, border: `1px solid ${bds}`, fontSize: 12, fontWeight: 500, color: t2 }}>
          {monthLabel}
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
        {[
          { val: isLoading ? "…" : `€${Math.round(totalSpend / 1000)}K`, label: "MTD Spend", color: undefined },
          { val: isLoading ? "…" : String(pendingCount),                  label: "Pending",   color: amber },
          { val: isLoading ? "…" : String(inTransitCount),                label: "In Transit",color: blue },
          { val: isLoading ? "…" : onBudgetPct,                           label: "On Budget", color: green },
        ].map(k => (
          <div key={k.label} style={{ padding: "12px 8px", borderRadius: 14, background: g1, border: `1px solid ${bds}`, textAlign: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: k.color ?? "var(--prv-text-1)" }}>{k.val}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 3 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Budget bar — only show when budget data is available */}
      {budget > 0 && (
        <div style={card}>
          <TopEdge />
          <div style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, fontWeight: 600, color: t2, marginBottom: 8 }}>
              <span>Monthly Budget</span>
              <span style={{ color: "var(--prv-text-1)", fontWeight: 700 }}>€{budgetUsed.toLocaleString()} / €{budget.toLocaleString()}</span>
            </div>
            <div style={{ height: 8, background: "var(--prv-border)", borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
              <div style={{ width: `${budgetPct}%`, height: "100%", borderRadius: 4, background: "linear-gradient(90deg,rgba(48,209,88,0.6),rgba(255,159,10,0.7))" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: t3 }}>
              <span>€0</span>
              {budgetRemaining > 0 && <span style={{ color: amber }}>€{budgetRemaining.toLocaleString()} remaining</span>}
              <span>€{Math.round(budget / 1000)}K limit</span>
            </div>
          </div>
        </div>
      )}

      {/* Budget alert — only when near limit */}
      {budget > 0 && budgetPct >= 80 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 14, background: "rgba(255,159,10,0.07)", border: "1px solid rgba(255,159,10,0.18)", marginBottom: 14 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,159,10,0.9)" strokeWidth="1.8" strokeLinecap="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: amber }}>Budget Alert</div>
            <div style={{ fontSize: 12, color: "rgba(255,159,10,0.65)", marginTop: 1 }}>{budgetPct}% of monthly budget used · {pendingCount} PO{pendingCount !== 1 ? "s" : ""} pending approval</div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: 4, padding: 4, background: g1, border: `1px solid ${bds}`, borderRadius: 12, marginBottom: 14 }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ flex: 1, padding: "6px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, color: filter === f ? "var(--prv-text-1)" : t3, background: filter === f ? g2 : "transparent", border: "none", cursor: "pointer", transition: "all 0.15s" }}>
            {f}
          </button>
        ))}
      </div>

      {/* PO list */}
      <div style={card}>
        <TopEdge />
        {isLoading ? (
          <div style={{ padding: "24px", textAlign: "center", color: t3, fontSize: 14 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", color: t3, fontSize: 14 }}>No orders found</div>
        ) : (
          filtered.map((po, i) => (
            <button key={po.id} onClick={() => setSelected(po)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: i < filtered.length - 1 ? `1px solid ${bds}` : "none", width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
              <POIcon status={decided[po.id] ?? po.status} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--prv-text-1)" }}>{po.ref}</div>
                <div style={{ fontSize: 12, color: t3, marginTop: 2 }}>{po.description} · {po.supplier} · {po.date}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--prv-text-1)", marginBottom: 4 }}>€{po.amount.toLocaleString()}</div>
                <StatusPill status={decided[po.id] ?? po.status} />
              </div>
            </button>
          ))
        )}
        {!isLoading && orders.length > filtered.length && (
          <div style={{ padding: "12px 16px", textAlign: "center", borderTop: `1px solid ${bds}` }}>
            <span style={{ fontSize: 12, color: t3 }}>{orders.length - filtered.length} more orders filtered out ›</span>
          </div>
        )}
      </div>
    </div>
  )
}
