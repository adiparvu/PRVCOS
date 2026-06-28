"use client"

import { useQuery } from "@tanstack/react-query"
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface Role {
  id: string
  name: string
  slug: string
  type: "system" | "custom"
  defaultScopeLevel: string
  description: string | null
}

// Scope label mapping
const SCOPE_LABELS: Record<string, string> = {
  SCOPE_RECORD: "Record",
  SCOPE_TEAM: "Team",
  SCOPE_DEPARTMENT: "Departament",
  SCOPE_STORE: "Magazin",
  SCOPE_REGION: "Regiune",
  SCOPE_COMPANY: "Companie",
}

// Icon by slug
function RoleIcon({ slug }: { slug: string }) {
  if (slug.includes("admin") || slug.includes("group_ceo") || slug.includes("ceo"))
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(255,200,50,0.85)"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    )
  if (slug.includes("director") || slug.includes("manager"))
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
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    )
  if (slug.includes("worker") || slug.includes("seller") || slug.includes("cashier"))
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
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
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
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      <div
        style={{
          width: 160,
          height: 28,
          background: "var(--prv-g2)",
          borderRadius: 8,
          marginBottom: 20,
        }}
        className="animate-pulse"
      />
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{ height: 80, background: "var(--prv-g1)", borderRadius: 16, marginBottom: 8 }}
          className="animate-pulse"
        />
      ))}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RolesClient() {
  const { data, isLoading: loading } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: () =>
      fetch("/api/roles").then((r) => {
        if (!r.ok) throw new Error("Failed to load roles")
        return r.json() as Promise<{ roles: Role[] }>
      }),
  })
  const roles = data?.roles ?? []

  if (loading) return <Skeleton />

  const systemRoles = roles.filter((r) => r.type === "system")
  const customRoles = roles.filter((r) => r.type === "custom")

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <Link
          href="/admin"
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
          Roluri &amp; Permisiuni
        </h1>
      </div>

      {/* System roles */}
      {systemRoles.length > 0 && (
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
            Roluri sistem — {systemRoles.length}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {systemRoles.map((role) => (
              <div
                key={role.id}
                style={{
                  background: "var(--prv-g1)",
                  border: "1px solid var(--prv-border-subtle)",
                  borderRadius: 16,
                  padding: "14px 16px",
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
                    background:
                      "linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <RoleIcon slug={role.slug} />
                    <span
                      style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.92)" }}
                    >
                      {role.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      padding: "2px 7px",
                      borderRadius: 100,
                      background: "rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.35)",
                      border: "1px solid rgba(255,255,255,0.10)",
                    }}
                  >
                    {SCOPE_LABELS[role.defaultScopeLevel] ?? role.defaultScopeLevel}
                  </span>
                </div>
                {role.description && (
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                    {role.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Custom roles */}
      {customRoles.length > 0 && (
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
            Roluri personalizate — {customRoles.length}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {customRoles.map((role) => (
              <div
                key={role.id}
                style={{
                  background: "var(--prv-g1)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: 16,
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.92)" }}>
                    {role.name}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      padding: "2px 7px",
                      borderRadius: 100,
                      background: "rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.35)",
                      border: "1px solid rgba(255,255,255,0.10)",
                    }}
                  >
                    {SCOPE_LABELS[role.defaultScopeLevel] ?? role.defaultScopeLevel}
                  </span>
                </div>
                {role.description && (
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                    {role.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {roles.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            color: "rgba(255,255,255,0.30)",
            fontSize: 14,
          }}
        >
          No roles configured
        </div>
      )}

      {/* Add custom role */}
      <button
        style={{
          width: "100%",
          padding: "13px",
          background: "rgba(255,255,255,0.05)",
          border: "1px dashed rgba(255,255,255,0.16)",
          borderRadius: 16,
          color: "rgba(255,255,255,0.45)",
          fontSize: 14,
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          cursor: "pointer",
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
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Rol nou personalizat
      </button>
    </div>
  )
}
