"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

// ── Icons ─────────────────────────────────────────────────────────────────────

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

interface Role {
  id: string
  name: string
  slug: string
  type: "system" | "custom"
  defaultScopeLevel: string
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      <div
        style={{
          width: 80,
          height: 28,
          background: "var(--prv-g2)",
          borderRadius: 8,
          marginBottom: 20,
        }}
        className="animate-pulse"
      />
      <div
        style={{ height: 110, background: "var(--prv-g1)", borderRadius: 20, marginBottom: 8 }}
        className="animate-pulse"
      />
      {[0, 1].map((i) => (
        <div
          key={i}
          style={{
            height: 130,
            background: "var(--prv-g1)",
            borderRadius: 16,
            marginTop: 28,
            marginBottom: 0,
          }}
          className="animate-pulse"
        />
      ))}
    </div>
  )
}

// ── Nav row ───────────────────────────────────────────────────────────────────

function NavRow({
  icon,
  label,
  sub,
  href,
  badge,
  badgeVariant = "neutral",
}: {
  icon: React.ReactNode
  label: string
  sub?: string
  href: string
  badge?: string
  badgeVariant?: "neutral" | "amber" | "red" | "green"
}) {
  const badgeStyle: Record<string, { bg: string; color: string; border: string }> = {
    neutral: {
      bg: "rgba(255,255,255,0.08)",
      color: "rgba(255,255,255,0.55)",
      border: "rgba(255,255,255,0.14)",
    },
    amber: {
      bg: "rgba(255,200,50,0.12)",
      color: "rgba(255,200,50,0.90)",
      border: "rgba(255,200,50,0.22)",
    },
    red: {
      bg: "rgba(255,60,60,0.10)",
      color: "rgba(255,80,80,0.85)",
      border: "rgba(255,80,80,0.20)",
    },
    green: {
      bg: "rgba(80,255,140,0.10)",
      color: "rgba(80,255,140,0.85)",
      border: "rgba(80,255,140,0.22)",
    },
  }
  const bs = badgeStyle[badgeVariant]

  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "12px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        gap: 12,
        textDecoration: "none",
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
        <p style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>{label}</p>
        {sub && (
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", marginTop: 1 }}>{sub}</p>
        )}
      </div>
      {badge && bs && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 100,
            background: bs.bg,
            color: bs.color,
            border: `1px solid ${bs.border}`,
            marginRight: 6,
          }}
        >
          {badge}
        </span>
      )}
      <IconChevronRight />
    </Link>
  )
}

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
          margin: "20px 0 8px",
        }}
      >
        {label}
      </p>
      <div
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
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
        <style>{`a:last-child > * { border-bottom: none !important; }`}</style>
      </div>
    </>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminClient() {
  const [roleCount, setRoleCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/roles")
      if (res.ok) {
        const data = await res.json()
        setRoleCount((data.roles as Role[]).length)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <Skeleton />

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.30)",
          marginBottom: 4,
        }}
      >
        PRV Group
      </p>
      <h1
        style={{
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: "-0.5px",
          color: "rgba(255,255,255,0.95)",
          marginBottom: 16,
        }}
      >
        Admin
      </h1>

      {/* Company card */}
      <div
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 20,
          padding: 16,
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
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="22"
              height="22"
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
          </div>
          <div>
            <p style={{ fontSize: 17, fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>
              PRV Group
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)" }}>prv.ro · ID: prv-001</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          {[
            { label: "Companii", value: "4" },
            { label: "Membri", value: "12" },
            { label: "Roluri", value: String(roleCount ?? "—") },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                background: "rgba(255,255,255,0.04)",
                borderRadius: 10,
                padding: "8px 10px",
              }}
            >
              <p
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.90)",
                  letterSpacing: "-0.3px",
                }}
              >
                {value}
              </p>
              <p
                style={{
                  fontSize: 9,
                  color: "rgba(255,255,255,0.30)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginTop: 2,
                }}
              >
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Management */}
      <Section label="Gestionare">
        <NavRow
          icon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.60)"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          }
          label="Membri echipă"
          sub="Invită, editează și dezactivează"
          href="/people"
          badge="12 activi"
        />
        <NavRow
          icon={
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
          }
          label="Roluri &amp; Permisiuni"
          sub="Configurează acces pe module"
          href="/admin/roles"
          badge={roleCount !== null ? `${roleCount} roluri` : undefined}
        />
      </Section>

      {/* Security */}
      <Section label="Securitate &amp; Audit">
        <NavRow
          icon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.60)"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
              <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
            </svg>
          }
          label="Jurnal de audit"
          sub="Activitate completă SHA-256"
          href="/admin/audit-logs"
        />
        <NavRow
          icon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.60)"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          }
          label="Chei API"
          sub="Gestionează tokenuri de integrare"
          href="/admin/api-keys"
          badge="3 active"
          badgeVariant="green"
        />
      </Section>

      <div style={{ height: 20 }} />
    </div>
  )
}
