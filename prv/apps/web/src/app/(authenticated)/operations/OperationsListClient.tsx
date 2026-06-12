"use client"

import { useState } from "react"
import Link from "next/link"
import type { Store, Task, Order, Alert, OperationsMeta } from "@/app/api/operations/route"
import { useOperationsData } from "@/lib/api-hooks"

type FilterType = "Toate" | "Magazine" | "Sarcini" | "Comenzi"

interface OperationsData {
  stores: Store[]
  tasks: Task[]
  orders: Order[]
  meta: OperationsMeta
  alerts: Alert[]
}

function KpiTile({
  label,
  value,
  color,
}: {
  label: string
  value: string | number
  color: string
}) {
  return (
    <div
      style={{
        flex: 1,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        padding: "14px 12px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
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
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)",
        }}
      />
      <span style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: "-0.5px" }}>{value}</span>
      <span
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.45)",
          fontWeight: 500,
          letterSpacing: 0.2,
        }}
      >
        {label}
      </span>
    </div>
  )
}

function AlertBanner({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null
  return (
    <div
      style={{
        margin: "0 16px",
        background: "rgba(255,159,10,0.12)",
        border: "1px solid rgba(255,159,10,0.28)",
        borderRadius: 14,
        padding: "11px 14px",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(255,159,10,0.95)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ marginTop: 1, flexShrink: 0 }}
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <div style={{ flex: 1 }}>
        {alerts.map((a) => (
          <p
            key={a.id}
            style={{
              margin: 0,
              fontSize: 13,
              color: "rgba(255,159,10,0.95)",
              fontWeight: 500,
              lineHeight: 1.4,
            }}
          >
            <span style={{ opacity: 0.7 }}>{a.storeName} · </span>
            {a.message}
          </p>
        ))}
      </div>
    </div>
  )
}

function StoreStatusDot({ status }: { status: Store["status"] }) {
  const color =
    status === "online"
      ? "rgba(48,209,88,0.95)"
      : status === "away"
        ? "rgba(255,159,10,0.95)"
        : "rgba(255,69,58,0.95)"
  return (
    <div
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
        boxShadow: `0 0 6px ${color}`,
      }}
    />
  )
}

function StoreRow({ store }: { store: Store }) {
  const borderColor =
    store.status === "online"
      ? "rgba(48,209,88,0.7)"
      : store.status === "away"
        ? "rgba(255,159,10,0.7)"
        : "rgba(255,69,58,0.7)"

  const marginColor =
    store.marginPct >= 35
      ? "rgba(48,209,88,0.9)"
      : store.marginPct >= 28
        ? "rgba(255,159,10,0.9)"
        : "rgba(255,69,58,0.9)"

  return (
    <Link href={`/operations/${store.id}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px 14px 13px",
          borderLeft: "3px solid transparent",
          borderImage: `linear-gradient(180deg,${borderColor},${borderColor}80) 1`,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          cursor: "pointer",
          transition: "background 0.15s",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <StoreStatusDot status={store.status} />
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "rgba(255,255,255,0.95)",
                letterSpacing: "-0.2px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {store.name}
            </span>
            {store.hasAlert && (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,159,10,0.9)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
              {store.revenueTodayLabel}
            </span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>·</span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
              {store.ordersToday} comenzi
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: marginColor,
              background: `${marginColor.replace("0.9", "0.12")}`,
              border: `1px solid ${marginColor.replace("0.9", "0.28")}`,
              borderRadius: 8,
              padding: "2px 8px",
            }}
          >
            {store.marginPct}%
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </Link>
  )
}

function TaskRow({ task }: { task: Task }) {
  const borderColor =
    task.status === "in_progress"
      ? "rgba(10,132,255,0.7)"
      : task.priority === "urgent"
        ? "rgba(255,69,58,0.7)"
        : task.priority === "medium"
          ? "rgba(255,159,10,0.7)"
          : "transparent"

  const priorityColor =
    task.priority === "urgent"
      ? "rgba(255,69,58,0.9)"
      : task.priority === "medium"
        ? "rgba(255,159,10,0.9)"
        : "rgba(255,255,255,0.35)"

  const statusColor =
    task.status === "done"
      ? "rgba(48,209,88,0.9)"
      : task.status === "in_progress"
        ? "rgba(10,132,255,0.9)"
        : "rgba(255,255,255,0.45)"

  const statusLabel =
    task.status === "done" ? "Completed" : task.status === "in_progress" ? "In Progress" : "To Do"

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "13px 16px 13px 13px",
        borderLeft: "3px solid transparent",
        borderImage:
          borderColor !== "transparent"
            ? `linear-gradient(180deg,${borderColor},${borderColor}80) 1`
            : undefined,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: task.status === "done" ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.92)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textDecoration: task.status === "done" ? "line-through" : "none",
            }}
          >
            {task.title}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: priorityColor,
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            {task.priority}
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>·</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{task.storeName}</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.10)",
            border: "1px solid rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 700,
            color: "rgba(255,255,255,0.75)",
          }}
        >
          {task.assigneeInitials}
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: statusColor,
            background: statusColor.replace("0.9", "0.12"),
            border: `1px solid ${statusColor.replace("0.9", "0.28")}`,
            borderRadius: 8,
            padding: "2px 7px",
            whiteSpace: "nowrap",
          }}
        >
          {statusLabel}
        </span>
      </div>
    </div>
  )
}

function OrderRow({ order }: { order: Order }) {
  const statusConfig =
    order.status === "paid"
      ? { color: "rgba(48,209,88,0.9)", label: "Paid" }
      : order.status === "shipped"
        ? { color: "rgba(10,132,255,0.9)", label: "Livrat" }
        : { color: "rgba(255,159,10,0.9)", label: "Pending" }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "13px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "rgba(255,255,255,0.55)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {order.ref}
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>·</span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>{order.storeName}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "rgba(255,255,255,0.85)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {order.customer}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "rgba(255,255,255,0.92)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {order.amountLabel}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: statusConfig.color,
            background: statusConfig.color.replace("0.9", "0.12"),
            border: `1px solid ${statusConfig.color.replace("0.9", "0.28")}`,
            borderRadius: 8,
            padding: "2px 7px",
          }}
        >
          {statusConfig.label}
        </span>
      </div>
    </div>
  )
}

function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "18px 16px 10px",
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "rgba(255,255,255,0.35)",
          textTransform: "uppercase",
          letterSpacing: 0.8,
        }}
      >
        {label}
      </span>
      {count !== undefined && (
        <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.25)" }}>
          {count}
        </span>
      )}
    </div>
  )
}

function SkeletonRow() {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        gap: 12,
        alignItems: "center",
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            height: 14,
            background: "rgba(255,255,255,0.08)",
            borderRadius: 6,
            marginBottom: 8,
            width: "60%",
          }}
        />
        <div
          style={{
            height: 11,
            background: "rgba(255,255,255,0.05)",
            borderRadius: 4,
            width: "40%",
          }}
        />
      </div>
      <div
        style={{ width: 44, height: 22, background: "rgba(255,255,255,0.06)", borderRadius: 8 }}
      />
    </div>
  )
}

export default function OperationsListClient() {
  const [filter, setFilter] = useState<FilterType>("All")
  const [fabOpen, setFabOpen] = useState(false)
  const { data } = useOperationsData()

  const filters: FilterType[] = ["Toate", "Magazine", "Sarcini", "Comenzi"]

  const activeTasks = data?.tasks.filter((t) => t.status !== "done") ?? []
  const allTasks = data?.tasks ?? []
  const allOrders = data?.orders ?? []

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        paddingBottom: 120,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ padding: "56px 16px 0" }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "rgba(255,255,255,0.95)",
            margin: 0,
            letterSpacing: "-0.6px",
          }}
        >
          Operations
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.35)",
            margin: "4px 0 0",
            fontWeight: 400,
          }}
        >
          Real-time monitoring
        </p>
      </div>

      {/* KPI Strip */}
      <div style={{ display: "flex", gap: 8, padding: "16px 16px 0" }}>
        <KpiTile
          label="Magazine"
          value={data?.meta.totalStores ?? "—"}
          color="rgba(48,209,88,0.95)"
        />
        <KpiTile
          label="Sarcini"
          value={data?.meta.activeTaskCount ?? "—"}
          color="rgba(255,159,10,0.95)"
        />
        <KpiTile
          label="Comenzi"
          value={data?.meta.ordersToday ?? "—"}
          color="rgba(10,132,255,0.9)"
        />
        <KpiTile label="Alerte" value={data?.meta.alertCount ?? "—"} color="rgba(255,69,58,0.95)" />
      </div>

      {/* Alert Banner */}
      <div style={{ marginTop: 14 }}>
        <AlertBanner alerts={data?.alerts ?? []} />
      </div>

      {/* Filter Chips */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "16px 16px 0",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "7px 16px",
              borderRadius: 100,
              border:
                filter === f
                  ? "1px solid rgba(255,255,255,0.40)"
                  : "1px solid rgba(255,255,255,0.12)",
              background: filter === f ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)",
              color: filter === f ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)",
              fontSize: 13,
              fontWeight: filter === f ? 600 : 400,
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: "inherit",
              flexShrink: 0,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ marginTop: 6 }}>
        {/* Stores Section */}
        {(filter === "All" || filter === "Magazine") && (
          <div>
            <SectionHeader
              label="Magazine"
              count={filter === "All" ? undefined : data?.stores.length}
            />
            <div
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 20,
                margin: "0 16px",
                overflow: "hidden",
                position: "relative",
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
                    "linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)",
                }}
              />
              {data
                ? (filter === "All" ? data.stores.slice(0, 3) : data.stores).map((store) => (
                    <StoreRow key={store.id} store={store} />
                  ))
                : [1, 2, 3].map((n) => <SkeletonRow key={n} />)}
              {filter === "All" && data && data.stores.length > 3 && (
                <button
                  onClick={() => setFilter("Magazine")}
                  style={{
                    width: "100%",
                    padding: "13px 16px",
                    background: "none",
                    border: "none",
                    color: "rgba(10,132,255,0.9)",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                    textAlign: "center",
                    fontFamily: "inherit",
                  }}
                >
                  Vezi toate {data.stores.length} magazinele
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tasks Section */}
        {(filter === "All" || filter === "Sarcini") && (
          <div>
            <SectionHeader
              label="Sarcini Active"
              count={filter === "All" ? undefined : allTasks.length}
            />
            <div
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 20,
                margin: "0 16px",
                overflow: "hidden",
                position: "relative",
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
                    "linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)",
                }}
              />
              {data
                ? (filter === "All" ? activeTasks.slice(0, 4) : allTasks).map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))
                : [1, 2, 3].map((n) => <SkeletonRow key={n} />)}
              {filter === "All" && data && activeTasks.length > 4 && (
                <button
                  onClick={() => setFilter("Sarcini")}
                  style={{
                    width: "100%",
                    padding: "13px 16px",
                    background: "none",
                    border: "none",
                    color: "rgba(10,132,255,0.9)",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                    textAlign: "center",
                    fontFamily: "inherit",
                  }}
                >
                  Vezi toate sarcinile active
                </button>
              )}
            </div>
          </div>
        )}

        {/* Orders Section */}
        {(filter === "All" || filter === "Comenzi") && (
          <div>
            <SectionHeader
              label="Comenzi Recente"
              count={filter === "All" ? undefined : allOrders.length}
            />
            <div
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 20,
                margin: "0 16px",
                overflow: "hidden",
                position: "relative",
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
                    "linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)",
                }}
              />
              {data
                ? (filter === "All" ? allOrders.slice(0, 4) : allOrders).map((order) => (
                    <OrderRow key={order.id} order={order} />
                  ))
                : [1, 2, 3].map((n) => <SkeletonRow key={n} />)}
              {filter === "All" && data && allOrders.length > 4 && (
                <button
                  onClick={() => setFilter("Comenzi")}
                  style={{
                    width: "100%",
                    padding: "13px 16px",
                    background: "none",
                    border: "none",
                    color: "rgba(10,132,255,0.9)",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                    textAlign: "center",
                    fontFamily: "inherit",
                  }}
                >
                  Vezi toate comendays
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setFabOpen(true)}
        style={{
          position: "fixed",
          bottom: 88,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.14)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          border: "1px solid rgba(255,255,255,0.28)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.25)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 40,
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.92)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* FAB Sheet */}
      {fabOpen && (
        <>
          <div
            onClick={() => setFabOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              zIndex: 48,
            }}
          />
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: "rgba(28,28,30,0.92)",
              backdropFilter: "blur(48px)",
              WebkitBackdropFilter: "blur(48px)",
              borderTop: "1px solid rgba(255,255,255,0.14)",
              borderRadius: "28px 28px 0 0",
              padding: "12px 16px 44px",
              zIndex: 50,
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                background: "rgba(255,255,255,0.20)",
                borderRadius: 2,
                margin: "0 auto 20px",
              }}
            />
            {[
              {
                label: "Magazin Nou",
                icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
                color: "rgba(48,209,88,0.9)",
              },
              {
                label: "New Task",
                icon: "M9 11l3 3L22 4 M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
                color: "rgba(10,132,255,0.9)",
              },
              {
                label: "Export Raport",
                icon: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M7 10l5 5 5-5 M12 15V3",
                color: "rgba(255,255,255,0.75)",
              },
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => setFabOpen(false)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "15px 4px",
                  background: "none",
                  border: "none",
                  borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: item.color.replace("0.9", "0.14"),
                    border: `1px solid ${item.color.replace("0.9", "0.28")}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={item.color}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={item.icon} />
                  </svg>
                </div>
                <span style={{ fontSize: 16, fontWeight: 500, color: item.color }}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
