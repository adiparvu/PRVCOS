"use client"
import { useRouter } from "next/navigation"

import { useState } from "react"
import Link from "next/link"
import type {
  Course,
  Achievement,
  LearningMeta,
  CourseCategory,
  CourseStatus,
} from "@/app/api/learning/route"
import { useCourses } from "@/lib/api-hooks"

type FilterType = "Toate" | "În Curs" | "Recomandate" | "Completate" | "Salvate"

const g1 = "var(--prv-g1)"
const g2 = "var(--prv-g2)"
const g3 = "var(--prv-g3)"
const bd = "var(--prv-border)"
const bds = "var(--prv-border-subtle)"
const t1 = "var(--prv-text-1)"
const t2 = "var(--prv-text-2)"
const t3 = "var(--prv-text-3)"
const t4 = "var(--prv-text-4)"

function Specular() {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 1,
        background: `linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)`,
        pointerEvents: "none",
      }}
    />
  )
}

function ProgBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 4, background: bd, borderRadius: 2, overflow: "hidden", marginTop: 6 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2 }} />
    </div>
  )
}

function CategoryIcon({ category, size = 18 }: { category: CourseCategory; size?: number }) {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "rgba(255,255,255,0.65)",
    strokeWidth: "1.8",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  }
  if (category === "safety")
    return (
      <svg {...p}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    )
  if (category === "leadership")
    return (
      <svg {...p}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  if (category === "digital")
    return (
      <svg {...p}>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    )
  if (category === "finance")
    return (
      <svg {...p}>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    )
  if (category === "renovation")
    return (
      <svg {...p}>
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    )
  return (
    <svg {...p}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4l3 3" />
    </svg>
  )
}

function StatusPill({ status, progress }: { status: CourseStatus; progress: number }) {
  if (status === "in_progress") {
    const hi = progress >= 50
    return (
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          padding: "3px 8px",
          borderRadius: 20,
          background: hi ? "rgba(10,132,255,0.12)" : "rgba(255,159,10,0.15)",
          color: hi ? "rgba(10,132,255,0.9)" : "rgba(255,159,10,0.95)",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {progress}%
      </span>
    )
  }
  if (status === "completed")
    return (
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          padding: "3px 8px",
          borderRadius: 20,
          background: "rgba(48,209,88,0.12)",
          color: "rgba(48,209,88,0.90)",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        ✓
      </span>
    )
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "3px 8px",
        borderRadius: 20,
        background: g2,
        color: t2,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      Nou
    </span>
  )
}

function FeaturedCard({ course }: { course: Course }) {
  const progColor = course.progress >= 50 ? "rgba(10,132,255,0.7)" : "rgba(255,159,10,0.8)"
  return (
    <Link href={`/learning/${course.id}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          borderRadius: 20,
          background: g1,
          border: `1px solid ${bd}`,
          overflow: "hidden",
          position: "relative",
          cursor: "pointer",
        }}
      >
        <Specular />
        <div
          style={{
            height: 110,
            background: `linear-gradient(135deg,rgba(255,255,255,0.05) 0%,rgba(255,255,255,0.10) 100%)`,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5,1fr)",
              gap: 4,
              padding: 14,
              width: "100%",
            }}
          >
            {[0.12, 0.06, 0.15, 0.08, 0.06, 0.06, 0.12, 0.06, 0.1, 0.14].map((o, i) => (
              <div
                key={i}
                style={{ height: 18, borderRadius: 4, background: `rgba(255,255,255,${o})` }}
              />
            ))}
          </div>
          <div
            style={{
              position: "absolute",
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(8px)",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="rgba(255,255,255,0.9)"
              stroke="none"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        </div>
        <div style={{ padding: "14px 16px 16px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "3px 8px",
              borderRadius: 6,
              background: "rgba(10,132,255,0.15)",
              color: "rgba(10,132,255,0.9)",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "rgba(10,132,255,0.9)",
                display: "inline-block",
              }}
            />
            Continuă Parcursul
          </div>
          <div
            style={{ fontSize: 16, fontWeight: 700, color: t1, marginBottom: 4, lineHeight: 1.3 }}
          >
            {course.title}
          </div>
          <div style={{ fontSize: 12, color: t2, marginBottom: 10 }}>{course.subtitle}</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ fontSize: 11, color: t3 }}>{course.durationLabel}</span>
              <span style={{ fontSize: 11, color: t3 }}>
                {course.currentModule}/{course.totalModules} module
              </span>
            </div>
            <StatusPill status={course.status} progress={course.progress} />
          </div>
          <ProgBar pct={course.progress} color={progColor} />
        </div>
      </div>
    </Link>
  )
}

function CourseRow({ course, showProgress }: { course: Course; showProgress: boolean }) {
  const isCompleted = course.status === "completed"
  const progColor = course.progress >= 50 ? "rgba(10,132,255,0.7)" : "rgba(255,159,10,0.8)"
  const leftBorder =
    showProgress && course.status === "in_progress"
      ? course.progress >= 50
        ? {
            borderLeft: "3px solid transparent",
            borderImage: "linear-gradient(180deg,rgba(10,132,255,0.9),rgba(10,132,255,0.4)) 1",
            paddingLeft: 13,
          }
        : {
            borderLeft: "3px solid transparent",
            borderImage: "linear-gradient(180deg,rgba(255,159,10,0.9),rgba(255,159,10,0.4)) 1",
            paddingLeft: 13,
          }
      : {}

  return (
    <Link href={`/learning/${course.id}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 14px",
          borderRadius: 16,
          background: g1,
          border: `1px solid ${bds}`,
          cursor: "pointer",
          position: "relative",
          ...leftBorder,
        }}
      >
        <Specular />
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: isCompleted ? "rgba(48,209,88,0.08)" : g2,
            border: `1px solid ${isCompleted ? "rgba(48,209,88,0.18)" : bd}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <CategoryIcon category={course.category} size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: t1,
              marginBottom: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {course.title}
          </div>
          <div style={{ fontSize: 12, color: isCompleted ? "rgba(48,209,88,0.7)" : t3 }}>
            {course.subtitle}
          </div>
          {showProgress && course.status === "in_progress" && (
            <ProgBar pct={course.progress} color={progColor} />
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <StatusPill status={course.status} progress={course.progress} />
          {course.hasCert && course.status === "new" && (
            <span style={{ fontSize: 9, color: "rgba(191,90,242,0.8)", fontWeight: 600 }}>
              🎓 Cert
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function AchievementRow({ ach }: { ach: Achievement }) {
  const isAmber = ach.colorType === "amber"
  const color = isAmber ? "rgba(255,159,10,0.9)" : "rgba(48,209,88,0.9)"
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 14,
        background: g1,
        border: `1px solid ${bds}`,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: g2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {isAmber ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="8" r="6" />
            <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
          </svg>
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t1, marginBottom: 2 }}>{ach.label}</div>
        <div style={{ fontSize: 11, color: t3 }}>{ach.detail}</div>
      </div>
      <div style={{ fontSize: 11, color: t3 }}>{ach.date}</div>
    </div>
  )
}

function SectionHeader({ label, action }: { label: string; action?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: t3,
        }}
      >
        {label}
      </div>
      {action && <span style={{ fontSize: 12, color: t3, cursor: "pointer" }}>{action}</span>}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div
      style={{
        borderRadius: 16,
        background: g1,
        border: `1px solid ${bds}`,
        padding: "12px 14px",
        display: "flex",
        gap: 12,
        alignItems: "center",
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 12, background: g2, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div
          style={{ height: 14, background: g2, borderRadius: 6, marginBottom: 6, width: "70%" }}
        />
        <div style={{ height: 11, background: g2, borderRadius: 5, width: "45%" }} />
      </div>
    </div>
  )
}

export function LearningListClient() {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterType>("Toate")
  const [fabOpen, setFabOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useCourses()
  const courses: Course[] = data?.courses ?? []
  const meta: LearningMeta | null = data?.meta ?? null
  const achievements: Achievement[] = data?.achievements ?? []
  const loading = isLoading

  const FILTERS: FilterType[] = ["Toate", "În Curs", "Recomandate", "Completate", "Salvate"]

  const featured =
    courses.find((c) => c.isFeatured) ?? courses.find((c) => c.status === "in_progress") ?? null

  const inProgressOther = courses.filter((c) => c.status === "in_progress" && !c.isFeatured)
  const newCourses = courses.filter((c) => c.status === "new")
  const completedCourses = courses.filter((c) => c.status === "completed")

  const filtered = (() => {
    let base = courses
    if (filter === "În Curs") base = courses.filter((c) => c.status === "in_progress")
    else if (filter === "Recomandate") base = courses.filter((c) => c.status === "new")
    else if (filter === "Completate") base = courses.filter((c) => c.status === "completed")
    else if (filter === "Salvate") base = courses.filter((c) => c.status === "saved")
    if (search)
      base = base.filter(
        (c) =>
          c.title.toLowerCase().includes(search.toLowerCase()) ||
          c.categoryLabel.toLowerCase().includes(search.toLowerCase())
      )
    return base
  })()

  const showAll = filter !== "Toate" || !!search

  return (
    <div style={{ paddingBottom: 120 }}>
      {/* header */}
      <div style={{ padding: "10px 16px 4px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 2,
          }}
        >
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: t1 }}>
            Centrul de Învățare
          </h1>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: g1,
              border: `1px solid ${bds}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke={t2}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
        </div>
        <p style={{ fontSize: 13, color: t2 }}>
          {meta
            ? `${meta.inProgressCount} cursuri active · ${meta.completedCount} finalizate`
            : "—"}
        </p>
      </div>

      {/* KPI strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 8,
          padding: "14px 16px 0",
        }}
      >
        {[
          {
            val: meta ? String(meta.completedCount) : "—",
            lbl: "Finalizate",
            color: "rgba(48,209,88,0.95)",
          },
          {
            val: meta ? String(meta.inProgressCount) : "—",
            lbl: "În Curs",
            color: "rgba(255,159,10,0.95)",
          },
          { val: meta ? `${meta.monthlyHours}h` : "—", lbl: "Luna Asta", color: t1 },
          {
            val: meta ? `${meta.avgScore}%` : "—",
            lbl: "Scor Mediu",
            color: "rgba(10,132,255,0.9)",
          },
        ].map((s) => (
          <div
            key={s.lbl}
            style={{
              padding: "10px 8px",
              borderRadius: 14,
              background: g1,
              border: `1px solid ${bds}`,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: s.color,
                marginBottom: 2,
                lineHeight: 1,
              }}
            >
              {s.val}
            </div>
            <div style={{ fontSize: 10, color: t3 }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* filter chips */}
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "14px 16px 0",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: "nowrap",
              cursor: "pointer",
              border: filter === f ? "none" : `1px solid ${bds}`,
              background: filter === f ? t1 : g1,
              color: filter === f ? "#000" : t2,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: "20px 16px 0", display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : showAll ? (
        <div style={{ padding: "20px 16px 0" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: t3, fontSize: 14 }}>
              Niciun curs găsit
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map((c) => (
                <CourseRow key={c.id} course={c} showProgress={true} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* featured */}
          {featured && (
            <div style={{ margin: "16px 16px 0" }}>
              <FeaturedCard course={featured} />
            </div>
          )}

          {/* continuă parcursul */}
          {inProgressOther.length > 0 && (
            <div style={{ padding: "20px 16px 0" }}>
              <SectionHeader label="Continuă Parcursul" />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {inProgressOther.map((c) => (
                  <CourseRow key={c.id} course={c} showProgress={true} />
                ))}
              </div>
            </div>
          )}

          {/* realizări */}
          {achievements.length > 0 && (
            <div style={{ padding: "18px 16px 0" }}>
              <SectionHeader label="Realizări Recente" />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {achievements.map((a) => (
                  <AchievementRow key={a.id} ach={a} />
                ))}
              </div>
            </div>
          )}

          {/* recomandate */}
          {newCourses.length > 0 && (
            <div style={{ padding: "18px 16px 0" }}>
              <SectionHeader label="Recomandate" action="Vezi toate" />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {newCourses.map((c) => (
                  <CourseRow key={c.id} course={c} showProgress={false} />
                ))}
              </div>
            </div>
          )}

          {/* completate */}
          {completedCourses.length > 0 && (
            <div style={{ padding: "18px 16px 0" }}>
              <SectionHeader label="Completate" action={`Vezi toate ${completedCourses.length}`} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {completedCourses.map((c) => (
                  <CourseRow key={c.id} course={c} showProgress={false} />
                ))}
              </div>
            </div>
          )}
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
        onClick={() => setFabOpen(true)}
        style={{
          position: "fixed",
          bottom: 100,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: g3,
          border: `1px solid ${bd}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          backdropFilter: "blur(32px)",
          cursor: "pointer",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </button>

      {/* FAB Sheet */}
      {fabOpen && (
        <div
          onClick={() => setFabOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(6px)",
            zIndex: 40,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 480,
              background: "rgba(28,28,30,0.92)",
              border: `1px solid ${bd}`,
              borderRadius: "28px 28px 0 0",
              overflow: "hidden",
              position: "relative",
              paddingBottom: 32,
              backdropFilter: "blur(48px)",
            }}
          >
            <Specular />
            <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: bd }} />
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: t1,
                textAlign: "center",
                padding: "4px 0 14px",
              }}
            >
              Caută & Acțiuni
            </div>

            {/* search */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 14,
                background: g2,
                border: `1px solid ${bd}`,
                margin: "0 16px 14px",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke={t3}
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setFabOpen(false)}
                placeholder="Caută în Centrul de Învățare…"
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  outline: "none",
                  fontSize: 14,
                  color: t1,
                  fontFamily: "inherit",
                }}
              />
            </div>

            {[
              {
                icon: (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(48,209,88,0.9)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                ),
                bg: "rgba(48,209,88,0.10)",
                border: "rgba(48,209,88,0.20)",
                label: "Curs Nou",
                color: "rgba(48,209,88,0.9)",
                onClick: () => { router.push("/learning/new") },
              },
              {
                icon: (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(10,132,255,0.9)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                ),
                bg: "rgba(10,132,255,0.12)",
                border: "rgba(10,132,255,0.20)",
                label: "Catalog Cursuri",
                color: "rgba(10,132,255,0.9)",
              },
              {
                icon: (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={t2}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                ),
                bg: g2,
                border: bd,
                label: "Export Raport",
                color: t1,
              },
            ].map((a) => (
              <div
                key={a.label}
                onClick={() => { setFabOpen(false); a.onClick?.() }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 20px",
                  borderBottom: `1px solid ${bds}`,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: a.bg,
                    border: `1px solid ${a.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {a.icon}
                </div>
                <span style={{ fontSize: 15, fontWeight: 600, color: a.color }}>{a.label}</span>
              </div>
            ))}

            <div style={{ height: 8 }} />
          </div>
        </div>
      )}
    </div>
  )
}
