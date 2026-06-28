"use client"

import { useState, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
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
function IconChevronLeft() {
  return (
    <svg
      width="9"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}
function IconX() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
function IconCheck() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// Tiny inlined icon factory so we don't need to repeat SVG boilerplate
const ic = (path: string) =>
  function Icon() {
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
        <path d={path} />
      </svg>
    )
  }
const IconBuilding = ic("M3 8l9-5 9 5v13a2 2 0 01-2 2H5a2 2 0 01-2-2V8z M9 21V12h6v9")
const IconPhone = ic(
  "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
)
const IconMail = ic(
  "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6"
)
const IconLock = ic(
  "M21 2l-3 3m-3-3l3 3 M3 11v10a2 2 0 002 2h14a2 2 0 002-2V11 M7 11V7a5 5 0 0110 0v4"
)
const IconShield = ic("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z")
const IconGlobe = ic(
  "M12 2a10 10 0 100 20A10 10 0 0012 2z M2 12h20 M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"
)
const IconClock = ic("M12 2a10 10 0 100 20A10 10 0 0012 2z M12 6v6l4 2")
const IconBell = ic("M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0")
const IconLogOut = () => (
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone: string | null
  jobTitle: string | null
  bio: string | null
  role: string
  timezone: string | null
  locale: string | null
  mfaEnabled: boolean
  companyId: string
}

interface NotifPrefs {
  inApp: boolean
  push: boolean
  email: boolean
  sms: boolean
}

interface AppPrefs {
  theme: "light" | "dark" | "system"
  glassStyle: "translucid" | "tinted" | "adaptive"
  syncEnabled: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIMEZONES = [
  "Europe/Bucharest",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/Madrid",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "Asia/Dubai",
  "UTC",
]

const LOCALES: { value: string; label: string }[] = [
  { value: "ro-RO", label: "Romanian" },
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "fr-FR", label: "Français" },
  { value: "de-DE", label: "Deutsch" },
]

function fmtLocale(locale: string | null) {
  return LOCALES.find((l) => l.value === locale)?.label ?? locale ?? "Romanian"
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      <div
        style={{
          width: 100,
          height: 28,
          background: "rgba(255,255,255,0.08)",
          borderRadius: 8,
          marginBottom: 20,
        }}
        className="animate-pulse"
      />
      <div
        style={{
          height: 88,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 20,
          marginBottom: 8,
        }}
        className="animate-pulse"
      />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            height: 120,
            background: "rgba(255,255,255,0.06)",
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
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value?: string
  href?: string
  danger?: boolean
  toggle?: boolean
  onToggle?: () => void
  onClick?: () => void
}) {
  const inner = (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "12px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        gap: 12,
        cursor: href || onToggle || onClick ? "pointer" : "default",
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
              transition: "left 0.18s ease, right 0.18s ease",
              [toggle ? "right" : "left"]: 1,
            }}
          />
        </div>
      )}
      {(href || onClick) && !toggle && <IconChevronRight />}
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
      </div>
    </>
  )
}

// ── Edit Profile Sheet ────────────────────────────────────────────────────────

function EditProfileSheet({
  profile,
  open,
  onClose,
  onSaved,
}: {
  profile: UserProfile
  open: boolean
  onClose: () => void
  onSaved: (updated: Partial<UserProfile>) => void
}) {
  const [firstName, setFirstName] = useState(profile.firstName)
  const [lastName, setLastName] = useState(profile.lastName)
  const [phone, setPhone] = useState(profile.phone ?? "")
  const [bio, setBio] = useState(profile.bio ?? "")
  const [timezone, setTimezone] = useState(profile.timezone ?? "Europe/Bucharest")
  const [locale, setLocale] = useState(profile.locale ?? "ro-RO")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Reset the form whenever the sheet opens or the profile changes — done
  // during render (React's recommended alternative to a syncing effect).
  const [resetKey, setResetKey] = useState({ open, profile })
  if (resetKey.open !== open || resetKey.profile !== profile) {
    setResetKey({ open, profile })
    if (open) {
      setFirstName(profile.firstName)
      setLastName(profile.lastName)
      setPhone(profile.phone ?? "")
      setBio(profile.bio ?? "")
      setTimezone(profile.timezone ?? "Europe/Bucharest")
      setLocale(profile.locale ?? "ro-RO")
      setError(null)
      setSaved(false)
    }
  }

  const save = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || undefined,
          bio: bio.trim() || undefined,
          timezone,
          locale,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Eroare la salvare.")
        return
      }
      setSaved(true)
      onSaved({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        timezone,
        locale,
      })
      setTimeout(onClose, 900)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    padding: "11px 13px",
    fontSize: 14,
    color: "rgba(255,255,255,0.90)",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, sans-serif",
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "rgba(255,255,255,0.30)",
    marginBottom: 6,
    display: "block",
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 40,
          background: "rgba(0,0,0,0.60)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.28s ease",
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          maxWidth: 640,
          margin: "0 auto",
          background: "rgba(18,18,18,0.97)",
          backdropFilter: "blur(48px)",
          WebkitBackdropFilter: "blur(48px)",
          border: "1px solid rgba(255,255,255,0.13)",
          borderRadius: "24px 24px 0 0",
          boxShadow: "0 -24px 64px rgba(0,0,0,0.8)",
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.42s cubic-bezier(0.34,1.56,0.64,1)",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 100,
            background: "rgba(255,255,255,0.18)",
            margin: "16px auto 0",
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px 0",
          }}
        >
          <p style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>
            Edit profile
          </p>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 100,
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.14)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.60)",
              cursor: "pointer",
            }}
          >
            <IconX />
          </button>
        </div>

        {/* Form */}
        <div
          style={{ padding: "20px 20px 36px", display: "flex", flexDirection: "column", gap: 14 }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Prenume</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={inputStyle}
                placeholder="Ion"
              />
            </div>
            <div>
              <label style={labelStyle}>Nume</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={inputStyle}
                placeholder="Popescu"
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Telefon</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={inputStyle}
              placeholder="+40 7xx xxx xxx"
              type="tel"
            />
          </div>

          <div>
            <label style={labelStyle}>Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              style={{ ...inputStyle, resize: "none", height: 80, lineHeight: 1.5 }}
              placeholder="Short description..."
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Fus orar</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz} style={{ background: "#111" }}>
                    {tz.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Language</label>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                {LOCALES.map((l) => (
                  <option key={l.value} value={l.value} style={{ background: "#111" }}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(255,60,60,0.12)",
                border: "1px solid rgba(255,60,60,0.25)",
                fontSize: 13,
                color: "rgba(255,100,100,0.90)",
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={save}
            disabled={saving || saved}
            style={{
              marginTop: 4,
              padding: "13px",
              borderRadius: 13,
              background: saved ? "rgba(48,209,88,0.14)" : "rgba(255,255,255,0.92)",
              border: saved ? "1px solid rgba(48,209,88,0.35)" : "none",
              color: saved ? "rgba(48,209,88,0.95)" : "#000",
              fontSize: 15,
              fontWeight: 700,
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "background 0.25s ease, color 0.25s ease",
            }}
          >
            {saved ? (
              <>
                <IconCheck /> Salvat
              </>
            ) : saving ? (
              "Saving..."
            ) : (
              "Save changes"
            )}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Appearance Section ────────────────────────────────────────────────────────

function PillGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            padding: "5px 13px",
            borderRadius: 100,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            border: "none",
            background: value === o.value ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.08)",
            color: value === o.value ? "#000" : "rgba(255,255,255,0.45)",
            transition: "background 0.18s ease, color 0.18s ease",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function AppearanceRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "12px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
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
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>
        {label}
      </span>
      {children}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SettingsClient() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    inApp: true,
    push: true,
    email: true,
    sms: false,
  })
  const [appPrefs, setAppPrefs] = useState<AppPrefs>({
    theme: "system",
    glassStyle: "adaptive",
    syncEnabled: true,
  })
  const [editOpen, setEditOpen] = useState(false)
  const [seeded, setSeeded] = useState(false)
  const savingPrefsRef = useRef(false)

  // Load profile + preference bundles once; the editable copies below stay
  // local so the toggles remain optimistic.
  const { data: settingsBundle, isLoading: loading } = useQuery({
    queryKey: ["settings-bundle"],
    queryFn: async () => {
      const [meRes, notifRes, appRes] = await Promise.all([
        fetch("/api/me"),
        fetch("/api/me/notifications"),
        fetch("/api/preferences"),
      ])
      return {
        profile: meRes.ok ? ((await meRes.json()).user as UserProfile) : null,
        notif: notifRes.ok ? ((await notifRes.json()) as NotifPrefs) : null,
        app: appRes.ok ? ((await appRes.json()) as AppPrefs) : null,
      }
    },
  })

  if (settingsBundle && !seeded) {
    setSeeded(true)
    if (settingsBundle.profile) setProfile(settingsBundle.profile)
    if (settingsBundle.notif) setNotifPrefs(settingsBundle.notif)
    if (settingsBundle.app) setAppPrefs(settingsBundle.app)
  }

  const updateNotif = async (patch: Partial<NotifPrefs>) => {
    const next = { ...notifPrefs, ...patch }
    setNotifPrefs(next)
    await fetch("/api/me/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
  }

  const updateAppPrefs = async (patch: Partial<AppPrefs>) => {
    if (savingPrefsRef.current) return
    savingPrefsRef.current = true
    const next = { ...appPrefs, ...patch }
    setAppPrefs(next)
    await fetch("/api/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).finally(() => {
      savingPrefsRef.current = false
    })
  }

  const handleProfileSaved = (updated: Partial<UserProfile>) => {
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            ...updated,
            fullName: `${updated.firstName ?? prev.firstName} ${updated.lastName ?? prev.lastName}`,
          }
        : prev
    )
  }

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
    <div
      className="px-4 pt-14 pb-28 max-w-2xl mx-auto"
      style={{
        fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <h1
        style={{
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: "-0.5px",
          color: "rgba(255,255,255,0.95)",
          marginBottom: 16,
        }}
      >
        Settings
      </h1>

      {/* Avatar card */}
      <div
        onClick={() => setEditOpen(true)}
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 20,
          padding: "18px 16px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          position: "relative",
          overflow: "hidden",
          cursor: "pointer",
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
            }}
          >
            Edit profile
          </span>
        </div>
        <IconChevronRight />
      </div>

      {/* Account */}
      <Section label="Cont">
        <Row icon={<IconBuilding />} label="Companie" value="PRV Group" />
        <Row
          icon={<IconPhone />}
          label="Telefon"
          value={profile?.phone ?? "Not added"}
          onClick={() => setEditOpen(true)}
        />
        <Row icon={<IconMail />} label="Email" value={profile?.email ?? "—"} />
      </Section>

      {/* Security */}
      <Section label="Securitate">
        <Row icon={<IconLock />} label="Password" href="/settings/security" />
        <Row
          icon={<IconShield />}
          label="Autentificare 2FA"
          value={profile?.mfaEnabled ? "Activat" : "Inactive"}
          href="/settings/security"
        />
        <Row
          icon={<IconShield />}
          label="Sesiuni active"
          value="Manage"
          href="/settings/security"
        />
      </Section>

      {/* Appearance */}
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
        Aspect
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
        <AppearanceRow icon={<IconGlobe />} label="Theme">
          <PillGroup<"light" | "dark" | "system">
            options={[
              { value: "light", label: "Luminos" },
              { value: "dark", label: "Dark" },
              { value: "system", label: "Auto" },
            ]}
            value={appPrefs.theme}
            onChange={(v) => updateAppPrefs({ theme: v })}
          />
        </AppearanceRow>
        <AppearanceRow icon={<IconShield />} label="Glass style">
          <PillGroup<"translucid" | "tinted" | "adaptive">
            options={[
              { value: "translucid", label: "Clar" },
              { value: "tinted", label: "Colorat" },
              { value: "adaptive", label: "Adaptiv" },
            ]}
            value={appPrefs.glassStyle}
            onChange={(v) => updateAppPrefs({ glassStyle: v })}
          />
        </AppearanceRow>
        <AppearanceRow icon={<IconClock />} label="Sincronizare">
          <div
            onClick={() => updateAppPrefs({ syncEnabled: !appPrefs.syncEnabled })}
            style={{
              width: 36,
              height: 22,
              background: appPrefs.syncEnabled ? "rgba(80,255,140,0.28)" : "rgba(255,255,255,0.10)",
              border: `1px solid ${appPrefs.syncEnabled ? "rgba(80,255,140,0.45)" : "rgba(255,255,255,0.14)"}`,
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
                background: appPrefs.syncEnabled
                  ? "rgba(255,255,255,0.92)"
                  : "rgba(255,255,255,0.40)",
                borderRadius: "50%",
                position: "absolute",
                top: 1,
                [appPrefs.syncEnabled ? "right" : "left"]: 1,
                transition: "left 0.18s ease, right 0.18s ease",
              }}
            />
          </div>
        </AppearanceRow>
      </div>

      {/* Notifications */}
      <Section label="Notifications">
        <Row
          icon={<IconBell />}
          label="In-App Notifications"
          toggle={notifPrefs.inApp}
          onToggle={() => updateNotif({ inApp: !notifPrefs.inApp })}
        />
        <Row
          icon={<IconBell />}
          label="Push Notifications"
          toggle={notifPrefs.push}
          onToggle={() => updateNotif({ push: !notifPrefs.push })}
        />
        <Row
          icon={<IconMail />}
          label="Email Notifications"
          toggle={notifPrefs.email}
          onToggle={() => updateNotif({ email: !notifPrefs.email })}
        />
        <Row
          icon={<IconPhone />}
          label="SMS Notifications"
          toggle={notifPrefs.sms}
          onToggle={() => updateNotif({ sms: !notifPrefs.sms })}
        />
      </Section>

      {/* Preferences */}
      <Section label="Preferences">
        <Row
          icon={<IconGlobe />}
          label="Language"
          value={fmtLocale(profile?.locale ?? null)}
          onClick={() => setEditOpen(true)}
        />
        <Row
          icon={<IconClock />}
          label="Fus orar"
          value={(profile?.timezone ?? "Europe/Bucharest").replace("_", " ")}
          onClick={() => setEditOpen(true)}
        />
      </Section>

      {/* Sign out */}
      <Section label="Sesiune">
        <Row icon={<IconLogOut />} label="Deconectare" href="/auth/logout" danger />
      </Section>

      <div style={{ height: 20 }} />

      {/* Edit sheet */}
      {profile && (
        <EditProfileSheet
          profile={profile}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={handleProfileSaved}
        />
      )}
    </div>
  )
}
