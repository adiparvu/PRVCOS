"use client"

import { useState, useMemo } from "react"
import {
  GlassStatCard,
  GlassAlertBanner,
  GlassListView,
  GlassKanban,
  GlassTable,
  GlassStatusDot,
  GlassTabs,
  type KanbanColumn,
  type KanbanCard,
  type TableColumn,
  type ListViewSection,
  type TabItem,
} from "@prv/ui"
import { useOperationsData } from "@/lib/api-hooks"
import type { Order, Task } from "@/app/api/operations/route"

// ── Static display config ─────────────────────────────────────────────────────

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

const PRIORITY_COLORS: Record<string, { bg: string; color: string }> = {
  urgent: { bg: "rgba(255,59,48,0.15)", color: "rgba(255,99,90,0.95)" },
  medium: { bg: "rgba(255,159,10,0.15)", color: "rgba(255,179,64,0.95)" },
  low: { bg: "rgba(48,209,88,0.15)", color: "rgba(80,220,120,0.95)" },
}

const MAIN_TABS: TabItem[] = [
  { value: "stores", label: "Stores" },
  { value: "tasks", label: "Tasks" },
  { value: "orders", label: "Orders" },
]

const ORDER_COLUMNS: TableColumn<Order>[] = [
  { key: "ref", label: "Order", sortable: true },
  { key: "storeName", label: "Store", sortable: true },
  { key: "customer", label: "Customer" },
  { key: "amountLabel", label: "Amount", align: "right", sortable: true },
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

const STAT_SPARK = {
  stores: [14, 15, 15, 16, 16, 17, 18],
  alerts: [2, 3, 1, 4, 2, 3, 2],
  tasks: [52, 48, 44, 40, 41, 38, 37],
  orders: [98, 110, 118, 125, 130, 136, 142],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mx-1 mt-6 mb-2.5">
      {children}
    </p>
  )
}

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-[18px] p-4 relative ${className}`}
      style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
    >
      {children}
    </div>
  )
}

function buildKanban(tasks: Task[]): KanbanColumn[] {
  const byStatus = (status: Task["status"]): KanbanCard[] =>
    tasks
      .filter((t) => t.status === status)
      .map((t) => ({
        id: t.id,
        title: t.title,
        data: { priority: t.priority, assignee: t.assigneeInitials },
      }))

  return [
    { id: "todo", title: "To Do", color: "var(--prv-text-3)", cards: byStatus("todo") },
    {
      id: "inprogress",
      title: "In Progress",
      color: "rgba(10,132,255,0.9)",
      cards: byStatus("in_progress"),
    },
    { id: "done", title: "Done", color: "rgba(48,209,88,0.95)", cards: byStatus("done") },
  ]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OperationsWorkspace() {
  const [activeTab, setActiveTab] = useState("stores")

  const { data, isLoading } = useOperationsData()

  // Derive the kanban board from server tasks, but keep it as local state so
  // drag-and-drop can reorder cards optimistically. Re-sync during render
  // (React's recommended pattern) whenever a new tasks reference arrives.
  const tasks = data?.tasks
  const [syncedTasks, setSyncedTasks] = useState<typeof tasks>(undefined)
  const [kanban, setKanban] = useState<KanbanColumn[]>([])
  if (tasks && tasks !== syncedTasks) {
    setSyncedTasks(tasks)
    setKanban(buildKanban(tasks))
  }

  const storeSections = useMemo<ListViewSection[]>(() => {
    if (!data?.stores) return []
    return [
      {
        label: `Active · ${data.meta.totalStores} stores`,
        items: data.stores.map((s) => ({
          id: s.id,
          icon: <GlassStatusDot status={s.status} />,
          title: `${s.city} · ${s.name}`,
          subtitle: s.hasAlert && s.alertMessage ? `⚠ ${s.alertMessage}` : s.revenueTodayLabel,
          value: `${s.marginPct}% margin`,
          chevron: true,
        })),
      },
    ]
  }, [data])

  function handleCardMove(cardId: string, fromColId: string, toColId: string) {
    setKanban((prev) => {
      const next = prev.map((col) => ({ ...col, cards: [...col.cards] }))
      const fromCol = next.find((c) => c.id === fromColId)
      const toCol = next.find((c) => c.id === toColId)
      if (!fromCol || !toCol) return prev
      const idx = fromCol.cards.findIndex((c) => c.id === cardId)
      if (idx === -1) return prev
      const [card] = fromCol.cards.splice(idx, 1)
      if (!card) return prev
      toCol.cards.push(card)
      return next
    })
  }

  const openTaskCount = kanban.find((c) => c.id === "todo")?.cards.length ?? 0
  const inProgressCount = kanban.find((c) => c.id === "inprogress")?.cards.length ?? 0

  const firstAlert = data?.alerts?.[0] ?? null
  const totalStores = data?.meta.totalStores ?? 0

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
          style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
        >
          {isLoading ? "…" : `${totalStores} Stores`}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 mb-3.5">
        <GlassStatCard
          label="Stores"
          value={isLoading ? "…" : String(data?.meta.totalStores ?? 0)}
          sparkline={STAT_SPARK.stores}
        />
        <GlassStatCard
          label="Alerts"
          value={isLoading ? "…" : String(data?.meta.alertCount ?? 0)}
          trend={data?.meta.alertCount ? { direction: "up", value: "active" } : undefined}
          sparkline={STAT_SPARK.alerts}
        />
        <GlassStatCard
          label="Open Tasks"
          value={isLoading ? "…" : String(openTaskCount + inProgressCount)}
          trend={{ direction: "down", value: "8 done today" }}
          sparkline={STAT_SPARK.tasks}
        />
        <GlassStatCard
          label="Orders Today"
          value={isLoading ? "…" : String(data?.meta.ordersToday ?? 0)}
          sparkline={STAT_SPARK.orders}
        />
      </div>

      {/* Alert banner */}
      {firstAlert && (
        <div className="mb-4">
          <GlassAlertBanner
            type="warning"
            title={firstAlert.storeName}
            description={firstAlert.message}
          />
        </div>
      )}

      {/* Main tabs */}
      <GlassTabs tabs={MAIN_TABS} value={activeTab} onChange={setActiveTab} className="mb-4" />

      {/* ── Stores tab ── */}
      {activeTab === "stores" && (
        <GlassCard>
          {isLoading ? (
            <div className="py-8 text-center text-white/30 text-[13px]">Loading stores…</div>
          ) : (
            <GlassListView sections={storeSections} size="md" />
          )}
        </GlassCard>
      )}

      {/* ── Tasks tab ── */}
      {activeTab === "tasks" && (
        <>
          <Label>Task Board</Label>
          {isLoading ? (
            <div className="py-8 text-center text-white/30 text-[13px]">Loading tasks…</div>
          ) : (
            <GlassKanban
              columns={kanban}
              onCardMove={handleCardMove}
              renderCard={(card) => {
                const d = card.data as { priority: string; assignee: string }
                const p = PRIORITY_COLORS[d.priority] ?? PRIORITY_COLORS["low"]!
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
          )}
        </>
      )}

      {/* ── Orders tab ── */}
      {activeTab === "orders" && (
        <>
          <Label>Recent Orders</Label>
          <GlassCard>
            {isLoading ? (
              <div className="py-8 text-center text-white/30 text-[13px]">Loading orders…</div>
            ) : (
              <GlassTable<Order & Record<string, unknown>>
                columns={ORDER_COLUMNS}
                data={(data?.orders ?? []) as (Order & Record<string, unknown>)[]}
                keyField="id"
              />
            )}
          </GlassCard>
        </>
      )}
    </div>
  )
}
