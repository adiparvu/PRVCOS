"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { CriticalAlertDto } from "@/app/api/notifications/critical/route"

const red = "rgba(255,69,58,1)"
const redBg = "rgba(255,69,58,0.14)"
const redBr = "rgba(255,69,58,0.42)"

// Persistent critical-alert banner (Phase 14.5). Polls the caller's pending
// critical alerts and shows them until each is explicitly acknowledged. Does not
// auto-dismiss. Rendered globally from the authenticated layout.
export function CriticalAlertBanner() {
  const router = useRouter()
  const [alerts, setAlerts] = useState<CriticalAlertDto[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(() => {
    return fetch("/api/notifications/critical")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d: { alerts: CriticalAlertDto[] }) => setAlerts(d.alerts))
      .catch(() => {
        /* transient — keep whatever is shown */
      })
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30_000)
    const onFocus = () => load()
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(t)
      window.removeEventListener("focus", onFocus)
    }
  }, [load])

  const acknowledge = useCallback(
    (id: string) => {
      setBusyId(id)
      // Optimistically remove so the banner clears immediately.
      setAlerts((prev) => prev.filter((a) => a.id !== id))
      fetch(`/api/notifications/${id}/acknowledge`, { method: "POST" })
        .catch(() => load()) // restore on failure
        .finally(() => setBusyId(null))
    },
    [load]
  )

  if (alerts.length === 0) return null

  return (
    <div
      style={{
        position: "fixed",
        top: 92,
        left: "max(12px, var(--prv-sidebar-w, 0px))",
        right: 12,
        zIndex: 45,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        pointerEvents: "none",
      }}
      role="alert"
      aria-live="assertive"
    >
      {alerts.map((a) => (
        <div
          key={a.id}
          style={{
            pointerEvents: "auto",
            width: "100%",
            maxWidth: 680,
            background: redBg,
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: `1px solid ${redBr}`,
            borderRadius: 16,
            padding: "14px 16px",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.14), 0 8px 28px rgba(255,69,58,0.16), 0 12px 40px rgba(0,0,0,0.5)",
            display: "flex",
            gap: 14,
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,69,58,0.18)",
              border: `1px solid ${redBr}`,
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={red}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: red,
              }}
            >
              Alertă critică
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, margin: "3px 0 2px", color: "#fff" }}>
              {a.title}
            </div>
            {a.body && (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.45 }}>
                {a.body}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={busyId === a.id}
                onClick={() => acknowledge(a.id)}
                style={{
                  background: "#fff",
                  color: "#000",
                  border: "none",
                  borderRadius: 100,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Am înțeles
              </button>
              {a.actionUrl && (
                <button
                  type="button"
                  onClick={() => router.push(a.actionUrl!)}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.95)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    borderRadius: 100,
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: 640,
                    cursor: "pointer",
                  }}
                >
                  Deschide →
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
