"use client"

import Link from "next/link"

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
function IconChevronRight() {
  return (
    <svg
      width="7"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.20)"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Session {
  id: string
  device: string
  deviceIcon: "phone" | "laptop" | "tablet"
  location: string
  lastSeen: string
  isCurrent: boolean
}

// Mock sessions — real data would come from /api/auth/session list endpoint
const SESSIONS: Session[] = [
  {
    id: "s1",
    device: "iPhone 16 Pro",
    deviceIcon: "phone",
    location: "București, RO",
    lastSeen: "Activ acum",
    isCurrent: true,
  },
  {
    id: "s2",
    device: "MacBook Pro",
    deviceIcon: "laptop",
    location: "București, RO",
    lastSeen: "2h în urmă",
    isCurrent: false,
  },
  {
    id: "s3",
    device: "iPad Pro",
    deviceIcon: "tablet",
    location: "Cluj, RO",
    lastSeen: "1 zi în urmă",
    isCurrent: false,
  },
]

function DeviceIcon({ type }: { type: Session["deviceIcon"] }) {
  if (type === "phone")
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
  if (type === "laptop")
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
      <rect x="2" y="6" width="20" height="12" rx="2" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SecurityClient() {
  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
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
          background: "rgba(80,255,140,0.07)",
          border: "1px solid rgba(80,255,140,0.18)",
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
            background: "linear-gradient(90deg,transparent,rgba(80,255,140,0.30),transparent)",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
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
          <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(80,255,140,0.95)" }}>
            2FA activat
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 100,
              background: "rgba(80,255,140,0.18)",
              color: "rgba(80,255,140,0.90)",
              border: "1px solid rgba(80,255,140,0.28)",
            }}
          >
            Activ
          </span>
        </div>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)" }}>
          Aplicație autentificator · Ultimul cod folosit acum 2h
        </p>
      </div>

      {/* 2FA Methods */}
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
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 16,
          overflow: "hidden",
          marginBottom: 20,
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
            icon: (
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
            ),
            label: "Aplicație autentificator",
            sub: "Google Authenticator / Authy",
            badge: {
              text: "Activ",
              color: "rgba(80,255,140,0.90)",
              bg: "rgba(80,255,140,0.15)",
              border: "rgba(80,255,140,0.28)",
            },
          },
          {
            icon: (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.60)"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
              </svg>
            ),
            label: "SMS",
            sub: "+40 723 *** 789",
            badge: {
              text: "Backup",
              color: "rgba(255,200,50,0.90)",
              bg: "rgba(255,200,50,0.12)",
              border: "rgba(255,200,50,0.28)",
            },
          },
          {
            icon: (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.60)"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M8 4v4M16 4v4M2 10h20" />
              </svg>
            ),
            label: "Coduri de backup",
            sub: "8 coduri rămase",
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
            {!badge && <IconChevronRight />}
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
        Sesiuni active — {SESSIONS.length} dispozitive
      </p>
      <div
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
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
        {SESSIONS.map((s, i) => (
          <div
            key={s.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              padding: "13px 14px",
              borderBottom: i < SESSIONS.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none",
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
              <DeviceIcon type={s.deviceIcon} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>
                {s.device}
              </p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", marginTop: 1 }}>
                {s.location} · {s.lastSeen}
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
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(255,80,80,0.70)",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Revocă
              </span>
            )}
          </div>
        ))}
      </div>

      <button
        style={{
          width: "100%",
          padding: "13px",
          background: "rgba(255,60,60,0.08)",
          border: "1px solid rgba(255,60,60,0.18)",
          borderRadius: 14,
          color: "rgba(255,80,80,0.80)",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Revocă toate celelalte sesiuni
      </button>
    </div>
  )
}
