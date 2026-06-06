"use client"

import { useState } from "react"

type POStatus = "Pending" | "Approved" | "Draft" | "Rejected" | "In Transit"
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

const ORDERS: PurchaseOrder[] = [
  {
    id: "po-0194", ref: "PO-2026-0194", description: "Ceramic Tiles", supplier: "Suppliers SRL", date: "Jun 8",
    amount: 12400, status: "Pending", project: "Renovation Cluj #14", delivery: "Warehouse Cluj",
    neededBy: "Jun 13, 2026", paymentTerms: "Net 30", requestedBy: "Andrei Popescu",
    items: [
      { name: "Porcelain Tile 60×60cm", ref: "White Gloss · REF-4412", qty: "120 m²", price: 7200 },
      { name: "Tile Adhesive Pro", ref: "25kg bags · REF-0821", qty: "40 bags", price: 1960 },
      { name: "Grout White Fine", ref: "5kg bags · REF-3307", qty: "24 bags", price: 840 },
      { name: "Tile Spacers 3mm", ref: "500pcs pack · REF-1102", qty: "10 packs", price: 2400 },
    ],
  },
  {
    id: "po-0193", ref: "PO-2026-0193", description: "Electrical Components", supplier: "ElectroMax", date: "Jun 6",
    amount: 8750, status: "Approved", project: "Renovation Timișoara #7", delivery: "Warehouse Timișoara",
    neededBy: "Jun 10, 2026", paymentTerms: "Net 15", requestedBy: "Elena Marin",
    items: [
      { name: "Cable NYY 3×2.5mm²", ref: "100m roll · REF-E210", qty: "5 rolls", price: 4250 },
      { name: "Circuit Breaker 16A", ref: "REF-CB16", qty: "20 pcs", price: 2800 },
      { name: "Junction Box IP65", ref: "REF-JB65", qty: "30 pcs", price: 1700 },
    ],
  },
  {
    id: "po-0192", ref: "PO-2026-0192", description: "Paint & Primers", supplier: "ColorPro", date: "Jun 5",
    amount: 4200, status: "In Transit", project: "Renovation Cluj #12", delivery: "Site Cluj",
    neededBy: "Jun 8, 2026", paymentTerms: "Net 30", requestedBy: "Cosmin Neagu",
    items: [
      { name: "Interior Wall Paint White", ref: "15L · REF-P001", qty: "10 cans", price: 2400 },
      { name: "Primer Universal", ref: "10L · REF-PR10", qty: "8 cans", price: 1200 },
      { name: "Roller Set Pro", ref: "REF-R22", qty: "12 sets", price: 600 },
    ],
  },
  {
    id: "po-0191", ref: "PO-2026-0191", description: "Plumbing Fixtures", supplier: "AquaFit", date: "Jun 5",
    amount: 6100, status: "Draft", project: "Renovation Cluj #15", delivery: "Warehouse Cluj",
    neededBy: "Jun 18, 2026", paymentTerms: "Net 30", requestedBy: "Maria Ionescu",
    items: [
      { name: "Thermostatic Shower Set", ref: "REF-S440", qty: "6 sets", price: 3600 },
      { name: "Wash Basin 60cm", ref: "REF-WB60", qty: "4 pcs", price: 1600 },
      { name: "Toilet Suite Close Coupled", ref: "REF-TC1", qty: "3 pcs", price: 900 },
    ],
  },
  {
    id: "po-0190", ref: "PO-2026-0190", description: "Safety Equipment", supplier: "SafeWork", date: "Jun 4",
    amount: 2980, status: "Approved", project: "All Sites", delivery: "Warehouse Cluj",
    neededBy: "Jun 7, 2026", paymentTerms: "Immediate", requestedBy: "Maria Ionescu",
    items: [
      { name: "Safety Helmets EN397", ref: "REF-SH1", qty: "20 pcs", price: 980 },
      { name: "Hi-Vis Vest Class 2", ref: "REF-HV2", qty: "20 pcs", price: 600 },
      { name: "Safety Boots S3", ref: "REF-SB3", qty: "10 pairs", price: 1400 },
    ],
  },
]

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

  const filtered = ORDERS.filter(o => {
    if (filter === "All") return true
    if (filter === "Pending") return o.status === "Pending"
    if (filter === "Approved") return o.status === "Approved"
    if (filter === "Received") return o.status === "In Transit"
    return true
  })

  if (selected) {
    const po = selected
    const resolvedStatus = decided[po.id] ?? po.status
    const total = po.items.reduce((s, i) => s + i.price, 0)

    return (
      <div style={{ padding: "32px 16px 120px", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif", WebkitFontSmoothing: "antialiased" }}>
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
              <div style={{ fontSize: 12, color: t3, marginTop: 2 }}>4.8 ★ · 24 orders · 3–5 days lead time</div>
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
          {po.items.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderBottom: `1px solid ${bds}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--prv-text-1)" }}>{item.name}</div>
                <div style={{ fontSize: 11, color: t3, marginTop: 2 }}>{item.ref}</div>
              </div>
              <div style={{ fontSize: 12, color: t3, width: 52, textAlign: "center" }}>{item.qty}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--prv-text-1)", width: 60, textAlign: "right" }}>€{item.price.toLocaleString()}</div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "var(--prv-border-subtle)" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--prv-text-1)" }}>Total</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--prv-text-1)" }}>€{total.toLocaleString()}</span>
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
    <div style={{ padding: "32px 16px 120px", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif", WebkitFontSmoothing: "antialiased" }}>

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
          { val: "€84K", label: "MTD Spend", color: undefined },
          { val: "7", label: "Pending", color: amber },
          { val: "3", label: "In Transit", color: blue },
          { val: "94%", label: "On Budget", color: green },
        ].map(k => (
          <div key={k.label} style={{ padding: "12px 8px", borderRadius: 14, background: g1, border: `1px solid ${bds}`, textAlign: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: k.color ?? "var(--prv-text-1)" }}>{k.val}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 3 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Budget bar */}
      <div style={card}>
        <TopEdge />
        <div style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, fontWeight: 600, color: t2, marginBottom: 8 }}>
            <span>Monthly Budget</span>
            <span style={{ color: "var(--prv-text-1)", fontWeight: 700 }}>€84,200 / €90,000</span>
          </div>
          <div style={{ height: 8, background: "var(--prv-border)", borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
            <div style={{ width: "93.5%", height: "100%", borderRadius: 4, background: "linear-gradient(90deg,rgba(48,209,88,0.6),rgba(255,159,10,0.7))" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: t3 }}>
            <span>€0</span>
            <span style={{ color: amber }}>€5,800 remaining</span>
            <span>€90K limit</span>
          </div>
        </div>
      </div>

      {/* Budget alert */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 14, background: "rgba(255,159,10,0.07)", border: "1px solid rgba(255,159,10,0.18)", marginBottom: 14 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,159,10,0.9)" strokeWidth="1.8" strokeLinecap="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: amber }}>Budget Alert</div>
          <div style={{ fontSize: 12, color: "rgba(255,159,10,0.65)", marginTop: 1 }}>93% of monthly budget used — 3 POs pending approval</div>
        </div>
      </div>

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
        {filtered.map((po, i) => (
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
        ))}
        <div style={{ padding: "12px 16px", textAlign: "center", borderTop: `1px solid ${bds}` }}>
          <span style={{ fontSize: 12, color: t3 }}>189 more orders ›</span>
        </div>
      </div>
    </div>
  )
}
