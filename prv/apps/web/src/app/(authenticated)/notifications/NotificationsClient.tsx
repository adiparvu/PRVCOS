"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import type { NotificationFilter, NotificationCounts } from "@prv/db"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { NotificationCard } from "./NotificationCard"
import type { ClientNotif } from "./NotificationCard"
import { NotificationFilters } from "./NotificationFilters"
import { BulkActionsBar } from "./BulkActionsBar"

// ─── Preferences tab types ────────────────────────────────────────────────────

interface ModuleToggle {
  label: string
  enabled: boolean
}

const INITIAL_MODULES: ModuleToggle[] = [
  { label: "Operations", enabled: true },
  { label: "Finance", enabled: true },
  { label: "People & HR", enabled: true },
  { label: "Approvals", enabled: true },
  { label: "Fleet", enabled: false },
  { label: "Procurement", enabled: true },
  { label: "Projects", enabled: true },
  { label: "CRM", enabled: false },
]

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      className="relative cursor-pointer flex-shrink-0"
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        background: on ? "rgba(48,209,88,0.70)" : "rgba(255,255,255,0.18)",
        transition: "background 0.2s",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 3,
          left: on ? 21 : 3,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
          transition: "left 0.2s",
        }}
      />
    </div>
  )
}

// ─── Section helpers ──────────────────────────────────────────────────────────

function getSection(iso: string): "Today" | "Yesterday" | "Earlier" {
  const d = new Date(iso)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === now.toDateString()) return "Today"
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  return "Earlier"
}

function groupBySection(items: ClientNotif[]) {
  const groups: Record<string, ClientNotif[]> = { Today: [], Yesterday: [], Earlier: [] }
  for (const n of items) {
    groups[getSection(n.createdAt)]!.push(n)
  }
  return groups
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  initialFilter: NotificationFilter
  initialNotifications: ClientNotif[]
  initialCounts: NotificationCounts
  userId: string
  companyId: string
}

type ActiveTab = "Feed" | "Preferences"

export function NotificationsClient({
  initialFilter,
  initialNotifications,
  initialCounts,
  userId,
  companyId,
}: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("Feed")
  const [filter, setFilter] = useState<NotificationFilter>(initialFilter)
  const [notifications, setNotifications] = useState<ClientNotif[]>(initialNotifications)
  const [counts, setCounts] = useState<NotificationCounts>(initialCounts)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Preferences state — preserved from NotificationsWorkspace
  const [push, setPush] = useState(true)
  const [email, setEmail] = useState(true)
  const [sms, setSms] = useState(false)
  const [quietHours, setQuietHours] = useState(true)
  const [allowCritical, setAllowCritical] = useState(true)
  const [modules, setModules] = useState(INITIAL_MODULES)

  const filterRef = useRef(filter)
  filterRef.current = filter

  // Fetch list when filter changes
  useEffect(() => {
    if (filter === initialFilter && notifications === initialNotifications) return
    setLoading(true)
    fetch(`/api/notifications?filter=${filter}&includeCounts=true`)
      .then((r) => r.json())
      .then((data: { items: ClientNotif[]; counts: NotificationCounts | null }) => {
        setNotifications(data.items)
        if (data.counts) setCounts(data.counts)
      })
      .catch(() => null)
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  // Supabase realtime — prepend new notifications for this user
  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    const channel = supabase
      .channel(`notif-inbox:${userId}:${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new
          const incoming: ClientNotif = {
            id: row.id as string,
            type: row.type as ClientNotif["type"],
            title: row.title as string,
            body: (row.body as string | null) ?? null,
            actionUrl: (row.action_url as string | null) ?? null,
            entityType: (row.entity_type as string | null) ?? null,
            entityId: (row.entity_id as string | null) ?? null,
            isRead: false,
            isDismissed: false,
            createdAt: new Date(row.created_at as string).toISOString(),
            metadata: (row.metadata as Record<string, unknown>) ?? {},
          }

          // Only prepend if visible under current filter
          const matchesFilter =
            filterRef.current === "all" ||
            (filterRef.current === "alerts" &&
              (incoming.type === "error" || incoming.type === "warning")) ||
            (filterRef.current === "approvals" && incoming.type === "action_required") ||
            (filterRef.current === "inbox" &&
              (incoming.type === "info" || incoming.type === "success")) ||
            (filterRef.current === "system" && incoming.entityType === "system")

          if (matchesFilter) {
            setNotifications((prev) => [incoming, ...prev])
          }

          setCounts((prev) => ({
            ...prev,
            all: prev.all + 1,
            alerts:
              incoming.type === "error" || incoming.type === "warning"
                ? prev.alerts + 1
                : prev.alerts,
            approvals: incoming.type === "action_required" ? prev.approvals + 1 : prev.approvals,
            inbox:
              incoming.type === "info" || incoming.type === "success" ? prev.inbox + 1 : prev.inbox,
          }))
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, companyId])

  // ── Optimistic handlers ──────────────────────────────────────────────────────

  const handleRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    setCounts((prev) => ({ ...prev, all: Math.max(0, prev.all - 1) }))
    void fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRead: true }),
    })
  }, [])

  const handleDismiss = useCallback(
    (id: string) => {
      const notif = notifications.find((n) => n.id === id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      if (notif && !notif.isRead) {
        setCounts((prev) => ({ ...prev, all: Math.max(0, prev.all - 1) }))
      }
      void fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDismissed: true }),
      })
    },
    [notifications]
  )

  const handleAction = useCallback((id: string, action: "approve" | "decline") => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    setCounts((prev) => ({
      ...prev,
      all: Math.max(0, prev.all - 1),
      approvals: Math.max(0, prev.approvals - 1),
    }))
    void fetch(`/api/notifications/${id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
  }, [])

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setCounts((prev) => ({ ...prev, all: 0, alerts: 0, approvals: 0, inbox: 0, system: 0 }))
    void fetch("/api/notifications/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation: "mark_all_read", filter }),
    })
  }, [filter])

  const handleDismissAll = useCallback(() => {
    setNotifications([])
    setCounts({ all: 0, alerts: 0, approvals: 0, inbox: 0, system: 0 })
    void fetch("/api/notifications/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation: "dismiss_all", filter }),
    })
  }, [filter])

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  // ── Derived ──────────────────────────────────────────────────────────────────

  const unreadCount = notifications.filter((n) => !n.isRead).length
  const grouped = groupBySection(notifications)
  const SECTION_ORDER = ["Today", "Yesterday", "Earlier"] as const

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[13px] font-medium mb-0.5" style={{ color: "var(--prv-text-3)" }}>
            PRV
          </p>
          <h1
            className="text-[26px] font-semibold tracking-tight leading-tight"
            style={{ color: "var(--prv-text-1)" }}
          >
            Inbox
          </h1>
        </div>
        {unreadCount > 0 && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-[11px] font-semibold mt-1"
            style={{
              background: "rgba(255,69,58,0.12)",
              border: "1px solid rgba(255,69,58,0.20)",
              color: "rgba(255,99,90,0.90)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "rgba(255,69,58,0.90)" }}
            />
            {unreadCount} unread
          </div>
        )}
      </div>

      {/* Tab toggle */}
      <div
        className="flex gap-1 p-1 rounded-[12px] mb-4"
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
        }}
      >
        {(["Feed", "Preferences"] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-1.5 rounded-[9px] text-[12px] font-semibold transition-all"
            style={{
              background: activeTab === tab ? "var(--prv-g2)" : "transparent",
              border: "none",
              color: activeTab === tab ? "var(--prv-text-1)" : "var(--prv-text-3)",
              cursor: "pointer",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Feed Tab ─────────────────────────────────────────────────────────── */}
      {activeTab === "Feed" && (
        <>
          <NotificationFilters filter={filter} counts={counts} onChange={setFilter} />
          <BulkActionsBar
            unreadCount={unreadCount}
            filter={filter}
            onMarkAllRead={handleMarkAllRead}
            onDismissAll={handleDismissAll}
          />

          {loading && (
            <div
              className="text-center py-8 text-[13px]"
              style={{ color: "rgba(255,255,255,0.26)" }}
            >
              Loading…
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <div
                className="w-14 h-14 rounded-[20px] flex items-center justify-center mb-4"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p
                className="text-[15px] font-semibold mb-1.5"
                style={{ color: "rgba(255,255,255,0.50)" }}
              >
                All clear
              </p>
              <p
                className="text-[13px] max-w-[220px]"
                style={{ color: "rgba(255,255,255,0.25)", lineHeight: 1.5 }}
              >
                No notifications here. You&apos;ll be notified when something needs your attention.
              </p>
            </div>
          )}

          {!loading &&
            SECTION_ORDER.map((section) => {
              const items = grouped[section]!
              if (items.length === 0) return null
              return (
                <div key={section} className="mb-1.5">
                  {/* Section divider */}
                  <div className="flex items-center gap-2 my-3">
                    <span
                      className="text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap"
                      style={{ color: "rgba(255,255,255,0.24)" }}
                    >
                      {section}
                    </span>
                    <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                  </div>

                  {items.map((notif) => (
                    <NotificationCard
                      key={notif.id}
                      notification={notif}
                      isExpanded={expandedId === notif.id}
                      onToggleExpand={toggleExpand}
                      onRead={handleRead}
                      onDismiss={handleDismiss}
                      onAction={handleAction}
                    />
                  ))}
                </div>
              )
            })}

          {/* Swipe hint */}
          {notifications.length > 0 && (
            <div
              className="flex items-center justify-center gap-2 mt-4 py-2.5 rounded-[12px]"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.28)"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.26)" }}>
                Swipe left to dismiss · right to mark read
              </span>
            </div>
          )}
        </>
      )}

      {/* ── Preferences Tab ──────────────────────────────────────────────────── */}
      {activeTab === "Preferences" && (
        <div>
          <SectionHeading>Channels</SectionHeading>
          <PrefCard>
            {[
              {
                label: "Push Notifications",
                sub: undefined as string | undefined,
                val: push,
                set: setPush,
              },
              { label: "Email Digest", sub: "Daily summary at 08:00", val: email, set: setEmail },
              { label: "SMS Alerts", sub: "Critical only", val: sms, set: setSms },
            ].map((row, i, arr) => (
              <PrefRow key={row.label} last={i === arr.length - 1}>
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: "var(--prv-text-1)" }}>
                    {row.label}
                  </p>
                  {row.sub && (
                    <p className="text-[12px] mt-0.5" style={{ color: "var(--prv-text-3)" }}>
                      {row.sub}
                    </p>
                  )}
                </div>
                <Toggle on={row.val} onToggle={() => row.set((v) => !v)} />
              </PrefRow>
            ))}
          </PrefCard>

          <SectionHeading>By Module</SectionHeading>
          <PrefCard>
            {modules.map((m, i) => (
              <PrefRow key={m.label} last={i === modules.length - 1}>
                <p className="text-[14px] font-semibold" style={{ color: "var(--prv-text-1)" }}>
                  {m.label}
                </p>
                <Toggle
                  on={m.enabled}
                  onToggle={() =>
                    setModules((prev) =>
                      prev.map((mod, idx) => (idx === i ? { ...mod, enabled: !mod.enabled } : mod))
                    )
                  }
                />
              </PrefRow>
            ))}
          </PrefCard>

          <SectionHeading>Quiet Hours</SectionHeading>
          <PrefCard>
            <PrefRow>
              <div>
                <p className="text-[14px] font-semibold" style={{ color: "var(--prv-text-1)" }}>
                  Enable Quiet Hours
                </p>
                <p className="text-[12px] mt-0.5" style={{ color: "var(--prv-text-3)" }}>
                  22:00 – 07:00
                </p>
              </div>
              <Toggle on={quietHours} onToggle={() => setQuietHours((v) => !v)} />
            </PrefRow>
            <PrefRow last>
              <div>
                <p className="text-[14px] font-semibold" style={{ color: "var(--prv-text-1)" }}>
                  Allow Critical Alerts
                </p>
                <p className="text-[12px] mt-0.5" style={{ color: "var(--prv-text-3)" }}>
                  Even during quiet hours
                </p>
              </div>
              <Toggle on={allowCritical} onToggle={() => setAllowCritical((v) => !v)} />
            </PrefRow>
          </PrefCard>
        </div>
      )}
    </div>
  )
}

// ─── Local layout primitives ──────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] font-semibold uppercase tracking-widest mb-2.5 mt-5 first:mt-0"
      style={{ color: "var(--prv-text-3)", letterSpacing: "0.07em" }}
    >
      {children}
    </p>
  )
}

function PrefCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-[18px] overflow-hidden relative"
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.09)",
      }}
    >
      {children}
    </div>
  )
}

function PrefRow({ children, last = false }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3.5"
      style={{
        borderBottom: last ? "none" : "1px solid var(--prv-border-subtle)",
      }}
    >
      {children}
    </div>
  )
}
