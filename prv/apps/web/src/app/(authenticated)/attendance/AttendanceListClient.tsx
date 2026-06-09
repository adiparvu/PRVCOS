"use client"

import { useState } from "react"
import Link from "next/link"
import { useSheetStack } from "@prv/ui"
import type { AttendanceRecord, AttendanceMeta, AttendanceStatus } from "@/app/api/attendance/route"
import { useAttendanceRecords } from "@/lib/api-hooks"

type FilterType = "Toți" | "Prezenți" | "Întârzieri" | "Absenți" | "Concediu"

const FILTER_TO_STATUS: Record<FilterType, AttendanceStatus | null> = {
  Toți: null,
  Prezenți: "present",
  Întârzieri: "late",
  Absenți: "absent",
  Concediu: "leave",
}

const STATUS_CONFIG: Record<AttendanceStatus, { bg: string; color: string; label: string }> = {
  present: { bg: "rgba(48,209,88,.13)", color: "rgba(48,209,88,.95)", label: "Prezent" },
  late: { bg: "rgba(255,159,10,.13)", color: "rgba(255,159,10,.95)", label: "Întârziere" },
  absent: { bg: "rgba(255,69,58,.12)", color: "rgba(255,69,58,.95)", label: "Absent" },
  leave: { bg: "rgba(10,132,255,.13)", color: "rgba(10,132,255,.9)", label: "Concediu" },
  clocked_out: { bg: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.45)", label: "Ieșit" },
}

const AVATAR_COLORS = [
  { bg: "rgba(10,132,255,.12)", color: "rgba(10,132,255,.9)" },
  { bg: "rgba(48,209,88,.1)", color: "rgba(48,209,88,.85)" },
  { bg: "rgba(191,90,242,.1)", color: "rgba(191,90,242,.9)" },
  { bg: "rgba(255,159,10,.1)", color: "rgba(255,159,10,.85)" },
  { bg: "rgba(255,69,58,.1)", color: "rgba(255,69,58,.85)" },
]

function Skeleton({ w, h, radius = 6 }: { w: number | string; h: number; radius?: number }) {
  return (
    <div
      style={{ width: w, height: h, borderRadius: radius, background: "rgba(255,255,255,.07)" }}
    />
  )
}

function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function EmployeeRow({ record, index }: { record: AttendanceRecord; index: number }) {
  const sc = STATUS_CONFIG[record.status] ?? STATUS_CONFIG.clocked_out
  const ac = AVATAR_COLORS[index % AVATAR_COLORS.length] ?? {
    bg: "rgba(255,255,255,.08)",
    color: "rgba(255,255,255,.6)",
  }
  const isLate = record.status === "late"
  const isAbsent = record.status === "absent"
  const barColor = isLate
    ? "rgba(255,159,10,.5)"
    : isAbsent
      ? "rgba(255,69,58,.35)"
      : "rgba(48,209,88,.5)"

  return (
    <Link
      href={`/attendance/${record.id}`}
      style={{
        display: "block",
        margin: "0 16px 8px",
        background: "rgba(255,255,255,.05)",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 14,
        padding: "12px 14px",
        textDecoration: "none",
        cursor: "pointer",
        ...(isLate
          ? {
              borderLeft: "3px solid transparent",
              borderImage: "linear-gradient(180deg,rgba(255,159,10,.7),rgba(255,159,10,.3)) 1",
              paddingLeft: 13,
            }
          : isAbsent
            ? {
                borderLeft: "3px solid transparent",
                borderImage: "linear-gradient(180deg,rgba(255,69,58,.8),rgba(255,69,58,.3)) 1",
                paddingLeft: 13,
              }
            : {}),
        opacity: record.status === "leave" ? 0.65 : 1,
      }}
    >
      <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: isLate ? "rgba(255,159,10,.12)" : isAbsent ? "rgba(255,69,58,.1)" : ac.bg,
            color: isLate ? "rgba(255,159,10,.9)" : isAbsent ? "rgba(255,69,58,.9)" : ac.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {record.initials}
        </div>
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
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--prv-text-1)", margin: 0 }}>
                {record.name}
              </p>
              <p style={{ fontSize: 12, color: "var(--prv-text-3)", margin: "2px 0 0" }}>
                {record.role} · {record.site}
              </p>
            </div>
            <span
              style={{
                padding: "3px 9px",
                borderRadius: 100,
                fontSize: 11,
                fontWeight: 700,
                whiteSpace: "nowrap",
                background: sc.bg,
                color: sc.color,
              }}
            >
              {isLate && record.lateMinutes ? `+${record.lateMinutes} min` : sc.label}
            </span>
          </div>
          <div style={{ marginTop: 7 }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,.5)", margin: 0 }}>
              {record.status === "leave"
                ? (record.leaveLabel ?? "Concediu")
                : record.status === "absent"
                  ? "Fără pontaj · Neanunțat"
                  : record.clockIn
                    ? `Intrare: ${record.clockIn}${record.activeMinutes ? ` · ${fmtMinutes(record.activeMinutes)} activ` : ""}${record.clockOut ? ` · Ieșire: ${record.clockOut}` : ""}`
                    : ""}
            </p>
          </div>
          {record.barPct > 0 && (
            <div
              style={{
                height: 3,
                background: "rgba(255,255,255,.07)",
                borderRadius: 2,
                marginTop: 7,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${record.barPct}%`,
                  borderRadius: 2,
                  background: barColor,
                }}
              />
            </div>
          )}
        </div>
      </div>
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

export function AttendanceListClient() {
  const [filter, setFilter] = useState<FilterType>("Toți")
  const { openSheet } = useSheetStack()
  const status = FILTER_TO_STATUS[filter]
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useAttendanceRecords(status)
  const allRecords: AttendanceRecord[] = data?.records ?? []
  const meta: AttendanceMeta | null = data?.meta ?? null
  const loading = isLoading

  let records = allRecords
  if (filter === "Prezenți") {
    records = allRecords.filter((r) => r.status === "present" || r.status === "clocked_out")
  }

  const handleFAB = () => {
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: "Acțiuni Prezență",
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
            label="Aprobă Toate Pontajele"
            sub="Confirmă prezența echipei azi"
            onClick={onClose}
          />
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
            label="Vizualizare Lunară"
            sub="Raport prezență pe lună"
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
            label="Export Raport Prezență"
            sub="PDF sau Excel pentru astăzi"
            onClick={onClose}
          />
        </div>
      ),
    })
  }

  const absentCount = records.filter((r) => r.status === "absent").length
  const lateRecords = records.filter((r) => r.status === "late")
  const absentRecords = records.filter((r) => r.status === "absent")
  const presentRecords = records.filter((r) => r.status === "present" || r.status === "clocked_out")
  const leaveRecords = records.filter((r) => r.status === "leave")

  const showSections = filter === "Toți"

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
        <span style={{ fontSize: 17, fontWeight: 700 }}>Prezență</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,.45)" }}>
            {meta?.dateLabel ?? "…"}
          </span>
          {meta && meta.absent > 0 && (
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
              {meta.absent}
            </span>
          )}
        </div>
      </div>

      {/* kpi */}
      {loading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 8,
            padding: "14px 16px 10px",
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
            padding: "14px 16px 10px",
          }}
        >
          {[
            { val: String(meta.present), label: "Prezenți", color: "rgba(48,209,88,.9)" },
            {
              val: String(meta.late),
              label: "Întârzieri",
              color: meta.late > 0 ? "rgba(255,159,10,.9)" : "var(--prv-text-1)",
            },
            {
              val: String(meta.absent),
              label: "Absenți",
              color: meta.absent > 0 ? "rgba(255,69,58,.9)" : "var(--prv-text-1)",
            },
            { val: String(meta.onLeave), label: "Concediu", color: "var(--prv-text-1)" },
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
      {!loading && absentCount > 0 && (
        <div
          style={{
            margin: "0 16px 12px",
            background: "rgba(255,69,58,.08)",
            border: "1px solid rgba(255,69,58,.22)",
            borderRadius: 12,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            color: "rgba(255,69,58,.95)",
            fontWeight: 500,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,69,58,.9)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {absentCount} {absentCount === 1 ? "absent nemotivat" : "absenți nemotivați"} — necesită
          acțiune
        </div>
      )}

      {/* filter chips */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "0 16px 12px",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        {(["Toți", "Prezenți", "Întârzieri", "Absenți", "Concediu"] as FilterType[]).map((f) => (
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
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} w="100%" h={82} radius={14} />
          ))}
        </div>
      ) : showSections ? (
        <>
          {lateRecords.length > 0 && (
            <>
              <SectionLabel>{`Întârzieri · ${lateRecords.length}`}</SectionLabel>
              {lateRecords.map((r, i) => (
                <EmployeeRow key={r.id} record={r} index={i} />
              ))}
            </>
          )}
          {absentRecords.length > 0 && (
            <>
              <SectionLabel>{`Absenți · ${absentRecords.length}`}</SectionLabel>
              {absentRecords.map((r, i) => (
                <EmployeeRow key={r.id} record={r} index={i} />
              ))}
            </>
          )}
          {presentRecords.length > 0 && (
            <>
              <SectionLabel>{`Prezenți · ${presentRecords.length}`}</SectionLabel>
              {presentRecords.map((r, i) => (
                <EmployeeRow key={r.id} record={r} index={i} />
              ))}
            </>
          )}
          {leaveRecords.length > 0 && (
            <>
              <SectionLabel>{`Concediu · ${leaveRecords.length}`}</SectionLabel>
              {leaveRecords.map((r, i) => (
                <EmployeeRow key={r.id} record={r} index={i} />
              ))}
            </>
          )}
        </>
      ) : (
        records.map((r, i) => <EmployeeRow key={r.id} record={r} index={i} />)
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
