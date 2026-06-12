"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useSheetStack } from "@prv/ui"
import type { VehicleDetail, MaintenanceStatus } from "@/app/api/fleet/[id]/route"

interface VehicleDetailClientProps {
  id: string
}

// ── Icons ─────────────────────────────────────────────────────────────────────

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
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function Skeleton({
  w,
  h,
  radius = 6,
  style,
}: {
  w: number | string
  h: number
  radius?: number
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        background: "rgba(255,255,255,0.07)",
        ...style,
      }}
    />
  )
}

const MAINTENANCE_STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; dot: string; label: string }
> = {
  Done: {
    color: "rgba(48,209,88,.95)",
    bg: "rgba(48,209,88,.13)",
    dot: "rgba(48,209,88,.85)",
    label: "Efectuat",
  },
  "Due Soon": {
    color: "rgba(255,159,10,.95)",
    bg: "rgba(255,159,10,.13)",
    dot: "rgba(255,159,10,.85)",
    label: "Scadent",
  },
  Overdue: {
    color: "rgba(255,69,58,.95)",
    bg: "rgba(255,69,58,.12)",
    dot: "rgba(255,69,58,.85)",
    label: "Restant",
  },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Active: { label: "Active", color: "rgba(48,209,88,.95)", bg: "rgba(48,209,88,.13)" },
  Service: { label: "Service", color: "rgba(255,159,10,.95)", bg: "rgba(255,159,10,.13)" },
  Idle: { label: "Idle", color: "rgba(255,255,255,.55)", bg: "rgba(255,255,255,.08)" },
  Unavailable: { label: "Indisponibil", color: "rgba(255,69,58,.95)", bg: "rgba(255,69,58,.12)" },
}

// ── Sheet button helper ───────────────────────────────────────────────────────

type SheetColor = "amber" | "blue" | "red" | "white"

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
    amber: { background: "rgba(255,159,10,.10)", border: "1px solid rgba(255,159,10,.2)" },
    blue: { background: "rgba(10,132,255,.15)", border: "1px solid rgba(10,132,255,.25)" },
    red: { background: "rgba(255,69,58,.10)", border: "1px solid rgba(255,69,58,.2)" },
    white: { background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.09)" },
  }
  const labelColor: Record<SheetColor, string> = {
    amber: "rgba(255,159,10,.95)",
    blue: "rgba(10,132,255,.9)",
    red: "rgba(255,69,58,.95)",
    white: "var(--prv-text-1)",
  }
  const iconBg: Record<SheetColor, string> = {
    amber: "rgba(255,159,10,.18)",
    blue: "rgba(10,132,255,.2)",
    red: "rgba(255,69,58,.15)",
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

export function VehicleDetailClient({ id }: VehicleDetailClientProps) {
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null)
  const [error, setError] = useState(false)
  const { openSheet } = useSheetStack()

  const fetchVehicle = useCallback(async () => {
    setError(false)
    try {
      const res = await fetch(`/api/fleet/${id}`)
      if (!res.ok) throw new Error()
      const data = (await res.json()) as { vehicle: VehicleDetail }
      setVehicle(data.vehicle)
    } catch {
      setError(true)
    }
  }, [id])

  useEffect(() => {
    void fetchVehicle()
  }, [fetchVehicle])

  const handleFAB = () => {
    if (!vehicle) return
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: "Vehicle Actions",
      render: (onClose) => {
        const hasDueSoon = vehicle.maintenance.some(
          (m) => m.status === "Due Soon" || m.status === "Overdue"
        )
        return (
          <div
            style={{ padding: "8px 16px 40px", display: "flex", flexDirection: "column", gap: 10 }}
          >
            <SheetBtn
              color="amber"
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,159,10,.9)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              }
              label="Schedule Service"
              sub={hasDueSoon ? "Overdue maintenance detected" : "Schedule service"}
              onClick={onClose}
            />
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
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="23" y1="11" x2="23" y2="17" />
                  <line x1="20" y1="14" x2="26" y2="14" />
                </svg>
              }
              label="Assign Driver"
              sub={vehicle.driver ? `Current driver: ${vehicle.driver}` : "No driver assigned"}
              onClick={onClose}
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
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              }
              label="Edit Vehicle"
              sub="Data, documents, base"
              onClick={onClose}
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
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              }
              label="Raport Vehicul"
              sub="Export km, consum, costuri"
              onClick={onClose}
            />
            <SheetBtn
              color="red"
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,69,58,.9)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
              }
              label="Mark Unavailable"
              sub="Avarie, blocat sau retras"
              onClick={onClose}
            />
          </div>
        )
      },
    })
  }

  if (error)
    return (
      <div style={{ padding: "80px 16px", textAlign: "center" }}>
        <p style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Vehicle not found.</p>
        <Link
          href="/fleet"
          style={{ fontSize: 14, color: "#7eb8ff", marginTop: 12, display: "block" }}
        >
          ← Back la Fleet
        </Link>
      </div>
    )

  if (!vehicle)
    return (
      <div
        style={{
          padding: "32px 16px 120px",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 24,
            color: "var(--prv-text-2)",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          <IconChevronLeft />
          Fleet
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 18,
              padding: 16,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Skeleton w={100} h={22} radius={5} />
              <Skeleton w="60%" h={20} />
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <Skeleton w={50} h={24} radius={8} />
                <Skeleton w={60} h={24} radius={8} />
                <Skeleton w={55} h={24} radius={8} />
              </div>
              <Skeleton w="100%" h={6} radius={3} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  background: "var(--prv-g1)",
                  border: "1px solid var(--prv-border-subtle)",
                  borderRadius: 14,
                  padding: "11px 12px",
                }}
              >
                <Skeleton w="60%" h={14} />
                <Skeleton w="80%" h={10} radius={3} style={{ marginTop: 6 }} />
              </div>
            ))}
          </div>
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 18,
              height: 100,
            }}
          />
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 18,
              height: 140,
            }}
          />
        </div>
      </div>
    )

  const sc = STATUS_CONFIG[vehicle.status] ?? {
    label: vehicle.status,
    color: "var(--prv-text-3)",
    bg: "var(--prv-border-subtle)",
  }
  const kmToService = vehicle.nextServiceKm - vehicle.odometer
  const kmToServiceColor =
    kmToService < 2000
      ? "rgba(255,69,58,.9)"
      : kmToService < 5000
        ? "rgba(255,159,10,.9)"
        : "var(--prv-text-1)"
  const isActive = vehicle.status === "Active"
  const fuelColor =
    vehicle.fuelPct > 60
      ? "rgba(48,209,88,.6)"
      : vehicle.fuelPct > 30
        ? "rgba(255,159,10,.7)"
        : "rgba(255,69,58,.7)"

  return (
    <div
      style={{
        padding: "32px 16px 140px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Back */}
      <Link
        href="/fleet"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "var(--prv-text-2)",
          fontSize: 14,
          fontWeight: 500,
          textDecoration: "none",
          marginBottom: 20,
        }}
      >
        <IconChevronLeft />
        Fleet
      </Link>

      {/* Hero card */}
      <div
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 20,
          position: "relative",
          overflow: "hidden",
          marginBottom: 14,
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
        <div style={{ padding: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <div>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  fontFamily: "monospace",
                  color: "var(--prv-text-1)",
                  background: "var(--prv-g2)",
                  border: "1px solid var(--prv-border-subtle)",
                  padding: "4px 10px",
                  borderRadius: 6,
                  display: "inline-block",
                  marginBottom: 6,
                }}
              >
                {vehicle.plate}
              </span>
              <p style={{ fontSize: 20, fontWeight: 700, color: "var(--prv-text-1)", margin: 0 }}>
                {vehicle.model} {vehicle.year}
              </p>
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
              }}
            >
              {sc.label}
            </span>
          </div>

          {/* Meta pills */}
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
            {[vehicle.type, vehicle.fuel, vehicle.base].map((tag) => (
              <div
                key={tag}
                style={{
                  padding: "4px 9px",
                  borderRadius: 8,
                  background: "var(--prv-g1)",
                  border: "1px solid var(--prv-border-subtle)",
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--prv-text-2)",
                }}
              >
                {tag}
              </div>
            ))}
          </div>

          {/* Fuel bar */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--prv-text-2)",
                marginBottom: 6,
              }}
            >
              <span>Combustibil</span>
              <span
                style={{
                  color: fuelColor.replace(".6)", ".95)").replace(".7)", ".95)"),
                  fontWeight: 700,
                }}
              >
                {vehicle.fuelPct}%
              </span>
            </div>
            <div
              style={{
                height: 6,
                background: "var(--prv-border)",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${vehicle.fuelPct}%`,
                  height: "100%",
                  borderRadius: 3,
                  background: fuelColor,
                  transition: "width .4s ease",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Live dispatch card — only when Active */}
      {isActive && vehicle.driver && vehicle.assignment && (
        <div
          style={{
            background: "rgba(48,209,88,.05)",
            border: "1px solid rgba(48,209,88,.18)",
            borderRadius: 16,
            padding: "13px 14px",
            marginBottom: 14,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "0 0 auto",
              height: 1,
              background: "linear-gradient(90deg,transparent,rgba(48,209,88,.2),transparent)",
            }}
          />
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(48,209,88,.7)",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              margin: "0 0 8px",
            }}
          >
            Active Mission
          </p>
          <p
            style={{ fontSize: 14, fontWeight: 700, color: "var(--prv-text-1)", margin: "0 0 3px" }}
          >
            {vehicle.assignment}
          </p>
          <p style={{ fontSize: 13, color: "var(--prv-text-2)", margin: 0 }}>
            {vehicle.driver} · {vehicle.kmToday} km azi
          </p>
        </div>
      )}

      {/* Odometer tiles */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        {[
          { val: vehicle.odometer.toLocaleString(), label: "Km Total" },
          {
            val: `~${kmToService.toLocaleString()}`,
            label: "Km to Service",
            color: kmToServiceColor,
          },
          { val: String(vehicle.kmToday), label: "Km Azi" },
        ].map((tile) => (
          <div
            key={tile.label}
            style={{
              flex: 1,
              padding: "11px 12px",
              borderRadius: 14,
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
            }}
          >
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: tile.color ?? "var(--prv-text-1)",
                margin: 0,
              }}
            >
              {tile.val}
            </p>
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--prv-text-3)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: "3px 0 0",
              }}
            >
              {tile.label}
            </p>
          </div>
        ))}
      </div>

      {/* Documents */}
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--prv-text-3)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          margin: "0 2px 10px",
        }}
      >
        Documente
      </p>
      <div
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 18,
          position: "relative",
          overflow: "hidden",
          marginBottom: 14,
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
        {[
          { label: "Asigurare RCA", detail: vehicle.insurance },
          { label: "ITP", detail: vehicle.itp },
        ].map((doc, i) => (
          <div
            key={doc.label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: i === 0 ? "1px solid var(--prv-border-subtle)" : "none",
            }}
          >
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--prv-text-1)", margin: 0 }}>
                {doc.label}
              </p>
              <p style={{ fontSize: 11, color: "var(--prv-text-3)", margin: "2px 0 0" }}>
                {doc.detail}
              </p>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: 6,
                background: "rgba(48,209,88,.13)",
                color: "rgba(48,209,88,.95)",
              }}
            >
              Valid
            </span>
          </div>
        ))}
      </div>

      {/* Maintenance */}
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--prv-text-3)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          margin: "0 2px 10px",
        }}
      >
        Maintenance
      </p>
      <div
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 18,
          position: "relative",
          overflow: "hidden",
          marginBottom: 14,
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
        {vehicle.maintenance.map((rec, i) => {
          const msc = MAINTENANCE_STATUS_CONFIG[rec.status as MaintenanceStatus] ?? {
            color: "var(--prv-text-3)",
            bg: "var(--prv-border-subtle)",
            dot: "rgba(255,255,255,.35)",
            label: rec.status,
          }
          return (
            <div
              key={rec.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 16px",
                borderBottom:
                  i < vehicle.maintenance.length - 1
                    ? "1px solid var(--prv-border-subtle)"
                    : "none",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: msc.dot,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--prv-text-1)", margin: 0 }}>
                  {rec.label}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color:
                      rec.status === "Done"
                        ? "var(--prv-text-3)"
                        : msc.color.replace(".95)", ".7)").replace(".9)", ".7)"),
                    margin: "2px 0 0",
                  }}
                >
                  {rec.detail}
                </p>
              </div>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  padding: "3px 7px",
                  borderRadius: 5,
                  background: msc.bg,
                  color: msc.color,
                  flexShrink: 0,
                }}
              >
                {msc.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Activity */}
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--prv-text-3)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          margin: "0 2px 10px",
        }}
      >
        Activitate Azi
      </p>
      <div
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 18,
          position: "relative",
          overflow: "hidden",
          marginBottom: 14,
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
        {vehicle.activity.map((evt, i) => (
          <div
            key={evt.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "10px 16px",
              borderBottom:
                i < vehicle.activity.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontFamily: "monospace",
                color: "var(--prv-text-3)",
                width: 36,
                flexShrink: 0,
                paddingTop: 2,
              }}
            >
              {evt.time}
            </span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: evt.color, margin: 0 }}>
                {evt.label}
              </p>
              <p style={{ fontSize: 11, color: "var(--prv-text-3)", margin: "2px 0 0" }}>
                {evt.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

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
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </svg>
      </button>
    </div>
  )
}
