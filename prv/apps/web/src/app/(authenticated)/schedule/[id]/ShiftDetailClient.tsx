"use client"

import { useShiftDetail } from "@/lib/api-hooks"
import Link from "next/link"
import { useSheetStack } from "@prv/ui"
import type { ShiftDetail } from "@/app/api/schedule/[id]/route"
import type { ShiftRole, ShiftStatus } from "@/app/api/schedule/route"

interface ShiftDetailClientProps {
  id: string
}

function Skeleton({ w, h, radius = 6 }: { w: number | string; h: number; radius?: number }) {
  return (
    <div
      style={{ width: w, height: h, borderRadius: radius, background: "rgba(255,255,255,0.07)" }}
    />
  )
}

const ROLE_CONFIG: Record<
  ShiftRole,
  { label: string; iconStroke: string; iconBg: string; heroBg: string }
> = {
  foreman: {
    label: "Maistru",
    iconStroke: "rgba(10,132,255,.85)",
    iconBg: "rgba(10,132,255,.1)",
    heroBg: "rgba(10,132,255,.1)",
  },
  bricklayer: {
    label: "Zidar",
    iconStroke: "rgba(255,159,10,.85)",
    iconBg: "rgba(255,159,10,.1)",
    heroBg: "rgba(255,159,10,.08)",
  },
  electrician: {
    label: "Electrician",
    iconStroke: "rgba(48,209,88,.8)",
    iconBg: "rgba(48,209,88,.08)",
    heroBg: "rgba(48,209,88,.06)",
  },
  finisher: {
    label: "Finisaj",
    iconStroke: "rgba(191,90,242,.8)",
    iconBg: "rgba(191,90,242,.08)",
    heroBg: "rgba(191,90,242,.06)",
  },
  welder: {
    label: "Sudor",
    iconStroke: "rgba(255,69,58,.85)",
    iconBg: "rgba(255,69,58,.08)",
    heroBg: "rgba(255,69,58,.06)",
  },
  general: {
    label: "General",
    iconStroke: "rgba(255,255,255,.5)",
    iconBg: "rgba(255,255,255,.06)",
    heroBg: "rgba(255,255,255,.04)",
  },
}

const STATUS_CONFIG: Record<ShiftStatus, { bg: string; color: string; label: string }> = {
  confirmed: { bg: "rgba(48,209,88,.13)", color: "rgba(48,209,88,.95)", label: "Confirmed" },
  open: { bg: "rgba(255,159,10,.13)", color: "rgba(255,159,10,.95)", label: "Uncovered" },
  draft: { bg: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.45)", label: "Draft" },
  scheduled: { bg: "rgba(10,132,255,.13)", color: "rgba(10,132,255,.9)", label: "Programat" },
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

function RoleIcon({ role, size = 22 }: { role: ShiftRole; size?: number }) {
  const rc = ROLE_CONFIG[role] ?? ROLE_CONFIG.general
  const path =
    role === "foreman" || role === "bricklayer" || role === "general" ? (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ) : role === "electrician" ? (
      <>
        <polyline points="13 2 13 9 20 9" />
        <path d="M11 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
        <polyline points="11 16 13 22 15 16 20 16" />
      </>
    ) : role === "finisher" ? (
      <>
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </>
    ) : (
      <>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </>
    )
  return (
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: 14,
        background: rc.heroBg,
        border: "1px solid rgba(255,255,255,.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={rc.iconStroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {path}
      </svg>
    </div>
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

const AVATAR_COLORS = [
  { bg: "rgba(10,132,255,.15)", color: "rgba(10,132,255,.9)" },
  { bg: "rgba(48,209,88,.1)", color: "rgba(48,209,88,.9)" },
  { bg: "rgba(191,90,242,.1)", color: "rgba(191,90,242,.9)" },
  { bg: "rgba(255,159,10,.1)", color: "rgba(255,159,10,.9)" },
  { bg: "rgba(255,69,58,.1)", color: "rgba(255,69,58,.9)" },
]

export function ShiftDetailClient({ id }: ShiftDetailClientProps) {
  const { data, isLoading: loading } = useShiftDetail(id)
  const shift = data?.shift ?? null
  const { openSheet } = useSheetStack()

  const handleFAB = () => {
    if (!shift) return
    const isOpen = shift.status === "open" || shift.status === "draft"

    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: "Shift Actions",
      render: (onClose) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
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
            label="Mark Present"
            sub="Confirm team attendance"
            onClick={onClose}
          />
          {isOpen && (
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
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              }
              label="Assign Employee"
              sub="Add a person to shift"
              onClick={onClose}
            />
          )}
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
            label="Edit Shift"
            sub="Edit interval, location, team"
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
            label="Export Shift Report"
            sub="PDF with details and time records"
            onClick={onClose}
          />
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
            label="Cancel Shift"
            sub="Notify employees automatically"
            onClick={onClose}
          />
        </div>
      ),
    })
  }

  if (loading) {
    return (
      <div style={{ padding: "0 16px", paddingBottom: 100 }}>
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
            margin: "0 -16px",
          }}
        >
          <Link
            href="/schedule"
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
            Program
          </Link>
          <Skeleton w={80} h={18} />
          <div style={{ width: 60 }} />
        </div>
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <Skeleton w="100%" h={120} radius={16} />
          <Skeleton w="100%" h={60} radius={14} />
          <Skeleton w="100%" h={160} radius={16} />
          <Skeleton w="100%" h={140} radius={16} />
        </div>
      </div>
    )
  }

  if (!shift) {
    return (
      <div style={{ padding: "80px 16px", textAlign: "center", color: "rgba(255,255,255,.35)" }}>
        Shift not found.
      </div>
    )
  }

  const rc = ROLE_CONFIG[shift.role] ?? ROLE_CONFIG.general
  const sc = STATUS_CONFIG[shift.status] ?? STATUS_CONFIG.scheduled
  const isOpen = shift.status === "open" || shift.status === "draft"
  const coveragePct =
    shift.openSlots === 0
      ? 100
      : Math.round((shift.assignees.length / (shift.assignees.length + shift.openSlots)) * 100)

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
          href="/schedule"
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
          Program
        </Link>
        <span style={{ fontSize: 17, fontWeight: 700 }}>Shift</span>
        <div style={{ width: 60 }} />
      </div>

      {/* hero */}
      <div
        style={{
          padding: "20px 16px 16px",
          borderBottom: "1px solid rgba(255,255,255,.07)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
          <RoleIcon role={shift.role} />
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase" as const,
                letterSpacing: ".07em",
                color: rc.iconStroke,
                margin: "0 0 4px",
              }}
            >
              Shift · {shift.dayLabel}
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.15, margin: 0 }}>
              {shift.title}
            </p>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,.55)", margin: "4px 0 0" }}>
              {shift.location} · {shift.startTime} – {shift.endTime}
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
                {shift.id.toUpperCase()}
              </span>
              {shift.project && (
                <span
                  style={{
                    padding: "3px 9px",
                    borderRadius: 100,
                    fontSize: 11,
                    fontWeight: 600,
                    background: "rgba(255,255,255,.07)",
                    color: "rgba(255,255,255,.45)",
                  }}
                >
                  {shift.project}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* stat tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {[
            { val: `${shift.durationHours}h`, label: "Duration", color: "var(--prv-text-1)" },
            {
              val: String(shift.assignees.length + shift.openSlots),
              label: "Assigned",
              color: isOpen ? "rgba(255,159,10,.9)" : "var(--prv-text-1)",
            },
            {
              val: `${coveragePct}%`,
              label: "Acoperire",
              color: coveragePct === 100 ? "rgba(48,209,88,.9)" : "rgba(255,159,10,.9)",
            },
          ].map((t) => (
            <div
              key={t.label}
              style={{
                background: "rgba(255,255,255,.05)",
                border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 12,
                padding: "10px 12px",
              }}
            >
              <p style={{ fontSize: 17, fontWeight: 700, color: t.color, margin: 0 }}>{t.val}</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,.4)", margin: "2px 0 0" }}>
                {t.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* open-slot alert */}
      {isOpen && shift.openSlots > 0 && (
        <div
          style={{
            margin: "12px 16px 0",
            background: "rgba(255,159,10,.06)",
            border: "1px solid rgba(255,159,10,.22)",
            borderRadius: 12,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            color: "rgba(255,159,10,.95)",
            fontWeight: 500,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,159,10,.9)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          {shift.openSlots} {shift.openSlots === 1 ? "open slot" : "open slots"} — requires asignare
        </div>
      )}

      {/* inline CTAs */}
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
            background: "rgba(255,69,58,.10)",
            color: "rgba(255,69,58,.95)",
            border: "1px solid rgba(255,69,58,.2)",
          }}
        >
          Cancel
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
            background: isOpen ? "rgba(10,132,255,.15)" : "rgba(48,209,88,.15)",
            color: isOpen ? "rgba(10,132,255,.9)" : "rgba(48,209,88,.95)",
            border: isOpen ? "1px solid rgba(10,132,255,.25)" : "1px solid rgba(48,209,88,.25)",
          }}
        >
          {isOpen ? "Assign Employee" : "Edit Shift"}
        </button>
      </div>

      {/* Details */}
      <div style={{ padding: "12px 16px 0" }}>
        <SectionLabel>Shift Details</SectionLabel>
        <SectionCard title="Information">
          <InfoRow label="Location" value={shift.location} />
          <InfoRow
            label="Interval"
            value={`${shift.startTime} – ${shift.endTime} · ${shift.durationHours}h`}
          />
          <InfoRow
            label="Break"
            value={
              shift.breakTime
                ? `${shift.breakMinutes} min (${shift.breakTime})`
                : `${shift.breakMinutes} min`
            }
          />
          <InfoRow
            label="Tarif orar"
            value={`€${shift.hourlyRate}/h`}
            valueColor="rgba(48,209,88,.9)"
          />
          <InfoRow label="Cost total estimat" value={`€${shift.estimatedCost}`} />
          {shift.project && <InfoRow label="Proiect" value={shift.project} />}
        </SectionCard>
      </div>

      {/* Assignees */}
      <div style={{ padding: "12px 16px 0" }}>
        <SectionLabel>Assigned Employees</SectionLabel>
        <SectionCard
          title="Team"
          badge={
            <span
              style={{
                padding: "3px 9px",
                borderRadius: 100,
                fontSize: 11,
                fontWeight: 700,
                background: shift.openSlots === 0 ? "rgba(48,209,88,.13)" : "rgba(255,159,10,.13)",
                color: shift.openSlots === 0 ? "rgba(48,209,88,.95)" : "rgba(255,159,10,.95)",
              }}
            >
              {shift.assignees.length} / {shift.assignees.length + shift.openSlots}
            </span>
          }
        >
          {shift.assignees.map((a, i) => {
            const ac = AVATAR_COLORS[i % AVATAR_COLORS.length] ?? {
              bg: "rgba(255,255,255,.08)",
              color: "rgba(255,255,255,.6)",
            }
            return (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderBottom: "1px solid rgba(255,255,255,.05)",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: ac.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    color: ac.color,
                    flexShrink: 0,
                  }}
                >
                  {a.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{a.name}</p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,.4)", margin: "1px 0 0" }}>
                    {rc.label} · Confirmat
                  </p>
                </div>
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
                  ✓
                </span>
              </div>
            )
          })}
          {shift.openSlots > 0 && (
            <div
              style={{
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(255,159,10,.08)",
                  border: "1px dashed rgba(255,159,10,.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,159,10,.7)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,159,10,.7)", margin: 0, fontWeight: 500 }}>
                {shift.openSlots} {shift.openSlots === 1 ? "loc liber" : "locuri libere"}
              </p>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Timeline */}
      <div style={{ padding: "12px 16px 0" }}>
        <SectionLabel>Shift Timeline</SectionLabel>
        <SectionCard title="Program Orar">
          {shift.timeline.map((entry, i) => {
            const isLast = i === shift.timeline.length - 1
            const dotColor = entry.done
              ? "rgba(48,209,88,.8)"
              : i === 0
                ? "rgba(255,255,255,.5)"
                : "rgba(255,255,255,.2)"
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
                      background: dotColor,
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
                    color: entry.done ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.3)",
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
                      color: entry.done ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.65)",
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

      {/* Notes */}
      {shift.notes && (
        <div style={{ padding: "12px 16px 0" }}>
          <SectionLabel>Note</SectionLabel>
          <SectionCard title="Instructions">
            <div style={{ padding: "12px 16px" }}>
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,.65)",
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                {shift.notes}
              </p>
            </div>
          </SectionCard>
        </div>
      )}

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
