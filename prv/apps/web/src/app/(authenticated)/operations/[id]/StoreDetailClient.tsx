"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import type { StoreDetail, StoreTask, StoreOrder } from "@/app/api/operations/[id]/route"

function StatTile({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  return (
    <div
      style={{
        flex: 1,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        padding: "14px 13px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 3,
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
      <span
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: color ?? "rgba(255,255,255,0.92)",
          letterSpacing: "-0.5px",
        }}
      >
        {value}
      </span>
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
      {sub && (
        <span
          style={{
            fontSize: 11,
            color: color
              ? color.replace("0.95", "0.6").replace("0.9", "0.6")
              : "rgba(255,255,255,0.35)",
            fontWeight: 500,
            marginTop: 1,
          }}
        >
          {sub}
        </span>
      )}
    </div>
  )
}

function TaskItem({ task }: { task: StoreTask }) {
  const isDone = task.status === "done"
  const isActive = task.status === "in_progress"

  const priorityColor =
    task.priority === "urgent"
      ? "rgba(255,69,58,0.9)"
      : task.priority === "medium"
        ? "rgba(255,159,10,0.9)"
        : "rgba(255,255,255,0.35)"

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "13px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        opacity: isDone ? 0.55 : 1,
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isDone
            ? "rgba(48,209,88,0.14)"
            : isActive
              ? "rgba(10,132,255,0.14)"
              : "rgba(255,255,255,0.08)",
          border: isDone
            ? "1.5px solid rgba(48,209,88,0.5)"
            : isActive
              ? "1.5px solid rgba(10,132,255,0.5)"
              : "1.5px solid rgba(255,255,255,0.15)",
        }}
      >
        {isDone ? (
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(48,209,88,0.9)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : isActive ? (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="rgba(10,132,255,0.9)" stroke="none">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        ) : (
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.25)",
            }}
          />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: isDone ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.92)",
            textDecoration: isDone ? "line-through" : "none",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "block",
          }}
        >
          {task.title}
        </span>
        {isActive && (
          <span
            style={{
              fontSize: 11,
              color: "rgba(10,132,255,0.8)",
              fontWeight: 500,
              marginTop: 2,
              display: "block",
            }}
          >
            În desfășurare
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
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
            color: "rgba(255,255,255,0.7)",
          }}
        >
          {task.assigneeInitials}
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: priorityColor,
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          {task.priority}
        </span>
      </div>
    </div>
  )
}

function OrderItem({ order }: { order: StoreOrder }) {
  const statusConfig =
    order.status === "paid"
      ? { color: "rgba(48,209,88,0.9)", label: "Plătit" }
      : order.status === "shipped"
        ? { color: "rgba(10,132,255,0.9)", label: "Livrat" }
        : { color: "rgba(255,159,10,0.9)", label: "Așteptare" }

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
              color: "rgba(255,255,255,0.50)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {order.ref}
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.20)" }}>·</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{order.timeAgo}</span>
        </div>
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "rgba(255,255,255,0.85)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "block",
          }}
        >
          {order.customer}
        </span>
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

function SectionCard({
  title,
  badge,
  children,
}: {
  title: string
  badge?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ margin: "0 16px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "rgba(255,255,255,0.35)",
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          {title}
        </span>
        {badge && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.08)",
              borderRadius: 8,
              padding: "2px 7px",
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <div
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 20,
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
            background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)",
          }}
        />
        {children}
      </div>
    </div>
  )
}

export default function StoreDetailClient({ id }: { id: string }) {
  const [store, setStore] = useState<StoreDetail | null>(null)
  const [fabOpen, setFabOpen] = useState(false)

  useEffect(() => {
    fetch(`/api/operations/${id}`)
      .then((r) => r.json())
      .then((d) => setStore(d as StoreDetail))
      .catch(() => {})
  }, [id])

  const statusLabel =
    store?.status === "online" ? "Online" : store?.status === "away" ? "Away" : "Aglomerat"

  const statusColor =
    store?.status === "online"
      ? "rgba(48,209,88,0.95)"
      : store?.status === "away"
        ? "rgba(255,159,10,0.95)"
        : "rgba(255,69,58,0.95)"

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
      {/* Back + Header */}
      <div style={{ padding: "52px 16px 0" }}>
        <Link
          href="/operations"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            color: "rgba(10,132,255,0.9)",
            textDecoration: "none",
            fontSize: 15,
            fontWeight: 400,
            marginBottom: 16,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Operațiuni
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: "rgba(255,255,255,0.95)",
                margin: "0 0 6px",
                letterSpacing: "-0.5px",
              }}
            >
              {store?.name ?? "—"}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: statusColor,
                  background: statusColor.replace("0.95", "0.12"),
                  border: `1px solid ${statusColor.replace("0.95", "0.28")}`,
                  borderRadius: 8,
                  padding: "3px 9px",
                }}
              >
                {statusLabel}
              </span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                {store?.city ?? "—"}
              </span>
            </div>
          </div>
          {store?.hasAlert && (
            <div
              style={{
                padding: "8px 12px",
                background: "rgba(255,159,10,0.10)",
                border: "1px solid rgba(255,159,10,0.28)",
                borderRadius: 14,
                maxWidth: 180,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  color: "rgba(255,159,10,0.9)",
                  lineHeight: 1.4,
                  fontWeight: 500,
                }}
              >
                {store.alertMessage}
              </p>
            </div>
          )}
        </div>

        {/* Address / Hours */}
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
              {store?.address ?? "—"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
              {store?.hours ?? "—"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
              {store?.managerName ?? "—"} · Manager
            </span>
          </div>
        </div>
      </div>

      {/* 2×2 Stat Grid */}
      <div
        style={{ padding: "20px 16px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
      >
        <StatTile
          label="Venit Azi"
          value={store?.revenueTodayLabel ?? "—"}
          sub={store?.revenueTrend}
          color="rgba(48,209,88,0.95)"
        />
        <StatTile
          label="Marjă"
          value={store ? `${store.marginPct}%` : "—"}
          sub={store?.marginTrend}
        />
        <StatTile
          label="Comenzi Azi"
          value={store?.ordersToday ?? "—"}
          sub={store ? `${store.pendingOrders} în așteptare` : undefined}
          color="rgba(10,132,255,0.9)"
        />
        <StatTile label="Personal" value={store?.staffCount ?? "—"} sub={store?.shift} />
      </div>

      {/* Tasks */}
      <div style={{ marginTop: 24 }}>
        <SectionCard
          title="Sarcini"
          badge={
            store
              ? `${store.tasks.filter((t) => t.status === "done").length}/${store.tasks.length} completate`
              : undefined
          }
        >
          {store
            ? store.tasks.map((t) => <TaskItem key={t.id} task={t} />)
            : [1, 2].map((n) => (
                <div
                  key={n}
                  style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div
                    style={{
                      height: 14,
                      background: "rgba(255,255,255,0.07)",
                      borderRadius: 5,
                      width: "55%",
                      marginBottom: 7,
                    }}
                  />
                  <div
                    style={{
                      height: 11,
                      background: "rgba(255,255,255,0.04)",
                      borderRadius: 4,
                      width: "35%",
                    }}
                  />
                </div>
              ))}
        </SectionCard>
      </div>

      {/* Orders */}
      <SectionCard
        title="Comenzi Recente"
        badge={store ? `${store.orders.length} comenzi` : undefined}
      >
        {store
          ? store.orders.map((o) => <OrderItem key={o.id} order={o} />)
          : [1, 2].map((n) => (
              <div
                key={n}
                style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div
                  style={{
                    height: 14,
                    background: "rgba(255,255,255,0.07)",
                    borderRadius: 5,
                    width: "60%",
                    marginBottom: 7,
                  }}
                />
                <div
                  style={{
                    height: 11,
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 4,
                    width: "40%",
                  }}
                />
              </div>
            ))}
      </SectionCard>

      {/* FAB 3-dot */}
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
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.92)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="5" r="1" fill="currentColor" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
          <circle cx="12" cy="19" r="1" fill="currentColor" />
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
                label: "Generează Raport",
                icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
                color: "rgba(255,255,255,0.75)",
              },
              {
                label: "Contactează Manager",
                icon: "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.29 6.29l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
                color: "rgba(10,132,255,0.9)",
              },
              {
                label: "Setează Alertă",
                icon: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0",
                color: "rgba(255,159,10,0.9)",
              },
              {
                label: "Dezactivează Magazin",
                icon: "M18.36 6.64A9 9 0 015.64 19.36 M9.9 4.24A9.12 9.12 0 0112 4a9 9 0 019 9 M12 20v2 M12 2v2 M4.22 4.22l1.42 1.42 M18.36 18.36l1.42 1.42",
                color: "rgba(255,69,58,0.9)",
              },
            ].map((item, i, arr) => (
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
                  borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
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
                    background: item.color.replace("0.9", "0.14").replace("0.75", "0.10"),
                    border: `1px solid ${item.color.replace("0.9", "0.28").replace("0.75", "0.20")}`,
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
