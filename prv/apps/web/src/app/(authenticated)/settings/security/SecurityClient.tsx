"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import type { SecuritySession, SecurityActivity } from "@/app/api/me/security/route"

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconChevronLeft() {
  return (
    <svg
      width="9"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.40)"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}
function IconShieldOn() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(80,255,140,0.90)"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}
function IconShieldOff() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,159,10,0.90)"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}
function IconPhone() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.60)"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M12 18h.01" />
    </svg>
  )
}
function IconLaptop() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.60)"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}
function IconTablet() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.60)"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M12 18h.01" />
    </svg>
  )
}
function IconGlobe() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.60)"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(ts: number | string | null): string {
  if (!ts) return "—"
  const ms = typeof ts === "number" ? ts * 1000 : new Date(ts).getTime()
  const diff = Date.now() - ms
  if (diff < 60_000) return "Activ acum"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}min ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function DeviceIcon({ platform }: { platform: string | null }) {
  if (platform === "ios" || platform === "android") return <IconPhone />
  if (platform === "web") return <IconLaptop />
  return <IconTablet />
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    "auth.login": "Authentication successful",
    "auth.logout": "Deconectare",
    "auth.mfa": "2FA verificat",
    "auth.refresh": "Token refreshed",
    "auth.failed": "Authentication failed",
  }
  return map[action] ?? action
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      <div
        style={{
          height: 28,
          width: 120,
          background: "rgba(255,255,255,0.08)",
          borderRadius: 8,
          marginBottom: 24,
        }}
        className="animate-pulse"
      />
      <div
        style={{
          height: 72,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 16,
          marginBottom: 20,
        }}
        className="animate-pulse"
      />
      {[1, 2].map((i) => (
        <div
          key={i}
          style={{
            height: 140,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 16,
            marginBottom: 12,
          }}
          className="animate-pulse"
        />
      ))}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SecurityClient() {
  const [mfa, setMfa] = useState<{ enabled: boolean; backupCodesRemaining: number } | null>(null)
  const [sessions, setSessions] = useState<SecuritySession[]>([])
  const [activity, setActivity] = useState<SecurityActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [revokeAllBusy, setRevokeAllBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/me/security")
      if (res.ok) {
        const data = await res.json()
        setMfa(data.mfa)
        setSessions(data.sessions ?? [])
        setActivity(data.recentActivity ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const revokeSession = async (sessionId: string) => {
    setRevoking(sessionId)
    try {
      const res = await fetch(`/api/me/security?sessionId=${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
      })
      if (res.ok) setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId))
    } finally {
      setRevoking(null)
    }
  }

  const revokeAll = async () => {
    setRevokeAllBusy(true)
    try {
      const toRevoke = sessions.filter((s) => !s.isCurrent)
      await Promise.all(
        toRevoke.map((s) =>
          fetch(`/api/me/security?sessionId=${encodeURIComponent(s.sessionId)}`, {
            method: "DELETE",
          })
        )
      )
      setSessions((prev) => prev.filter((s) => s.isCurrent))
    } finally {
      setRevokeAllBusy(false)
    }
  }

  if (loading) return <Skeleton />

  const otherSessions = sessions.filter((s) => !s.isCurrent)

  return (
    <div
      className="px-4 pt-14 pb-28 max-w-2xl mx-auto"
      style={{
        fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <Link
          href="/settings"
          style={{ display: "flex", alignItems: "center", textDecoration: "none" }}
        >
          <IconChevronLeft />
        </Link>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "-0.5px",
            color: "rgba(255,255,255,0.95)",
          }}
        >
          Securitate
        </h1>
      </div>

      {/* 2FA status banner */}
      <div
        style={{
          background: mfa?.enabled ? "rgba(80,255,140,0.07)" : "rgba(255,159,10,0.07)",
          border: `1px solid ${mfa?.enabled ? "rgba(80,255,140,0.18)" : "rgba(255,159,10,0.18)"}`,
          borderRadius: 16,
          padding: "14px 16px",
          marginBottom: 20,
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
            background: `linear-gradient(90deg,transparent,${mfa?.enabled ? "rgba(80,255,140,0.30)" : "rgba(255,159,10,0.25)"},transparent)`,
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          {mfa?.enabled ? <IconShieldOn /> : <IconShieldOff />}
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: mfa?.enabled ? "rgba(80,255,140,0.95)" : "rgba(255,159,10,0.95)",
            }}
          >
            {mfa?.enabled ? "2FA activat" : "2FA dezactivat"}
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 100,
              background: mfa?.enabled ? "rgba(80,255,140,0.18)" : "rgba(255,159,10,0.18)",
              color: mfa?.enabled ? "rgba(80,255,140,0.90)" : "rgba(255,159,10,0.90)",
              border: `1px solid ${mfa?.enabled ? "rgba(80,255,140,0.28)" : "rgba(255,159,10,0.28)"}`,
            }}
          >
            {mfa?.enabled ? "Active" : "Inactive"}
          </span>
        </div>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)" }}>
          {mfa?.enabled
            ? `Coduri de backup remaininge: ${mfa.backupCodesRemaining}`
            : "Enable 2FA for enhanced account security."}
        </p>
      </div>

      {/* 2FA Methods (static — setup flow out of scope) */}
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.30)",
          marginBottom: 8,
        }}
      >
        Metode 2FA
      </p>
      <div
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 16,
          overflow: "hidden",
          marginBottom: 24,
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
        {[
          {
            icon: <IconPhone />,
            label: "Authenticator app",
            sub: "Google Authenticator / Authy",
            badge: mfa?.enabled
              ? {
                  text: "Active",
                  color: "rgba(80,255,140,0.90)",
                  bg: "rgba(80,255,140,0.15)",
                  border: "rgba(80,255,140,0.28)",
                }
              : null,
          },
          {
            icon: <IconPhone />,
            label: "SMS",
            sub: "+40 7xx *** xxx",
            badge: {
              text: "Backup",
              color: "rgba(255,200,50,0.90)",
              bg: "rgba(255,200,50,0.12)",
              border: "rgba(255,200,50,0.28)",
            },
          },
          {
            icon: <IconGlobe />,
            label: "Coduri de backup",
            sub: mfa ? `${mfa.backupCodesRemaining} coduri remaininge` : "—",
            badge: null,
          },
        ].map(({ icon, label, sub, badge }, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "13px 14px",
              borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: "rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>
                {label}
              </p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", marginTop: 1 }}>{sub}</p>
            </div>
            {badge && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 100,
                  background: badge.bg,
                  color: badge.color,
                  border: `1px solid ${badge.border}`,
                }}
              >
                {badge.text}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Active Sessions */}
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.30)",
          marginBottom: 8,
        }}
      >
        Sesiuni active — {sessions.length} {sessions.length === 1 ? "dispozitiv" : "dispozitive"}
      </p>

      {sessions.length === 0 ? (
        <div
          style={{
            padding: "32px 16px",
            textAlign: "center",
            color: "rgba(255,255,255,0.25)",
            fontSize: 13,
          }}
        >
          No active session detected
        </div>
      ) : (
        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 16,
            overflow: "hidden",
            marginBottom: 16,
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
          {sessions.map((s, i) => (
            <div
              key={s.sessionId}
              style={{
                display: "flex",
                alignItems: "flex-start",
                padding: "13px 14px",
                borderBottom: i < sessions.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <DeviceIcon platform={s.platform} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>
                  {s.deviceName ??
                    (s.platform === "ios"
                      ? "iPhone"
                      : s.platform === "android"
                        ? "Android"
                        : s.platform === "web"
                          ? "Browser web"
                          : "Dispozitiv")}
                </p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", marginTop: 1 }}>
                  {relativeTime(s.lastActiveAt)}
                  {s.sessionId && (
                    <>
                      {" "}
                      ·{" "}
                      <span style={{ fontVariantNumeric: "tabular-nums", opacity: 0.6 }}>
                        {s.sessionId.slice(0, 8)}…
                      </span>
                    </>
                  )}
                </p>
              </div>
              {s.isCurrent ? (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 7px",
                    borderRadius: 100,
                    background: "rgba(80,255,140,0.10)",
                    color: "rgba(80,255,140,0.80)",
                    border: "1px solid rgba(80,255,140,0.20)",
                  }}
                >
                  Curent
                </span>
              ) : (
                <button
                  onClick={() => revokeSession(s.sessionId)}
                  disabled={revoking === s.sessionId}
                  style={{
                    fontSize: 11,
                    color:
                      revoking === s.sessionId ? "rgba(255,80,80,0.35)" : "rgba(255,80,80,0.70)",
                    fontWeight: 500,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {revoking === s.sessionId ? "…" : "Revoke"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {otherSessions.length > 1 && (
        <button
          onClick={revokeAll}
          disabled={revokeAllBusy}
          style={{
            width: "100%",
            padding: "13px",
            marginBottom: 24,
            background: "rgba(255,60,60,0.08)",
            border: "1px solid rgba(255,60,60,0.18)",
            borderRadius: 14,
            color: "rgba(255,80,80,0.80)",
            fontSize: 14,
            fontWeight: 600,
            cursor: revokeAllBusy ? "default" : "pointer",
            opacity: revokeAllBusy ? 0.5 : 1,
          }}
        >
          {revokeAllBusy
            ? "Processing..."
            : `Revoke toate celelalte sesiuni (${otherSessions.length})`}
        </button>
      )}

      {/* Recent auth activity */}
      {activity.length > 0 && (
        <>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.30)",
              marginBottom: 8,
            }}
          >
            Recent activity
          </p>
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 16,
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
            {activity.map((log, i) => (
              <div
                key={log.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "11px 14px",
                  borderBottom:
                    i < activity.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: log.action.includes("failed")
                      ? "rgba(255,69,58,0.70)"
                      : "rgba(80,255,140,0.70)",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.80)" }}>
                    {actionLabel(log.action)}
                  </p>
                  {log.ipAddress && (
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>
                      {log.ipAddress}
                    </p>
                  )}
                </div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
                  {relativeTime(log.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
