"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconUser() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
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
function IconBuilding() {
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
      <rect x="3" y="8" width="18" height="13" rx="2" />
      <path d="M3 8l9-5 9 5" />
      <path d="M9 21V12h6v9" />
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
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
    </svg>
  )
}
function IconMail() {
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
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <path d="M22 6l-10 7L2 6" />
    </svg>
  )
}
function IconLock() {
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
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  )
}
function IconShield() {
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
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
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
function IconClock() {
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
      <path d="M12 6v6l4 2" />
    </svg>
  )
}
function IconBell() {
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
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  )
}
function IconLogOut() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,80,80,0.70)"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserProfile {
  fullName: string
  email: string
  phone: string | null
  jobTitle: string | null
  role: string
  timezone: string | null
  locale: string | null
  mfaEnabled: boolean
  companyId: string
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      <div
        style={{
          width: 100,
          height: 28,
          background: "var(--prv-g2)",
          borderRadius: 8,
          marginBottom: 20,
        }}
        className="animate-pulse"
      />
      <div
        style={{ height: 88, background: "var(--prv-g1)", borderRadius: 20, marginBottom: 8 }}
        className="animate-pulse"
      />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            height: 120,
            background: "var(--prv-g1)",
            borderRadius: 16,
            marginBottom: 8,
            marginTop: i === 0 ? 28 : 0,
          }}
          className="animate-pulse"
        />
      ))}
    </div>
  )
}

// ── Row ───────────────────────────────────────────────────────────────────────

function Row({
  icon,
  label,
  value,
  href,
  danger,
  toggle,
  onToggle,
}: {
  icon: React.ReactNode
  label: string
  value?: string
  href?: string
  danger?: boolean
  toggle?: boolean
  onToggle?: () => void
}) {
  const inner = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "12px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        gap: 12,
        cursor: href || onToggle ? "pointer" : "default",
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: danger ? "rgba(255,60,60,0.10)" : "rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <span
        style={{
          flex: 1,
          fontSize: 14,
          fontWeight: 500,
          color: danger ? "rgba(255,80,80,0.80)" : "rgba(255,255,255,0.85)",
        }}
      >
        {label}
      </span>
      {value && (
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginRight: 6 }}>
          {value}
        </span>
      )}
      {toggle !== undefined && (
        <div
          onClick={onToggle}
          style={{
            width: 36,
            height: 22,
            background: toggle ? "rgba(80,255,140,0.28)" : "rgba(255,255,255,0.10)",
            border: `1px solid ${toggle ? "rgba(80,255,140,0.45)" : "rgba(255,255,255,0.14)"}`,
            borderRadius: 100,
            position: "relative",
            flexShrink: 0,
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              background: toggle ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.40)",
              borderRadius: "50%",
              position: "absolute",
              top: 1,
              [toggle ? "right" : "left"]: 1,
            }}
          />
        </div>
      )}
      {href && <IconChevronRight />}
    </div>
  )

  if (href)
    return (
      <Link href={href} style={{ textDecoration: "none", display: "block" }}>
        {inner}
      </Link>
    )
  return inner
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.30)",
          margin: "20px 16px 8px",
        }}
      >
        {label}
      </p>
      <div
        style={{
          margin: "0 16px",
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
        {children}
        {/* Remove last border */}
        <style>{`div > div:last-child { border-bottom: none !important; }`}</style>
      </div>
    </>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SettingsClient() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notifOn, setNotifOn] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/me")
      if (res.ok) {
        const data = await res.json()
        setProfile(data.user)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <Skeleton />

  const initials = profile
    ? profile.fullName
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "??"

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      <h1
        style={{
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: "-0.5px",
          color: "rgba(255,255,255,0.95)",
          marginBottom: 16,
        }}
      >
        Setări
      </h1>

      {/* Avatar card */}
      <div
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 20,
          padding: "18px 16px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          position: "relative",
          overflow: "hidden",
          marginBottom: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)",
          }}
        />
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: "linear-gradient(135deg,rgba(255,255,255,0.18),rgba(255,255,255,0.06))",
            border: "1px solid rgba(255,255,255,0.16)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {profile ? (
            <span style={{ fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.70)" }}>
              {initials}
            </span>
          ) : (
            <IconUser />
          )}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 17, fontWeight: 600, color: "rgba(255,255,255,0.95)" }}>
            {profile?.fullName ?? "—"}
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.40)", marginTop: 2 }}>
            {profile?.jobTitle ?? profile?.role ?? "—"}
          </p>
          <span
            style={{
              marginTop: 6,
              display: "inline-block",
              fontSize: 12,
              fontWeight: 600,
              color: "rgba(255,255,255,0.70)",
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 100,
              padding: "4px 12px",
              cursor: "pointer",
            }}
          >
            Editează profilul
          </span>
        </div>
        <IconChevronRight />
      </div>

      {/* Account */}
      <Section label="Cont">
        <Row icon={<IconBuilding />} label="Companie" value="PRV Group" />
        <Row icon={<IconPhone />} label="Telefon" value={profile?.phone ?? "Neadăugat"} />
        <Row icon={<IconMail />} label="Email" value={profile?.email ?? "—"} />
      </Section>

      {/* Security */}
      <Section label="Securitate">
        <Row icon={<IconLock />} label="Parolă" href="/settings/security" />
        <Row
          icon={<IconShield />}
          label="Autentificare 2FA"
          value={profile?.mfaEnabled ? undefined : "Inactiv"}
          href="/settings/security"
        />
        <Row
          icon={<IconShield />}
          label="Sesiuni active"
          value="Gestionează"
          href="/settings/security"
        />
      </Section>

      {/* Preferences */}
      <Section label="Preferințe">
        <Row icon={<IconGlobe />} label="Limbă" value="Română" />
        <Row
          icon={<IconClock />}
          label="Fus orar"
          value={profile?.timezone ?? "Europe/Bucharest"}
        />
        <Row
          icon={<IconBell />}
          label="Notificări push"
          toggle={notifOn}
          onToggle={() => setNotifOn((v) => !v)}
        />
      </Section>

      {/* Sign out */}
      <Section label="Cont">
        <Row icon={<IconLogOut />} label="Deconectare" href="/auth/logout" danger />
      </Section>

      <div style={{ height: 20 }} />
    </div>
  )
}
