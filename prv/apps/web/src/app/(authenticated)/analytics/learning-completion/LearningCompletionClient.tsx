"use client"

import { useLearningCompletion, type LearningCompletionResponse } from "@/lib/api-hooks"

type Course = LearningCompletionResponse["courses"][number]

const STATUS_ROWS: { key: "completed" | "in_progress" | "new" | "saved"; label: string }[] = [
  { key: "completed", label: "Completed" },
  { key: "in_progress", label: "In progress" },
  { key: "new", label: "New" },
  { key: "saved", label: "Saved" },
]

function Tile({
  label,
  value,
  suffix,
}: {
  label: string
  value: React.ReactNode
  suffix?: string
}) {
  return (
    <div
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border)",
        borderRadius: 18,
        padding: "15px 17px",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      <div
        style={{
          color: "var(--prv-text-3)",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          fontWeight: 560,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 23, fontWeight: 680, marginTop: 8, letterSpacing: "-0.02em" }}>
        {value}
        {suffix && (
          <span style={{ fontSize: 13, color: "var(--prv-text-3)", fontWeight: 560 }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

const GRID = "1.8fr 0.8fr 0.9fr 0.9fr"

export function LearningCompletionClient() {
  const { data, isLoading } = useLearningCompletion()
  const byStatus = data?.byStatus ?? { new: 0, in_progress: 0, completed: 0, saved: 0 }
  const maxStatus = Math.max(1, ...STATUS_ROWS.map((r) => byStatus[r.key]))
  const courses: Course[] = data?.courses ?? []

  return (
    <div style={{ maxWidth: 840, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>
        Learning Completion
      </h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Analytics · learning center · course completion
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          margin: "24px 0",
        }}
      >
        <Tile
          label="Completion"
          value={data?.completionRatePct ?? "—"}
          suffix={data?.completionRatePct != null ? "%" : undefined}
        />
        <Tile
          label="Avg progress"
          value={data?.avgProgressPct ?? "—"}
          suffix={data?.avgProgressPct != null ? "%" : undefined}
        />
        <Tile label="In progress" value={data?.inProgress ?? 0} />
        <Tile label="Enrollments" value={data?.totalEnrollments ?? 0} />
      </div>

      {isLoading && <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading…</div>}
      {!isLoading && (data?.totalEnrollments ?? 0) === 0 && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>No course enrollments yet.</div>
      )}

      {(data?.totalEnrollments ?? 0) > 0 && (
        <>
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border)",
              borderRadius: 22,
              padding: "18px 20px",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--prv-text-3)",
                fontWeight: 560,
                marginBottom: 14,
              }}
            >
              Status mix
            </h2>
            {STATUS_ROWS.map((r) => {
              const count = byStatus[r.key]
              const pct = Math.max(count > 0 ? 5 : 0, (count / maxStatus) * 100)
              return (
                <div
                  key={r.key}
                  style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0" }}
                >
                  <div style={{ width: 96, fontSize: 13, color: "var(--prv-text-2)" }}>
                    {r.label}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      borderRadius: 99,
                      background: "var(--prv-g3)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 99,
                        background: "rgba(255,255,255,0.5)",
                        width: `${pct}%`,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      width: 22,
                      textAlign: "right",
                      fontSize: 13,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {count}
                  </div>
                </div>
              )
            })}
          </div>

          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border)",
              borderRadius: 22,
              padding: "8px 8px 4px",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: GRID,
                gap: 10,
                padding: "12px 16px",
                color: "var(--prv-text-3)",
                fontSize: 10.5,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 560,
                borderBottom: "1px solid var(--prv-border-subtle)",
              }}
            >
              <div>Course</div>
              <div style={{ textAlign: "right" }}>Enrolled</div>
              <div style={{ textAlign: "right" }}>Completion</div>
              <div style={{ textAlign: "right" }}>Avg progress</div>
            </div>
            {courses.map((c, i) => (
              <div
                key={c.courseId}
                style={{
                  display: "grid",
                  gridTemplateColumns: GRID,
                  gap: 10,
                  alignItems: "center",
                  padding: "12px 16px",
                  borderBottom:
                    i < courses.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
                  fontSize: 13.5,
                }}
              >
                <div style={{ fontWeight: 560, minWidth: 0 }}>{c.title}</div>
                <div
                  style={{ fontVariantNumeric: "tabular-nums", textAlign: "right", fontSize: 13 }}
                >
                  {c.enrolled}
                </div>
                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      display: "inline-block",
                      minWidth: 44,
                      textAlign: "center",
                      fontSize: 12,
                      fontVariantNumeric: "tabular-nums",
                      border: "1px solid var(--prv-border)",
                      borderRadius: 99,
                      padding: "2px 8px",
                    }}
                  >
                    {c.completionRatePct}%
                  </span>
                </div>
                <div
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    textAlign: "right",
                    fontSize: 13,
                    color: "var(--prv-text-2)",
                  }}
                >
                  {c.avgProgressPct}%
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
