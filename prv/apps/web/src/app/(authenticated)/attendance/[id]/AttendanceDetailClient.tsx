"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useSheetStack } from "@prv/ui"
import type { AttendanceDetail } from "@/app/api/attendance/[id]/route"
import type { AttendanceStatus } from "@/app/api/attendance/route"

interface AttendanceDetailClientProps {
  id: string
}

function Skeleton({ w, h, radius = 6 }: { w: number | string; h: number; radius?: number }) {
  return (
    <div
      style={{ width: w, height: h, borderRadius: radius, background: "rgba(255,255,255,.07)" }}
    />
  )
}

const STATUS_CONFIG: Record<AttendanceStatus, { bg: string; color: string; label: string }> = {
  present: { bg: "rgba(48,209,88,.13)", color: "rgba(48,209,88,.95)", label: "Prezent" },
  late: { bg: "rgba(255,159,10,.13)", color: "rgba(255,159,10,.95)", label: "Late" },
  absent: { bg: "rgba(255,69,58,.12)", color: "rgba(255,69,58,.95)", label: "Absent" },
  leave: { bg: "rgba(10,132,255,.13)", color: "rgba(10,132,255,.9)", label: "Concediu" },
  clocked_out: {
    bg: "rgba(255,255,255,.07)",
    color: "rgba(255,255,255,.45)",
    label: "Clocked Out",
  },
}

const AVATAR_COLORS: Record<string, { bg: string; color: string }> = {
  present: { bg: "rgba(10,132,255,.12)", color: "rgba(10,132,255,.9)" },
  late: { bg: "rgba(255,159,10,.12)", color: "rgba(255,159,10,.9)" },
  absent: { bg: "rgba(255,69,58,.1)", color: "rgba(255,69,58,.9)" },
  leave: { bg: "rgba(10,132,255,.1)", color: "rgba(10,132,255,.7)" },
  clocked_out: { bg: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.5)" },
}

type SheetColor = "amber" | "blue" | "green" | "red" | "white"

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
    green: { background: "rgba(48,209,88,.10)", border: "1px solid rgba(48,209,88,.2)" },
    red: { background: "rgba(255,69,58,.10)", border: "1px solid rgba(255,69,58,.2)" },
    white: { background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.09)" },
  }
  const labelColor: Record<SheetColor, string> = {
    amber: "rgba(255,159,10,.95)",
    blue: "rgba(10,132,255,.9)",
    green: "rgba(48,209,88,.95)",
    red: "rgba(255,69,58,.95)",
    white: "var(--prv-text-1)",
  }
  const iconBg: Record<SheetColor, string> = {
    amber: "rgba(255,159,10,.18)",
    blue: "rgba(10,132,255,.2)",
    green: "rgba(48,209,88,.18)",
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
        marginBottom: 8,
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

function SectionLabel({ children }: { children: string }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "var(--prv-text-3)",
        textTransform: "uppercase" as const,
        letterSpacing: "0.07em",
        margin: "0 2px 10px",
      }}
    >
      {children}
    </p>
  )
}

function SectionCard({
  title,
  badge,
  children,
}: {
  title: string
  badge?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        marginBottom: 0,
        background: "rgba(255,255,255,.05)",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px 10px",
          fontSize: 13,
          fontWeight: 700,
          color: "rgba(255,255,255,.75)",
          borderBottom: "1px solid rgba(255,255,255,.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {title}
        {badge}
      </div>
      {children}
    </div>
  )
}

function InfoRow({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "11px 16px",
        borderBottom: "1px solid rgba(255,255,255,.05)",
      }}
    >
      <span style={{ fontSize: 13, color: "rgba(255,255,255,.45)" }}>{label}</span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: valueColor ?? "rgba(255,255,255,.9)",
          textAlign: "right",
          maxWidth: "55%",
        }}
      >
        {value}
      </span>
    </div>
  )
}

function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function AttendanceDetailClient({ id }: AttendanceDetailClientProps) {
  const [record, setRecord] = useState<AttendanceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const { openSheet } = useSheetStack()

  const fetchRecord = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/attendance/${id}`)
      const data = await res.json()
      setRecord(data.record ?? null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchRecord()
  }, [fetchRecord])

  const handleFAB = () => {
    if (!record) return
    const isActionable = record.status !== "leave"

    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: "Attendance Actions",
      render: (onClose) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {isActionable && (
            <SheetBtn
              color="green"
              icon={
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(48,209,88,.9)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              }
              label="Approve Pontaj"
              sub="Confirmed and sent to payroll"
              onClick={onClose}
            />
          )}
          {isActionable && (
            <SheetBtn
              color="amber"
              icon={
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
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              }
              label="Correct Pontaj"
              sub="Edit hours, breaks, location"
              onClick={onClose}
            />
          )}
          <SheetBtn
            color="blue"
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(10,132,255,.9)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            }
            label="Attendance History"
            sub="Pontaj complet employee"
            onClick={onClose}
          />
          <SheetBtn
            color="white"
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,.6)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            }
            label="Export Raport"
            sub="PDF or Excel for period"
            onClick={onClose}
          />
          {record.status === "absent" && (
            <SheetBtn
              color="red"
              icon={
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,69,58,.9)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              }
              label="Mark Absent"
              sub="Record unexcused absence"
              onClick={onClose}
            />
          )}
        </div>
      ),
    })
  }

  if (loading) {
    return (
      <div style={{ paddingBottom: 100 }}>
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            padding: "12px 16px 10px",
            background: "rgba(0,0,0,.55)",
            backdropFilter: "blur(32px)",
            borderBottom: "1px solid rgba(255,255,255,.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/attendance"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              color: "rgba(10,132,255,.9)",
              fontSize: 15,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            <svg
              width="9"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(10,132,255,.9)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Attendance
          </Link>
          <Skeleton w={80} h={18} />
          <div style={{ width: 60 }} />
        </div>
        <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <Skeleton w="100%" h={120} radius={16} />
          <Skeleton w="100%" h={60} radius={14} />
          <Skeleton w="100%" h={120} radius={16} />
          <Skeleton w="100%" h={180} radius={16} />
        </div>
      </div>
    )
  }

  if (!record) {
    return (
      <div style={{ padding: "80px 16px", textAlign: "center", color: "rgba(255,255,255,.35)" }}>
        Record not found.
      </div>
    )
  }

  const sc = STATUS_CONFIG[record.status] ?? STATUS_CONFIG.clocked_out
  const ac = AVATAR_COLORS[record.status] ?? {
    bg: "rgba(255,255,255,.08)",
    color: "rgba(255,255,255,.6)",
  }
  const isLate = record.status === "late"
  const isAbsent = record.status === "absent"
  const maxBarPct = Math.max(...record.weekDays.map((d) => d.barPct), 1)

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* nav */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          padding: "12px 16px 10px",
          background: "rgba(0,0,0,.55)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          borderBottom: "1px solid rgba(255,255,255,.07)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/attendance"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            color: "rgba(10,132,255,.9)",
            fontSize: 15,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          <svg
            width="9"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(10,132,255,.9)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Attendance
        </Link>
        <span style={{ fontSize: 17, fontWeight: 700 }}>Pontaj</span>
        <div style={{ width: 60 }} />
      </div>

      {/* hero */}
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: ac.bg,
              color: ac.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 700,
              flexShrink: 0,
              border: "1px solid rgba(255,255,255,.08)",
            }}
          >
            {record.initials}
          </div>
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase" as const,
                letterSpacing: ".07em",
                color: "rgba(255,255,255,.35)",
                margin: "0 0 4px",
              }}
            >
              Attendance · Wed 9 Jun 2026
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.15, margin: 0 }}>
              {record.name}
            </p>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,.55)", margin: "4px 0 0" }}>
              {record.role} · {record.site}
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginTop: 10 }}>
              <span
                style={{
                  padding: "3px 9px",
                  borderRadius: 100,
                  fontSize: 11,
                  fontWeight: 700,
                  background: sc.bg,
                  color: sc.color,
                }}
              >
                {sc.label}
              </span>
              <span
                style={{
                  padding: "3px 9px",
                  borderRadius: 100,
                  fontSize: 11,
                  fontWeight: 700,
                  background: "rgba(10,132,255,.1)",
                  color: "rgba(10,132,255,.9)",
                }}
              >
                {record.id.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* stat tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          <div
            style={{
              background: "rgba(255,255,255,.05)",
              border: "1px solid rgba(255,255,255,.08)",
              borderRadius: 12,
              padding: "10px 12px",
            }}
          >
            <p style={{ fontSize: 17, fontWeight: 700, color: "var(--prv-text-1)", margin: 0 }}>
              {record.activeMinutes ? fmtMinutes(record.activeMinutes) : "—"}
            </p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,.4)", margin: "2px 0 0" }}>
              Timp Activ
            </p>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,.05)",
              border: "1px solid rgba(255,255,255,.08)",
              borderRadius: 12,
              padding: "10px 12px",
            }}
          >
            <p
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: isLate ? "rgba(255,159,10,.9)" : "rgba(48,209,88,.9)",
                margin: 0,
              }}
            >
              {record.clockIn ?? "—"}
            </p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,.4)", margin: "2px 0 0" }}>
              Intrare
            </p>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,.05)",
              border: "1px solid rgba(255,255,255,.08)",
              borderRadius: 12,
              padding: "10px 12px",
            }}
          >
            <p
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: record.clockOut ? "rgba(48,209,88,.9)" : "rgba(255,255,255,.3)",
                margin: 0,
              }}
            >
              {record.clockOut ?? "—"}
            </p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,.4)", margin: "2px 0 0" }}>
              Clock Out
            </p>
          </div>
        </div>
      </div>

      {/* late / absent alert */}
      {(isLate || isAbsent) && (
        <div
          style={{
            margin: "12px 16px 0",
            background: isAbsent ? "rgba(255,69,58,.07)" : "rgba(255,159,10,.07)",
            border: `1px solid ${isAbsent ? "rgba(255,69,58,.22)" : "rgba(255,159,10,.22)"}`,
            borderRadius: 12,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            color: isAbsent ? "rgba(255,69,58,.95)" : "rgba(255,159,10,.95)",
            fontWeight: 500,
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
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          {isAbsent
            ? "Unexcused absence — requires recording"
            : `${record.lateMinutes} minutes late vs scheduled time`}
        </div>
      )}

      {/* inline CTAs */}
      {!isAbsent && record.status !== "leave" && (
        <div style={{ display: "flex", gap: 10, margin: "14px 16px 0" }}>
          <button
            style={{
              flex: 1,
              padding: "14px 0",
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 700,
              textAlign: "center",
              cursor: "pointer",
              background: "rgba(255,255,255,.06)",
              color: "rgba(255,255,255,.7)",
              border: "1px solid rgba(255,255,255,.09)",
            }}
          >
            Correct
          </button>
          <button
            style={{
              flex: 2,
              padding: "14px 0",
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 700,
              textAlign: "center",
              cursor: "pointer",
              background: "rgba(48,209,88,.15)",
              color: "rgba(48,209,88,.95)",
              border: "1px solid rgba(48,209,88,.25)",
            }}
          >
            Approve Pontaj
          </button>
        </div>
      )}

      {/* weekly bar chart */}
      <div style={{ padding: "12px 16px 0" }}>
        <SectionLabel>Current Week</SectionLabel>
        <SectionCard
          title="Ore Lucrate"
          badge={
            <span
              style={{
                padding: "3px 9px",
                borderRadius: 100,
                fontSize: 11,
                fontWeight: 700,
                background: "rgba(48,209,88,.13)",
                color: "rgba(48,209,88,.95)",
              }}
            >
              {fmtMinutes(record.weekTotalMinutes)}
            </span>
          }
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 6,
              padding: "14px 16px 12px",
              height: 80,
            }}
          >
            {record.weekDays.map((d) => {
              const relH = maxBarPct > 0 ? (d.barPct / maxBarPct) * 100 : 0
              return (
                <div
                  key={d.label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      background: "rgba(255,255,255,.06)",
                      borderRadius: 4,
                      flex: 1,
                      display: "flex",
                      alignItems: "flex-end",
                      border: d.isToday ? "1px solid rgba(255,255,255,.12)" : "none",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: `${relH}%`,
                        borderRadius: 4,
                        background: d.isToday ? "rgba(10,132,255,.6)" : "rgba(48,209,88,.45)",
                        minHeight: d.barPct > 0 ? 3 : 0,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      color: d.isToday ? "rgba(255,255,255,.75)" : "rgba(255,255,255,.3)",
                    }}
                  >
                    {d.label}
                  </span>
                </div>
              )
            })}
          </div>
        </SectionCard>
      </div>

      {/* details */}
      <div style={{ padding: "12px 16px 0" }}>
        <SectionLabel>Detalii Pontaj</SectionLabel>
        <SectionCard title="Information">
          <InfoRow label="Location" value={record.site} />
          <InfoRow
            label="Verificare GPS"
            value={record.gpsVerified ? "Confirmed" : "Neverificat"}
            valueColor={record.gpsVerified ? "rgba(48,209,88,.9)" : "rgba(255,69,58,.9)"}
          />
          {record.device && <InfoRow label="Dispozitiv" value={record.device} />}
          <InfoRow
            label="Planned Shift"
            value={`${record.scheduledStart} – ${record.scheduledEnd}`}
          />
          {record.overtime > 0 && (
            <InfoRow
              label="Ore suplimentare"
              value={`+${record.overtime}m`}
              valueColor="rgba(255,159,10,.9)"
            />
          )}
          {record.approvedBy && (
            <InfoRow label="Aprobat de" value={record.approvedBy} valueColor="rgba(48,209,88,.9)" />
          )}
        </SectionCard>
      </div>

      {/* timeline */}
      <div style={{ padding: "12px 16px 0" }}>
        <SectionLabel>Cronologie Pontaj</SectionLabel>
        <SectionCard title="Evenimente">
          {record.timeline.map((entry, i) => {
            const isLast = i === record.timeline.length - 1
            return (
              <div
                key={entry.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "10px 16px",
                  borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,.05)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    paddingTop: 4,
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: entry.color,
                      flexShrink: 0,
                    }}
                  />
                  {!isLast && (
                    <div
                      style={{
                        width: 1,
                        flex: 1,
                        background: "rgba(255,255,255,.1)",
                        marginTop: 3,
                        minHeight: 18,
                      }}
                    />
                  )}
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color: entry.done ? "rgba(255,255,255,.45)" : "rgba(255,255,255,.25)",
                    width: 42,
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {entry.time}
                </span>
                <div style={{ paddingTop: 1 }}>
                  <p
                    style={{
                      fontSize: 13,
                      color: entry.done ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.35)",
                      fontWeight: 500,
                      margin: 0,
                    }}
                  >
                    {entry.label}
                  </p>
                  {entry.sub && (
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,.3)", margin: "2px 0 0" }}>
                      {entry.sub}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </SectionCard>
      </div>

      {/* FAB */}
      <button
        onClick={handleFAB}
        style={{
          position: "fixed",
          bottom: 88,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "rgba(255,255,255,.14)",
          border: "1px solid rgba(255,255,255,.22)",
          boxShadow: "0 8px 24px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.25)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 20,
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,.9)"
          strokeWidth="2.2"
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
