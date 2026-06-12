"use client"
import { useRouter } from "next/navigation"

import { useState } from "react"
import Link from "next/link"
import { useSheetStack } from "@prv/ui"
import type { VehicleSummary, FleetMeta, VehicleStatus } from "@/app/api/fleet/route"
import { useVehicles } from "@/lib/api-hooks"

type FilterType = "Toate" | "Active" | "Service" | "Idle" | "Indisponibil"

const FILTERS: FilterType[] = ["Toate", "Active", "Service", "Idle", "Indisponibil"]

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Active: { label: "Active", color: "rgba(48,209,88,.95)", bg: "rgba(48,209,88,.13)" },
  Service: { label: "Service", color: "rgba(255,159,10,.95)", bg: "rgba(255,159,10,.13)" },
  Idle: { label: "Idle", color: "rgba(255,255,255,.55)", bg: "rgba(255,255,255,.08)" },
  Unavailable: { label: "Indisponibil", color: "rgba(255,69,58,.95)", bg: "rgba(255,69,58,.12)" },
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconPlus() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconWarning() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,159,10,.9)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function VehicleStatusIcon({ status }: { status: string }) {
  const bgMap: Record<string, string> = {
    Active: "rgba(48,209,88,.10)",
    Service: "rgba(255,159,10,.10)",
    Idle: "rgba(255,255,255,.06)",
    Unavailable: "rgba(255,69,58,.10)",
  }
  const strokeMap: Record<string, string> = {
    Active: "rgba(48,209,88,.85)",
    Service: "rgba(255,159,10,.85)",
    Idle: "rgba(255,255,255,.35)",
    Unavailable: "rgba(255,69,58,.85)",
  }
  const bg = bgMap[status] ?? "rgba(255,255,255,.06)"
  const stroke = strokeMap[status] ?? "rgba(255,255,255,.35)"
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="1" y="3" width="15" height="13" rx="1" />
        <path d="M16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    </div>
  )
}

function FuelBar({ pct }: { pct: number }) {
  const color =
    pct > 60 ? "rgba(48,209,88,.6)" : pct > 30 ? "rgba(255,159,10,.7)" : "rgba(255,69,58,.7)"
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5 }}>
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(255,255,255,.3)"
        strokeWidth="2"
      >
        <path d="M3 22V7l7-5 7 5v15" />
        <path d="M17 22v-5h4l2 2v3h-6z" />
      </svg>
      <div
        style={{
          flex: 1,
          height: 4,
          background: "var(--prv-border)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: color }} />
      </div>
      <span style={{ fontSize: 10, color: "var(--prv-text-3)", width: 24, textAlign: "right" }}>
        {pct}%
      </span>
    </div>
  )
}

function Skeleton({ w, h, radius = 6 }: { w: number | string; h: number; radius?: number }) {
  return (
    <div
      style={{ width: w, height: h, borderRadius: radius, background: "rgba(255,255,255,0.07)" }}
    />
  )
}

// ── Sheet button helper ───────────────────────────────────────────────────────

type SheetColor = "blue" | "white"

function SheetBtn({
  color,
  icon,
  label,
  sub,
  onClick,
}: {
  color: SheetColor
  icon: React.ReactNode
  label: string
  sub: string
  onClick: () => void
}) {
  const styles: Record<SheetColor, React.CSSProperties> = {
    blue: { background: "rgba(10,132,255,.15)", border: "1px solid rgba(10,132,255,.25)" },
    white: { background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.09)" },
  }
  const labelColor: Record<SheetColor, string> = {
    blue: "rgba(10,132,255,.9)",
    white: "var(--prv-text-1)",
  }
  const iconBg: Record<SheetColor, string> = {
    blue: "rgba(10,132,255,.2)",
    white: "rgba(255,255,255,.08)",
  }
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        borderRadius: 14,
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
        ...styles[color],
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: iconBg[color],
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 15, fontWeight: 600, color: labelColor[color], margin: 0 }}>
          {label}
        </p>
        <p style={{ fontSize: 12, color: "var(--prv-text-3)", margin: "2px 0 0" }}>{sub}</p>
      </div>
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function VehicleListClient() {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterType>("All")
  const { openSheet } = useSheetStack()

  const statusParam: Record<FilterType, string | null> = {
    Toate: null,
    Active: "Active",
    Service: "Service",
    Idle: "Idle",
    Indisponibil: "Unavailable",
  }
  const status = statusParam[filter]
  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useVehicles(status)
  const vehicles: VehicleSummary[] | null = isLoading ? null : (data?.vehicles ?? [])
  const meta: FleetMeta | null = data?.meta ?? null
  const error = isError

  const handleFAB = () => {
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: "Fleet",
      render: (onClose) => (
        <div
          style={{ padding: "8px 16px 40px", display: "flex", flexDirection: "column", gap: 10 }}
        >
          <SheetBtn
            color="blue"
            icon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(10,132,255,.9)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="1" y="3" width="15" height="13" rx="1" />
                <path d="M16 8h4l3 3v5h-7V8z" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
                <line x1="8" y1="-2" x2="8" y2="4" />
                <line x1="5" y1="1" x2="11" y2="1" />
              </svg>
            }
            label="Vehicul Nou"
            sub="Add vehicle to fleet"
            onClick={() => {
              onClose()
              router.push("/fleet/new")
            }}
          />
          <SheetBtn
            color="white"
            icon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,.7)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            }
            label="Export Fleet"
            sub="Raport km, consum, costuri"
            onClick={onClose}
          />
        </div>
      ),
    })
  }

  const fuelColor = meta
    ? meta.avgFuel > 60
      ? "rgba(48,209,88,.95)"
      : meta.avgFuel > 30
        ? "rgba(255,159,10,.95)"
        : "rgba(255,69,58,.95)"
    : "var(--prv-text-1)"

  return (
    <div
      style={{
        padding: "32px 16px 120px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <p style={{ fontSize: 13, color: "var(--prv-text-3)", marginBottom: 2 }}>Operations</p>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--prv-text-1)",
            }}
          >
            Fleet
          </h1>
        </div>
        {meta && (
          <div
            style={{
              padding: "6px 12px",
              borderRadius: 10,
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--prv-text-2)",
            }}
          >
            {meta.total} vehicule
          </div>
        )}
      </div>

      {/* KPI strip */}
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}
      >
        {meta
          ? [
              { val: String(meta.total), label: "Total", color: undefined },
              {
                val: String(meta.active),
                label: "Active",
                color: meta.active > 0 ? "rgba(48,209,88,.95)" : "var(--prv-text-1)",
              },
              {
                val: String(meta.inService),
                label: "Service",
                color: meta.inService > 0 ? "rgba(255,159,10,.95)" : "var(--prv-text-1)",
              },
              { val: `${meta.avgFuel}%`, label: "Combustibil", color: fuelColor },
            ].map((k) => (
              <div
                key={k.label}
                style={{
                  padding: "12px 8px",
                  borderRadius: 14,
                  background: "var(--prv-g1)",
                  border: "1px solid var(--prv-border-subtle)",
                  textAlign: "center",
                }}
              >
                <div
                  style={{ fontSize: 17, fontWeight: 700, color: k.color ?? "var(--prv-text-1)" }}
                >
                  {k.val}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--prv-text-3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginTop: 3,
                  }}
                >
                  {k.label}
                </div>
              </div>
            ))
          : Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  padding: "12px 8px",
                  borderRadius: 14,
                  background: "var(--prv-g1)",
                  border: "1px solid var(--prv-border-subtle)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Skeleton w={36} h={18} />
                <Skeleton w={52} h={10} />
              </div>
            ))}
      </div>

      {/* Service alert */}
      {meta?.serviceAlert && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            borderRadius: 14,
            background: "rgba(255,159,10,.07)",
            border: "1px solid rgba(255,159,10,.18)",
            marginBottom: 14,
          }}
        >
          <IconWarning />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,159,10,.95)", margin: 0 }}>
              Service Necesar
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,159,10,.6)", margin: "2px 0 0" }}>
              {meta.inService} vehicle{meta.inService > 1 ? "s" : ""} in service · check maintenance
              overdue
            </p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: 4,
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 12,
          marginBottom: 14,
          overflowX: "auto",
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              flex: "0 0 auto",
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              color: filter === f ? "var(--prv-text-1)" : "var(--prv-text-3)",
              background: filter === f ? "var(--prv-g2)" : "transparent",
              border: "none",
              cursor: "pointer",
              transition: "all .15s",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Vehicle list */}
      {error ? (
        <p style={{ textAlign: "center", color: "var(--prv-text-3)", fontSize: 14, marginTop: 40 }}>
          Loading error. Try again.
        </p>
      ) : !vehicles ? (
        <div
          style={{
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            borderRadius: 18,
            overflow: "hidden",
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 16px",
                borderBottom: i < 3 ? "1px solid var(--prv-border-subtle)" : "none",
              }}
            >
              <Skeleton w={44} h={44} radius={12} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <Skeleton w={90} h={12} radius={4} />
                <Skeleton w="55%" h={14} />
                <Skeleton w="70%" h={12} />
                <Skeleton w="80%" h={4} radius={2} />
              </div>
            </div>
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--prv-text-3)", fontSize: 14, marginTop: 40 }}>
          No vehicles found.
        </p>
      ) : (
        <div
          style={{
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            borderRadius: 18,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "0 0 auto",
              height: 1,
              background: "linear-gradient(90deg,transparent,var(--prv-border),transparent)",
            }}
          />
          {vehicles.map((v, i) => {
            const sc = STATUS_CONFIG[v.status] ?? {
              label: v.status,
              color: "var(--prv-text-3)",
              bg: "var(--prv-border-subtle)",
            }
            const isService = v.status === "Service"
            const isUnavailable = v.status === "Unavailable"
            return (
              <Link
                key={v.id}
                href={`/fleet/${v.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  paddingLeft: isService || isUnavailable ? 13 : 16,
                  borderBottom:
                    i < vehicles.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
                  textDecoration: "none",
                  borderLeft: isService
                    ? "3px solid transparent"
                    : isUnavailable
                      ? "3px solid transparent"
                      : undefined,
                  borderImage: isService
                    ? "linear-gradient(180deg,rgba(255,159,10,.7),rgba(255,159,10,.4)) 1"
                    : isUnavailable
                      ? "linear-gradient(180deg,rgba(255,69,58,.7),rgba(255,69,58,.4)) 1"
                      : undefined,
                }}
              >
                <VehicleStatusIcon status={v.status} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      fontFamily: "monospace",
                      color: "var(--prv-text-1)",
                      background: "var(--prv-g2)",
                      border: "1px solid var(--prv-border-subtle)",
                      padding: "2px 7px",
                      borderRadius: 5,
                      display: "inline-block",
                      marginBottom: 3,
                    }}
                  >
                    {v.plate}
                  </span>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--prv-text-1)",
                      margin: 0,
                      lineHeight: 1.3,
                    }}
                  >
                    {v.model} {v.year}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--prv-text-3)", margin: "2px 0 0" }}>
                    {v.assignment ?? v.base}
                  </p>
                  <FuelBar pct={v.fuelPct} />
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "3px 8px",
                    borderRadius: 6,
                    background: sc.bg,
                    color: sc.color,
                    flexShrink: 0,
                    alignSelf: "flex-start",
                  }}
                >
                  {sc.label}
                </span>
              </Link>
            )
          })}
        </div>
      )}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          style={{
            width: "100%",
            padding: "12px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            color: "rgba(255,255,255,0.65)",
            fontSize: 13,
            fontWeight: 500,
            cursor: isFetchingNextPage ? "default" : "pointer",
            marginTop: 8,
          }}
        >
          {isFetchingNextPage ? "Loading..." : "Load more"}
        </button>
      )}

      {/* FAB */}
      <button
        onClick={handleFAB}
        style={{
          position: "fixed",
          bottom: 100,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: 26,
          background: "rgba(255,255,255,.12)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(0,0,0,.5)",
          color: "rgba(255,255,255,.9)",
        }}
      >
        <IconPlus />
      </button>
    </div>
  )
}
