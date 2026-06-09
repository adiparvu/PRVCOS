"use client"
import { useRouter } from "next/navigation"

import { useState } from "react"
import Link from "next/link"
import { useSheetStack } from "@prv/ui"
import type { ShiftSummary, ShiftsMeta, ShiftRole, ShiftStatus } from "@/app/api/schedule/route"
import { useShifts } from "@/lib/api-hooks"

type FilterType = "Toate" | "Astăzi" | "Confirmat" | "Neacoperit" | "Ciornă"

const FILTER_TO_STATUS: Record<FilterType, ShiftStatus | null> = {
  Toate: null,
  Astăzi: null,
  Confirmat: "confirmed",
  Neacoperit: "open",
  Ciornă: "draft",
}

const TODAY_LABEL = "Miercuri 9 Iun"

const ROLE_CONFIG: Record<ShiftRole, { iconStroke: string; iconBg: string }> = {
  foreman: { iconStroke: "rgba(10,132,255,.85)", iconBg: "rgba(10,132,255,.1)" },
  bricklayer: { iconStroke: "rgba(255,159,10,.85)", iconBg: "rgba(255,159,10,.1)" },
  electrician: { iconStroke: "rgba(48,209,88,.8)", iconBg: "rgba(48,209,88,.08)" },
  finisher: { iconStroke: "rgba(191,90,242,.8)", iconBg: "rgba(191,90,242,.08)" },
  welder: { iconStroke: "rgba(255,69,58,.85)", iconBg: "rgba(255,69,58,.08)" },
  general: { iconStroke: "rgba(255,255,255,.5)", iconBg: "rgba(255,255,255,.06)" },
}

const STATUS_PILL: Record<ShiftStatus, { bg: string; color: string; label: string }> = {
  confirmed: { bg: "rgba(48,209,88,.13)", color: "rgba(48,209,88,.95)", label: "Confirmat" },
  open: { bg: "rgba(255,159,10,.13)", color: "rgba(255,159,10,.95)", label: "Neacoperit" },
  draft: { bg: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.45)", label: "Ciornă" },
  scheduled: { bg: "rgba(10,132,255,.13)", color: "rgba(10,132,255,.9)", label: "Programat" },
}

const WEEK_DAYS = [
  { label: "LUN", date: 7, pips: ["rgba(48,209,88,.8)"], open: false },
  { label: "MAR", date: 8, pips: ["rgba(48,209,88,.8)", "rgba(191,90,242,.8)"], open: false },
  {
    label: "MIE",
    date: 9,
    pips: ["rgba(10,132,255,.8)", "rgba(48,209,88,.8)", "rgba(191,90,242,.8)"],
    open: false,
    today: true,
  },
  { label: "JOI", date: 10, pips: ["rgba(191,90,242,.8)", "rgba(255,255,255,.4)"], open: false },
  { label: "VIN", date: 11, pips: ["rgba(10,132,255,.8)", "rgba(48,209,88,.8)"], open: false },
  { label: "SÂM", date: 12, pips: ["rgba(255,159,10,.8)"], open: true },
  { label: "DUM", date: 13, pips: [], open: false },
]

function Skeleton({ w, h, radius = 6 }: { w: number | string; h: number; radius?: number }) {
  return (
    <div
      style={{ width: w, height: h, borderRadius: radius, background: "rgba(255,255,255,0.07)" }}
    />
  )
}

function RoleIcon({ role }: { role: ShiftRole }) {
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
        <circle cx="12" cy="12" r="10" />
        <line x1="14.31" y1="8" x2="20.05" y2="17.94" />
        <line x1="9.69" y1="8" x2="21.17" y2="8" />
        <line x1="7.38" y1="12" x2="13.12" y2="2.06" />
        <line x1="9.69" y1="16" x2="3.95" y2="6.06" />
        <line x1="14.31" y1="16" x2="2.83" y2="16" />
        <line x1="16.62" y1="12" x2="10.88" y2="21.94" />
      </>
    )

  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: rc.iconBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg
        width="17"
        height="17"
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

function ShiftRow({ shift }: { shift: ShiftSummary }) {
  const pill = STATUS_PILL[shift.status] ?? STATUS_PILL.scheduled
  const isOpen = shift.status === "open"

  return (
    <Link
      href={`/schedule/${shift.id}`}
      style={{
        display: "block",
        margin: "0 16px 8px",
        background: "rgba(255,255,255,.05)",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 14,
        padding: "13px 14px",
        textDecoration: "none",
        cursor: "pointer",
        ...(isOpen
          ? {
              borderLeft: "3px solid transparent",
              borderImage: "linear-gradient(180deg,rgba(255,159,10,.7),rgba(255,159,10,.3)) 1",
              paddingLeft: 13,
            }
          : {}),
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <RoleIcon role={shift.role} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--prv-text-1)",
                  margin: 0,
                  opacity: shift.status === "draft" ? 0.75 : 1,
                }}
              >
                {shift.title}
              </p>
              <p style={{ fontSize: 12, color: "var(--prv-text-3)", margin: "3px 0 0" }}>
                {shift.location}
                {shift.openSlots > 0
                  ? ` · ${shift.openSlots} loc${shift.openSlots > 1 ? "uri" : ""} liber${shift.openSlots > 1 ? "e" : ""}`
                  : ""}
              </p>
            </div>
            <span
              style={{
                padding: "3px 9px",
                borderRadius: 100,
                fontSize: 11,
                fontWeight: 700,
                whiteSpace: "nowrap",
                background: pill.bg,
                color: pill.color,
              }}
            >
              {pill.label}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 8,
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,.55)",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {shift.startTime} – {shift.endTime} · {shift.durationHours}h
            </span>
            {shift.assignees.length > 0 ? (
              <div style={{ display: "flex" }}>
                {shift.assignees.slice(0, 3).map((a, i) => (
                  <div
                    key={a.id}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,.12)",
                      border: "1px solid rgba(255,255,255,.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                      fontWeight: 700,
                      color: "rgba(255,255,255,.75)",
                      marginLeft: i === 0 ? 0 : -6,
                    }}
                  >
                    {a.initials}
                  </div>
                ))}
                {shift.assignees.length > 3 && (
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,.08)",
                      border: "1px solid rgba(255,255,255,.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 8,
                      fontWeight: 700,
                      color: "rgba(255,255,255,.45)",
                      marginLeft: -6,
                    }}
                  >
                    +{shift.assignees.length - 3}
                  </div>
                )}
              </div>
            ) : (
              <span style={{ fontSize: 11, color: "rgba(255,159,10,.7)" }}>Fără asignați</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

function OpenSlotRow({ shift }: { shift: ShiftSummary }) {
  return (
    <Link
      href={`/schedule/${shift.id}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        margin: "0 16px 8px",
        background: "rgba(255,159,10,.05)",
        border: "1px dashed rgba(255,159,10,.3)",
        borderRadius: 14,
        padding: "12px 14px",
        textDecoration: "none",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "rgba(255,159,10,.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,159,10,.85)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,159,10,.9)", margin: 0 }}>
          {shift.roleLabel} — {shift.dayLabel}
        </p>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,.35)", margin: "2px 0 0" }}>
          {shift.startTime} – {shift.endTime} · {shift.location} · {shift.durationHours}h
        </p>
      </div>
      <span
        style={{
          padding: "3px 9px",
          borderRadius: 100,
          fontSize: 11,
          fontWeight: 700,
          background: "rgba(255,159,10,.13)",
          color: "rgba(255,159,10,.95)",
          whiteSpace: "nowrap",
        }}
      >
        +Asignează
      </span>
    </Link>
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
        margin: "8px 2px 8px 18px",
      }}
    >
      {children}
    </p>
  )
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

export function ScheduleListClient() {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterType>("Toate")
  const { openSheet } = useSheetStack()
  const status = FILTER_TO_STATUS[filter]
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useShifts(status)
  let shifts: ShiftSummary[] = data?.shifts ?? []
  if (filter === "Astăzi") {
    shifts = shifts.filter((s) => s.dayLabel === TODAY_LABEL)
  }
  const meta: ShiftsMeta | null = data?.meta ?? null
  const loading = isLoading

  const handleFAB = () => {
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: "Acțiuni Program",
      render: (onClose) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
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
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <line x1="12" y1="14" x2="12" y2="18" />
                <line x1="10" y1="16" x2="14" y2="16" />
              </svg>
            }
            label="Tură Nouă"
            sub="Adaugă o tură în program"
            onClick={() => { onClose(); router.push("/schedule/new") }}
          />
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
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            }
            label="Generare Automată"
            sub="AI completează turele neacoperite"
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
            label="Export Program"
            sub="PDF sau Excel pentru săptămână"
            onClick={onClose}
          />
        </div>
      ),
    })
  }

  const openShifts = shifts.filter((s) => s.status === "open")

  // Group non-open shifts by dayLabel
  const groupedByDay = shifts
    .filter((s) => s.status !== "open")
    .reduce<Record<string, ShiftSummary[]>>((acc, s) => {
      const key = s.dayLabel
      if (!acc[key]) acc[key] = []
      acc[key].push(s)
      return acc
    }, {})

  const dayOrder = [
    "Luni 7 Iun",
    "Marți 8 Iun",
    "Miercuri 9 Iun",
    "Joi 10 Iun",
    "Vineri 11 Iun",
    "Sâmbătă 12 Iun",
    "Duminică 13 Iun",
  ]
  const sortedDays = Object.keys(groupedByDay).sort(
    (a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b)
  )

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* header */}
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
        <span style={{ fontSize: 17, fontWeight: 700 }}>Program</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,.45)" }}>
            {meta?.weekLabel ?? "…"}
          </span>
          {meta && meta.open > 0 && (
            <span
              style={{
                background: "rgba(255,69,58,.9)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: 100,
                lineHeight: 1.5,
              }}
            >
              {meta.open}
            </span>
          )}
        </div>
      </div>

      {/* week strip */}
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "14px 16px 10px",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        {WEEK_DAYS.map((d) => (
          <div
            key={d.date}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "8px 9px 7px",
              borderRadius: 12,
              minWidth: 42,
              flexShrink: 0,
              background: d.today
                ? "rgba(255,255,255,.10)"
                : d.open
                  ? "rgba(255,159,10,.06)"
                  : "rgba(255,255,255,.04)",
              border: d.today
                ? "1px solid rgba(255,255,255,.18)"
                : d.open
                  ? "1px solid rgba(255,159,10,.3)"
                  : "1px solid rgba(255,255,255,.07)",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "rgba(255,255,255,.45)",
                textTransform: "uppercase" as const,
                letterSpacing: ".04em",
              }}
            >
              {d.label}
            </span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: d.today ? "rgba(255,255,255,1)" : "rgba(255,255,255,.95)",
              }}
            >
              {d.date}
            </span>
            <div style={{ display: "flex", gap: 3, minHeight: 5 }}>
              {d.pips.map((c, i) => (
                <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: c }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* kpi strip */}
      {loading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 8,
            padding: "0 16px 14px",
          }}
        >
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} w="100%" h={52} radius={12} />
          ))}
        </div>
      ) : meta ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 8,
            padding: "0 16px 14px",
          }}
        >
          {[
            { val: String(meta.total), label: "Ture", color: "var(--prv-text-1)" },
            {
              val: String(meta.open),
              label: "Neacoperit",
              color: meta.open > 0 ? "rgba(255,159,10,.9)" : "var(--prv-text-1)",
            },
            { val: `${meta.coveragePct}%`, label: "Acoperire", color: "rgba(48,209,88,.9)" },
            { val: `${meta.totalHours}h`, label: "Ore", color: "var(--prv-text-1)" },
          ].map((k) => (
            <div
              key={k.label}
              style={{
                background: "rgba(255,255,255,.05)",
                border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 12,
                padding: "10px 10px 9px",
              }}
            >
              <p style={{ fontSize: 18, fontWeight: 700, color: k.color, margin: 0 }}>{k.val}</p>
              <p
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,.4)",
                  fontWeight: 500,
                  margin: "3px 0 0",
                }}
              >
                {k.label}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {/* alert */}
      {!loading && meta && meta.open > 0 && (
        <div
          style={{
            margin: "0 16px 12px",
            background: "rgba(255,159,10,.08)",
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
          {meta.open} {meta.open === 1 ? "tură neacoperită" : "ture neacoperite"} săptămâna aceasta
        </div>
      )}

      {/* filter chips */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "0 16px 14px",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        {(["Toate", "Astăzi", "Confirmat", "Neacoperit", "Ciornă"] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px",
              borderRadius: 100,
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
              flex: "0 0 auto",
              cursor: "pointer",
              border:
                filter === f
                  ? "1px solid rgba(255,255,255,.22)"
                  : "1px solid rgba(255,255,255,.09)",
              background: filter === f ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.05)",
              color: filter === f ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.55)",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} w="100%" h={82} radius={14} />
          ))}
        </div>
      ) : (
        <>
          {/* open slots section */}
          {openShifts.length > 0 && (filter === "Toate" || filter === "Neacoperit") && (
            <>
              <SectionLabel>{`Ture Neacoperite · ${openShifts.length}`}</SectionLabel>
              {openShifts.map((s) => (
                <OpenSlotRow key={s.id} shift={s} />
              ))}
            </>
          )}

          {/* grouped by day */}
          {sortedDays.map((day) => {
            const dayShifts = groupedByDay[day] ?? []
            if (dayShifts.length === 0) return null
            const isToday = day === TODAY_LABEL
            return (
              <div key={day}>
                <SectionLabel>{isToday ? `Astăzi · ${day}` : day}</SectionLabel>
                {dayShifts.map((s) => (
                  <ShiftRow key={s.id} shift={s} />
                ))}
              </div>
            )
          })}
        </>
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
          {isFetchingNextPage ? "Se încarcă..." : "Încarcă mai mult"}
        </button>
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
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,.9)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  )
}
