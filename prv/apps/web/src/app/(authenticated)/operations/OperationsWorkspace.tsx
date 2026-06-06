"use client"

import { useState } from "react"
import {
  GlassStatCard,
  GlassAlertBanner,
  GlassListView,
  GlassKanban,
  GlassTable,
  GlassStatusDot,
  GlassTabs,
  GlassSegmentedControl,
  type KanbanColumn,
  type KanbanCard,
  type TableColumn,
  type ListViewSection,
  type TabItem,
} from "@prv/ui"

// ── Placeholder data ──────────────────────────────────────────────────────────

const STAT_SPARK = {
  stores: [14, 15, 15, 16, 16, 17, 18],
  inventory: [1.0, 1.05, 1.1, 1.08, 1.15, 1.18, 1.2],
  tasks: [52, 48, 44, 40, 41, 38, 37],
  orders: [98, 110, 118, 125, 130, 136, 142],
}

const STORE_SECTIONS: ListViewSection[] = [
  {
    label: "Active · 18 stores",
    items: [
      {
        id: "s1",
        icon: <GlassStatusDot kind="online" />,
        title: "Cluj · Main",
        subtitle: "€34,200 revenue today",
        value: "39% margin",
        chevron: true,
      },
      {
        id: "s2",
        icon: <GlassStatusDot kind="online" />,
        title: "București · Floreasca",
        subtitle: "€28,900 revenue today",
        value: "34% margin",
        chevron: true,
      },
      {
        id: "s3",
        icon: <GlassStatusDot kind="online" />,
        title: "Timișoara · Iulius",
        subtitle: "€21,400 revenue today",
        value: "31% margin",
        chevron: true,
      },
      {
        id: "s4",
        icon: <GlassStatusDot kind="away" />,
        title: "Brașov · Coresi",
        subtitle: "€18,600 revenue today",
        value: "29% margin",
        chevron: true,
      },
      {
        id: "s5",
        icon: <GlassStatusDot kind="busy" />,
        title: "Iași · Palas",
        subtitle: "⚠ Low stock · 3 items",
        value: "27% margin",
        chevron: true,
      },
    ],
  },
]

const INITIAL_KANBAN: KanbanColumn[] = [
  {
    id: "todo",
    title: "To Do",
    color: "var(--prv-text-3)",
    cards: [
      { id: "t1", title: "Restock shelves — Brașov", data: { priority: "high", assignee: "AR" } },
      { id: "t2", title: "HVAC maintenance — Iași", data: { priority: "med", assignee: "MP" } },
      { id: "t3", title: "Staff training — Timișoara", data: { priority: "low", assignee: "RC" } },
    ],
  },
  {
    id: "inprogress",
    title: "In Progress",
    color: "rgba(10,132,255,0.9)",
    cards: [
      { id: "t4", title: "Inventory audit — Cluj", data: { priority: "high", assignee: "EP" } },
      { id: "t5", title: "POS update — all stores", data: { priority: "med", assignee: "DM" } },
    ],
  },
  {
    id: "done",
    title: "Done",
    color: "rgba(48,209,88,0.95)",
    cards: [
      { id: "t6", title: "Signage refresh — București", data: { priority: "low", assignee: "LG" } },
      { id: "t7", title: "Fire exit inspection", data: { priority: "high", assignee: "TN" } },
      { id: "t8", title: "Monthly waste report", data: { priority: "low", assignee: "IA" } },
    ],
  },
]

interface OrderRow {
  id: string
  ref: string
  store: string
  customer: string
  amount: string
  status: "paid" | "pending" | "shipped"
}

const ORDERS: OrderRow[] = [
  { id: "1", ref: "#ORD-4821", store: "Cluj", customer: "Mihai Popescu", amount: "€298", status: "paid" },
  { id: "2", ref: "#ORD-4820", store: "București", customer: "Ana Ionescu", amount: "€540", status: "shipped" },
  { id: "3", ref: "#ORD-4819", store: "Timișoara", customer: "Radu Dima", amount: "€120", status: "pending" },
  { id: "4", ref: "#ORD-4818", store: "Brașov", customer: "Elena Marin", amount: "€76", status: "paid" },
  { id: "5", ref: "#ORD-4817", store: "Cluj", customer: "Vlad Nicu", amount: "€1,200", status: "shipped" },
]

const STATUS_COLORS: Record<string, string> = {
  paid: "rgba(48,209,88,0.95)",
  pending: "rgba(255,159,10,0.95)",
  shipped: "rgba(10,132,255,0.9)",
}

const STATUS_BG: Record<string, string> = {
  paid: "rgba(48,209,88,0.14)",
  pending: "rgba(255,159,10,0.14)",
  shipped: "rgba(10,132,255,0.14)",
}

const ORDER_COLUMNS: TableColumn<OrderRow>[] = [
  { key: "ref", label: "Order", sortable: true },
  { key: "store", label: "Store", sortable: true },
  { key: "customer", label: "Customer" },
  { key: "amount", label: "Amount", align: "right", sortable: true },
  {
    key: "status",
    label: "Status",
    align: "center",
    render: (row) => (
      <span
        className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px]"
        style={{ background: STATUS_BG[row.status], color: STATUS_COLORS[row.status] }}
      >
        {row.status}
      </span>
    ),
  },
]

const PRIORITY_COLORS: Record<string, { bg: string; color: string }> = {
  high: { bg: "rgba(255,59,48,0.15)", color: "rgba(255,99,90,0.95)" },
  med:  { bg: "rgba(255,159,10,0.15)", color: "rgba(255,179,64,0.95)" },
  low:  { bg: "rgba(48,209,88,0.15)", color: "rgba(80,220,120,0.95)" },
}

const MAIN_TABS: TabItem[] = [
  { id: "stores", label: "Stores" },
  { id: "tasks", label: "Tasks" },
  { id: "orders", label: "Orders" },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mx-1 mt-6 mb-2.5">
      {children}
    </p>
  )
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[18px] p-4 relative ${className}`}
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
      }}
    >
      {children}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OperationsWorkspace() {
  const [kanban, setKanban] = useState<KanbanColumn[]>(INITIAL_KANBAN)
  const [activeTab, setActiveTab] = useState("stores")

  function handleCardMove(cardId: string, fromColId: string, toColId: string) {
    setKanban((prev) => {
      const next = prev.map((col) => ({ ...col, cards: [...col.cards] }))
      const fromCol = next.find((c) => c.id === fromColId)
      const toCol   = next.find((c) => c.id === toColId)
      if (!fromCol || !toCol) return prev
      const idx  = fromCol.cards.findIndex((c) => c.id === cardId)
      if (idx === -1) return prev
      const [card] = fromCol.cards.splice(idx, 1)
      toCol.cards.push(card)
      return next
    })
  }

  const openTaskCount = kanban.find((c) => c.id === "todo")?.cards.length ?? 0
  const inProgressCount = kanban.find((c) => c.id === "inprogress")?.cards.length ?? 0

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-white/35 text-[13px] font-medium mb-0.5">PRV</p>
          <h1 className="text-white/90 text-[26px] font-semibold tracking-tight leading-tight">
            Operations
          </h1>
        </div>
        <div
          className="px-3 py-1.5 rounded-[10px] text-[12px] font-medium text-white/60"
          style={{
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
          }}
        >
          18 Stores
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 mb-3.5">
        <GlassStatCard
          label="Stores"
          value="18"
          trend={{ direction: "up", value: "2 new" }}
          sparkline={STAT_SPARK.stores}
        />
        <GlassStatCard
          label="Inventory"
          value="€1.2M"
          trend={{ direction: "up", value: "3.4%" }}
          sparkline={STAT_SPARK.inventory}
        />
        <GlassStatCard
          label="Open Tasks"
          value={String(openTaskCount + inProgressCount)}
          trend={{ direction: "down", value: "8 done today" }}
          sparkline={STAT_SPARK.tasks}
        />
        <GlassStatCard
          label="Orders Today"
          value="142"
          trend={{ direction: "up", value: "12%" }}
          sparkline={STAT_SPARK.orders}
        />
      </div>

      {/* Low-stock alert */}
      <div className="mb-4">
        <GlassAlertBanner
          type="warning"
          title="Low stock detected"
          description="Iași · Palas — 3 SKUs below reorder threshold"
        />
      </div>

      {/* Main tabs */}
      <GlassTabs
        tabs={MAIN_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="mb-4"
      />

      {/* ── Stores tab ── */}
      {activeTab === "stores" && (
        <GlassCard>
          <GlassListView sections={STORE_SECTIONS} size="md" />
        </GlassCard>
      )}

      {/* ── Tasks tab ── */}
      {activeTab === "tasks" && (
        <>
          <Label>Task Board</Label>
          <GlassKanban
            columns={kanban}
            onCardMove={handleCardMove}
            renderCard={(card) => {
              const d = card.data as { priority: string; assignee: string }
              const p = PRIORITY_COLORS[d.priority] ?? PRIORITY_COLORS.low
              return (
                <div>
                  <p className="text-[13px] font-semibold text-white/90 mb-2 leading-snug">
                    {card.title}
                  </p>
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px]"
                      style={{ background: p.bg, color: p.color }}
                    >
                      {d.priority}
                    </span>
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white/70"
                      style={{ background: "var(--prv-g3)" }}
                    >
                      {d.assignee}
                    </span>
                  </div>
                </div>
              )
            }}
          />
        </>
      )}

      {/* ── Orders tab ── */}
      {activeTab === "orders" && (
        <>
          <Label>Recent Orders</Label>
          <GlassCard>
            <GlassTable<OrderRow>
              columns={ORDER_COLUMNS}
              data={ORDERS}
              keyField="id"
            />
          </GlassCard>
        </>
      )}
    </div>
  )
}
