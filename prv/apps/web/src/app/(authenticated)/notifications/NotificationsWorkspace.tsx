"use client"

import { useState } from "react"

type NotifFilter = "All" | "Alerts" | "Tasks" | "System"
type NotifSeverity = "Critical" | "Pending" | "Done" | "Attendance" | "Info"
type NotifSection = "Today" | "Yesterday"
type PrefsTab = "Feed" | "Preferences"

interface Notification {
  id: string
  section: NotifSection
  icon: React.ReactNode
  iconBg: string
  title: string
  body: string
  time: string
  module: string
  severity?: NotifSeverity
  unread: boolean
  category: "Alerts" | "Tasks" | "System"
  actions?: { label: string; primary: boolean }[]
}

interface ModuleToggle {
  label: string
  enabled: boolean
}

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

function SeverityPill({ severity }: { severity: NotifSeverity }) {
  const styles: Record<NotifSeverity, React.CSSProperties> = {
    Critical: { background: "rgba(255,69,58,0.14)", color: red },
    Pending: { background: "rgba(255,159,10,0.13)", color: amber },
    Done: { background: "rgba(48,209,88,0.13)", color: green },
    Attendance: { background: "rgba(255,159,10,0.13)", color: amber },
    Info: { background: "rgba(10,132,255,0.12)", color: blue },
  }
  return <span style={{ ...styles[severity], fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>{severity}</span>
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} style={{ width: 44, height: 26, borderRadius: 13, position: "relative", cursor: "pointer", background: on ? "rgba(48,209,88,0.70)" : "var(--prv-text-3)", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }} />
    </div>
  )
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "n1", section: "Today", unread: true, category: "Alerts", severity: "Critical",
    iconBg: "rgba(255,69,58,0.12)",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,69,58,0.9)" strokeWidth="1.8" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
    title: "Inventory critical — Ceramic Tiles",
    body: "Stock below minimum threshold at Warehouse Cluj. Only 12 m² remaining — reorder point is 50 m².",
    time: "2 min ago", module: "Operations",
    actions: [{ label: "Create PO", primary: true }, { label: "Dismiss", primary: false }],
  },
  {
    id: "n2", section: "Today", unread: true, category: "Tasks", severity: "Pending",
    iconBg: "rgba(255,159,10,0.10)",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,159,10,0.9)" strokeWidth="1.8" strokeLinecap="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
    title: "Approval needed — PO-2026-0194",
    body: "Purchase order €12,400 for Ceramic Tiles from Suppliers SRL is awaiting your approval.",
    time: "18 min ago", module: "Procurement",
    actions: [{ label: "Review", primary: true }, { label: "Later", primary: false }],
  },
  {
    id: "n3", section: "Today", unread: true, category: "System", severity: "Done",
    iconBg: "rgba(48,209,88,0.10)",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(48,209,88,0.85)" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>,
    title: "Payroll run completed",
    body: "June W1 payroll of €27,900 paid to 142 employees. Bank transfer confirmed.",
    time: "1h ago", module: "Payroll",
  },
  {
    id: "n4", section: "Today", unread: true, category: "Alerts", severity: "Attendance",
    iconBg: "rgba(255,69,58,0.10)",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,69,58,0.85)" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
    title: "6 employees absent today",
    body: "No clock-in recorded for Liviu Toma and 5 others at Cluj sites. No leave request on file.",
    time: "2h ago", module: "People",
    actions: [{ label: "View", primary: true }, { label: "Dismiss", primary: false }],
  },
  {
    id: "n5", section: "Today", unread: false, category: "System", severity: "Info",
    iconBg: "rgba(10,132,255,0.10)",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(10,132,255,0.85)" strokeWidth="1.8" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
    title: "Milestone reached — Renovation Cluj #12",
    body: "Phase 3 (Tiling) completed on time. Project is 68% done.",
    time: "4h ago", module: "Projects",
  },
  {
    id: "n6", section: "Yesterday", unread: false, category: "Alerts", severity: "Info",
    iconBg: "rgba(255,159,10,0.10)",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,159,10,0.85)" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    title: "Vehicle service due — CJ-12-PRV",
    body: "Mercedes Sprinter service scheduled for Jun 7 at AutoPro Cluj.",
    time: "Yesterday 15:30", module: "Fleet",
  },
  {
    id: "n7", section: "Yesterday", unread: false, category: "System", severity: "Done",
    iconBg: "rgba(48,209,88,0.10)",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(48,209,88,0.85)" strokeWidth="1.8" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>,
    title: "Contract signed — Renovation Cluj #14",
    body: "Client signed the contract. Project can now proceed to execution phase.",
    time: "Yesterday 14:32", module: "CRM",
  },
  {
    id: "n8", section: "Yesterday", unread: false, category: "System", severity: "Info",
    iconBg: "rgba(10,132,255,0.10)",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(10,132,255,0.85)" strokeWidth="1.8" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    title: "New employee onboarded",
    body: "Cosmin Neagu (Painter) has completed onboarding. Account activated.",
    time: "Yesterday 10:00", module: "HR",
  },
]

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

const FILTERS: NotifFilter[] = ["All", "Alerts", "Tasks", "System"]

export function NotificationsWorkspace() {
  const [activeTab, setActiveTab] = useState<PrefsTab>("Feed")
  const [filter, setFilter] = useState<NotifFilter>("All")
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)
  const [push, setPush] = useState(true)
  const [email, setEmail] = useState(true)
  const [sms, setSms] = useState(false)
  const [quietHours, setQuietHours] = useState(true)
  const [allowCritical, setAllowCritical] = useState(true)
  const [modules, setModules] = useState(INITIAL_MODULES)

  const unreadCount = notifications.filter(n => n.unread).length

  function markAllRead() {
    setNotifications(ns => ns.map(n => ({ ...n, unread: false })))
  }

  function dismissNotif(id: string) {
    setNotifications(ns => ns.filter(n => n.id !== id))
  }

  function toggleModule(i: number) {
    setModules(ms => ms.map((m, idx) => idx === i ? { ...m, enabled: !m.enabled } : m))
  }

  const filtered = notifications.filter(n =>
    filter === "All" ? true : n.category === filter
  )
  const todayNotifs = filtered.filter(n => n.section === "Today")
  const yesterdayNotifs = filtered.filter(n => n.section === "Yesterday")

  return (
    <div style={{ padding: "32px 16px 120px", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif", WebkitFontSmoothing: "antialiased" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 13, color: t3, marginBottom: 2 }}>PRV OS</p>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--prv-text-1)" }}>Notifications</h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {unreadCount > 0 && (
            <div style={{ padding: "6px 10px", borderRadius: 10, background: "rgba(255,69,58,0.12)", border: "1px solid rgba(255,69,58,0.20)", fontSize: 12, fontWeight: 700, color: red }}>
              {unreadCount} unread
            </div>
          )}
          <button onClick={markAllRead} style={{ padding: "6px 12px", borderRadius: 10, background: g1, border: `1px solid ${bds}`, fontSize: 12, fontWeight: 500, color: t2, cursor: "pointer" }}>
            Mark all
          </button>
        </div>
      </div>

      {/* Tab toggle — Feed vs Preferences */}
      <div style={{ display: "flex", gap: 4, padding: 4, background: g1, border: `1px solid ${bds}`, borderRadius: 12, marginBottom: 14 }}>
        {(["Feed", "Preferences"] as PrefsTab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: "6px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, color: activeTab === tab ? "var(--prv-text-1)" : t3, background: activeTab === tab ? g2 : "transparent", border: "none", cursor: "pointer", transition: "all 0.15s" }}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Feed" ? (
        <>
          {/* Filter */}
          <div style={{ display: "flex", gap: 4, padding: 4, background: g1, border: `1px solid ${bds}`, borderRadius: 12, marginBottom: 14 }}>
            {FILTERS.map(f => {
              const count = f === "All" ? unreadCount : notifications.filter(n => n.category === f && n.unread).length
              return (
                <button key={f} onClick={() => setFilter(f)} style={{ flex: 1, padding: "6px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, color: filter === f ? "var(--prv-text-1)" : t3, background: filter === f ? g2 : "transparent", border: "none", cursor: "pointer", transition: "all 0.15s", position: "relative" }}>
                  {f}
                  {count > 0 && (
                    <span style={{ position: "absolute", top: -3, right: 6, width: 16, height: 16, borderRadius: "50%", background: red, color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{count}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Today */}
          {todayNotifs.length > 0 && (
            <div style={card}>
              <TopEdge />
              <div style={{ padding: "8px 16px 6px", fontSize: 11, fontWeight: 700, color: t3, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${bds}`, background: "var(--prv-border-subtle)" }}>Today</div>
              {todayNotifs.map((n, i) => (
                <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", borderBottom: i < todayNotifs.length - 1 ? `1px solid ${bds}` : "none", position: "relative", background: n.unread ? "var(--prv-border-subtle)" : "transparent" }}>
                  {n.unread && <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: "60%", borderRadius: "0 2px 2px 0", background: blue }} />}
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: n.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: n.unread ? "var(--prv-text-1)" : t2 }}>{n.title}</div>
                      {n.severity && <SeverityPill severity={n.severity} />}
                    </div>
                    <div style={{ fontSize: 12, color: t2, marginTop: 3, lineHeight: 1.4 }}>{n.body}</div>
                    {n.actions && (
                      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                        {n.actions.map(a => (
                          <button key={a.label} onClick={() => a.label === "Dismiss" ? dismissNotif(n.id) : undefined} style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", background: a.primary ? "rgba(10,132,255,0.20)" : g2, color: a.primary ? blue : t2 }}>
                            {a.label}
                          </button>
                        ))}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: t3, marginTop: 4 }}>{n.time} · {n.module}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Yesterday */}
          {yesterdayNotifs.length > 0 && (
            <div style={card}>
              <TopEdge />
              <div style={{ padding: "8px 16px 6px", fontSize: 11, fontWeight: 700, color: t3, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${bds}`, background: "var(--prv-border-subtle)" }}>Yesterday</div>
              {yesterdayNotifs.map((n, i) => (
                <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", borderBottom: i < yesterdayNotifs.length - 1 ? `1px solid ${bds}` : "none" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: n.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: t2 }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: t2, marginTop: 3, lineHeight: 1.4 }}>{n.body}</div>
                    <div style={{ fontSize: 11, color: t3, marginTop: 4 }}>{n.time} · {n.module}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 16px", color: t3, fontSize: 14 }}>No notifications</div>
          )}
        </>
      ) : (
        <>
          {/* Preferences */}
          <p style={{ fontSize: 11, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: "0.07em", margin: "4px 2px 10px" }}>Channels</p>
          <div style={card}>
            <TopEdge />
            {[
              { label: "Push Notifications", sub: undefined, val: push, set: setPush },
              { label: "Email Digest", sub: "Daily summary at 08:00", val: email, set: setEmail },
              { label: "SMS Alerts", sub: "Critical only", val: sms, set: setSms },
            ].map((row, i, arr) => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderBottom: i < arr.length - 1 ? `1px solid ${bds}` : "none" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--prv-text-1)" }}>{row.label}</div>
                  {row.sub && <div style={{ fontSize: 12, color: t3, marginTop: 2 }}>{row.sub}</div>}
                </div>
                <Toggle on={row.val} onToggle={() => row.set(v => !v)} />
              </div>
            ))}
          </div>

          <p style={{ fontSize: 11, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: "0.07em", margin: "18px 2px 10px" }}>By Module</p>
          <div style={card}>
            <TopEdge />
            {modules.map((m, i) => (
              <div key={m.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderBottom: i < modules.length - 1 ? `1px solid ${bds}` : "none" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--prv-text-1)" }}>{m.label}</div>
                <Toggle on={m.enabled} onToggle={() => toggleModule(i)} />
              </div>
            ))}
          </div>

          <p style={{ fontSize: 11, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: "0.07em", margin: "18px 2px 10px" }}>Quiet Hours</p>
          <div style={card}>
            <TopEdge />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderBottom: `1px solid ${bds}` }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--prv-text-1)" }}>Enable Quiet Hours</div>
                <div style={{ fontSize: 12, color: t3, marginTop: 2 }}>22:00 – 07:00</div>
              </div>
              <Toggle on={quietHours} onToggle={() => setQuietHours(v => !v)} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--prv-text-1)" }}>Allow Critical Alerts</div>
                <div style={{ fontSize: 12, color: t3, marginTop: 2 }}>Even during quiet hours</div>
              </div>
              <Toggle on={allowCritical} onToggle={() => setAllowCritical(v => !v)} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
