"use client"

import { useState, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import type { CourseDetail, CourseModule } from "@/app/api/learning/[id]/route"
import type { CourseStatus, CourseCategory } from "@/app/api/learning/route"

const g1 = "var(--prv-g1)"
const g2 = "var(--prv-g2)"
const g3 = "var(--prv-g3)"
const bd = "var(--prv-border)"
const bds = "var(--prv-border-subtle)"
const t1 = "var(--prv-text-1)"
const t2 = "var(--prv-text-2)"
const t3 = "var(--prv-text-3)"
const t4 = "var(--prv-text-4)"

type LessonType = "video" | "text" | "quiz" | "document"

interface LessonItem {
  id: string
  title: string
  type: LessonType
  durationMinutes: number
  sortOrder: number
  moduleId: string | null
  moduleTitle: string | null
  completedByUser: boolean
}

interface CertificateInfo {
  id: string
  issuedAt: string
  expiresAt: string | null
  certificateUrl: string | null
}

interface QuizQuestion {
  id: string
  questionText: string
  sortOrder: number
  options: Array<{ id: string; text: string }>
}

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

function ProgBar({ pct, color, h = 4 }: { pct: number; color: string; h?: number }) {
  return (
    <div style={{ height: h, background: bd, borderRadius: h / 2, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: h / 2 }} />
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

function statusConfig(status: CourseStatus) {
  if (status === "in_progress")
    return {
      bg: "rgba(255,159,10,0.15)",
      color: "rgba(255,159,10,0.95)",
      dot: true,
      label: "In Progress",
    }
  if (status === "completed")
    return {
      bg: "rgba(48,209,88,0.12)",
      color: "rgba(48,209,88,0.9)",
      dot: true,
      label: "Completed",
    }
  return { bg: g2, color: t2, dot: false, label: "Nou" }
}

function ctaLabel(status: CourseStatus, currentModule: number): string {
  if (status === "in_progress") return `Continue Module ${currentModule}`
  if (status === "completed") return "Review Course"
  return "Start Course"
}

function ModuleItem({ mod }: { mod: CourseModule }) {
  const isDone = mod.status === "done"
  const isActive = mod.status === "active"
  const isLocked = mod.status === "locked"

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 16px",
        borderBottom: `1px solid ${bds}`,
        cursor: isLocked ? "default" : "pointer",
        opacity: isLocked ? 0.5 : 1,
        background: isActive ? "rgba(10,132,255,0.04)" : "transparent",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          background: isDone ? "rgba(48,209,88,0.12)" : isActive ? "rgba(10,132,255,0.12)" : g2,
          border: `1px solid ${
            isDone ? "rgba(48,209,88,0.25)" : isActive ? "rgba(10,132,255,0.3)" : bds
          }`,
        }}
      >
        {isDone ? (
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(48,209,88,0.9)"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : isActive ? (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="rgba(10,132,255,0.9)" stroke="none">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        ) : isLocked ? (
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke={t3}
            strokeWidth="2"
            strokeLinecap="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        ) : (
          <span style={{ fontSize: 10, fontWeight: 700, color: t3 }}>{mod.index}</span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: isDone ? t2 : isActive ? t1 : t3,
          }}
        >
          {mod.title}
        </div>
        {isActive && (
          <div style={{ fontSize: 10, color: "rgba(10,132,255,0.8)", marginTop: 2 }}>
            In progress · {mod.durationLabel} remaininge
          </div>
        )}
      </div>
      <span style={{ fontSize: 11, color: t3, marginRight: 4 }}>{mod.durationLabel}</span>
      {!isLocked && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isActive ? "rgba(10,132,255,0.7)" : t4}
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
    </div>
  )
}

function SectionCard({
  children,
  title,
  badge,
}: {
  children: React.ReactNode
  title: string
  badge?: string
}) {
  return (
    <div
      style={{
        margin: "14px 16px 0",
        borderRadius: 18,
        background: g1,
        border: `1px solid ${bds}`,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Specular />
      <div
        style={{
          padding: "14px 16px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${bds}`,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: t1 }}>{title}</span>
        {badge && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 10,
              background: g2,
              color: t2,
            }}
          >
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function SkeletonHero() {
  return (
    <div style={{ padding: "16px 16px 14px" }}>
      <div
        style={{ height: 12, background: g2, borderRadius: 6, width: "40%", marginBottom: 12 }}
      />
      <div style={{ height: 24, background: g2, borderRadius: 8, width: "80%", marginBottom: 8 }} />
      <div
        style={{ height: 12, background: g2, borderRadius: 6, width: "55%", marginBottom: 16 }}
      />
      <div style={{ height: 6, background: g2, borderRadius: 3 }} />
    </div>
  )
}

function LessonTypeIcon({ type }: { type: LessonType }) {
  const stroke = t2
  if (type === "video")
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" />
      </svg>
    )
  if (type === "quiz")
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    )
  if (type === "document")
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    )
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

function LessonRow({
  lesson,
  onOpen,
}: {
  lesson: LessonItem
  onOpen: (lesson: LessonItem) => void
}) {
  return (
    <div
      onClick={() => onOpen(lesson)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 16px",
        borderBottom: `1px solid ${bds}`,
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          background: lesson.completedByUser ? "rgba(48,209,88,0.10)" : g2,
          border: `1px solid ${lesson.completedByUser ? "rgba(48,209,88,0.22)" : bds}`,
        }}
      >
        <LessonTypeIcon type={lesson.type} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: lesson.completedByUser ? t2 : t1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {lesson.title}
        </div>
        <div style={{ fontSize: 10, color: t3, marginTop: 2 }}>
          {lesson.type === "quiz"
            ? "Chestionar"
            : lesson.type === "video"
              ? "Video"
              : lesson.type === "document"
                ? "Document"
                : "Text"}
          {lesson.durationMinutes > 0 && ` · ${lesson.durationMinutes} min`}
        </div>
      </div>
      {lesson.completedByUser ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(48,209,88,0.8)"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke={t4}
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
    </div>
  )
}

function LessonsTab({
  courseId,
  lessons,
  loading,
  onOpenLesson,
}: {
  courseId: string
  lessons: LessonItem[]
  loading: boolean
  onOpenLesson: (lesson: LessonItem) => void
}) {
  void courseId

  if (loading) {
    return (
      <div
        style={{
          margin: "14px 16px 0",
          borderRadius: 18,
          background: g1,
          border: `1px solid ${bds}`,
          padding: "16px",
        }}
      >
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: g2 }} />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  height: 12,
                  background: g2,
                  borderRadius: 6,
                  width: "70%",
                  marginBottom: 6,
                }}
              />
              <div style={{ height: 10, background: g2, borderRadius: 5, width: "40%" }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (lessons.length === 0) {
    return (
      <div
        style={{
          margin: "14px 16px 0",
          borderRadius: 18,
          background: g1,
          border: `1px solid ${bds}`,
          padding: "24px 16px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 13, color: t3 }}>Nicio lecție disponibilă</div>
      </div>
    )
  }

  const grouped = new Map<string, { title: string | null; lessons: LessonItem[] }>()
  for (const lesson of lessons) {
    const key = lesson.moduleId ?? "__none__"
    if (!grouped.has(key)) {
      grouped.set(key, { title: lesson.moduleTitle, lessons: [] })
    }
    grouped.get(key)!.lessons.push(lesson)
  }

  return (
    <>
      {Array.from(grouped.entries()).map(([key, group]) => (
        <SectionCard
          key={key}
          title={group.title ?? "Lecții"}
          badge={`${group.lessons.filter((l) => l.completedByUser).length}/${group.lessons.length}`}
        >
          {group.lessons.map((lesson) => (
            <LessonRow key={lesson.id} lesson={lesson} onOpen={onOpenLesson} />
          ))}
        </SectionCard>
      ))}
    </>
  )
}

function LessonSheet({
  lesson,
  courseId,
  onClose,
}: {
  lesson: LessonItem
  courseId: string
  onClose: () => void
}) {
  const { data: quizData, isLoading: quizLoading } = useQuery({
    queryKey: ["lesson-quiz", courseId, lesson.id],
    queryFn: () =>
      fetch(`/api/learning/${courseId}/lessons/${lesson.id}/quiz`).then(
        (r) => r.json() as Promise<{ questions: QuizQuestion[] }>
      ),
    enabled: lesson.type === "quiz",
  })
  const quizQuestions = quizData?.questions ?? []
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({})
  const [quizResult, setQuizResult] = useState<{
    score: number
    status: "passed" | "failed"
    correctAnswers: number
    totalQuestions: number
    answers: Record<string, { correct: boolean; correctOptionId: string; explanation?: string }>
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(lesson.completedByUser)

  function handleMarkComplete() {
    setCompleting(true)
    fetch(`/api/learning/${courseId}/lessons/${lesson.id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then((r) => r.json())
      .then(() => setCompleted(true))
      .finally(() => setCompleting(false))
  }

  function handleSubmitQuiz() {
    setSubmitting(true)
    fetch(`/api/learning/${courseId}/lessons/${lesson.id}/quiz/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: quizAnswers }),
    })
      .then((r) => r.json())
      .then((d) => {
        setQuizResult(d)
        if (d.status === "passed") setCompleted(true)
      })
      .finally(() => setSubmitting(false))
  }

  const typeLabel =
    lesson.type === "quiz"
      ? "Chestionar"
      : lesson.type === "video"
        ? "Video"
        : lesson.type === "document"
          ? "Document"
          : "Text"

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
        zIndex: 50,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "85vh",
          background: "rgba(18,18,20,0.95)",
          border: `1px solid ${bd}`,
          borderRadius: "28px 28px 0 0",
          overflow: "hidden",
          position: "relative",
          backdropFilter: "blur(48px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Specular />
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: bd }} />
        </div>

        <div style={{ padding: "0 20px 12px", borderBottom: `1px solid ${bds}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 10,
                background: g2,
                color: t3,
              }}
            >
              {typeLabel}
            </span>
            {completed && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 10,
                  background: "rgba(48,209,88,0.12)",
                  color: "rgba(48,209,88,0.85)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Completat
              </span>
            )}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: t1, lineHeight: 1.3 }}>
            {lesson.title}
          </div>
          {lesson.durationMinutes > 0 && (
            <div style={{ fontSize: 11, color: t3, marginTop: 4 }}>
              {lesson.durationMinutes} min
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {lesson.type === "quiz" ? (
            quizLoading ? (
              <div style={{ color: t3, fontSize: 13 }}>Se încarcă...</div>
            ) : quizResult ? (
              <div>
                <div
                  style={{
                    padding: "16px",
                    borderRadius: 14,
                    background:
                      quizResult.status === "passed"
                        ? "rgba(48,209,88,0.08)"
                        : "rgba(255,69,58,0.08)",
                    border: `1px solid ${quizResult.status === "passed" ? "rgba(48,209,88,0.2)" : "rgba(255,69,58,0.18)"}`,
                    marginBottom: 16,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 32,
                      fontWeight: 800,
                      color:
                        quizResult.status === "passed"
                          ? "rgba(48,209,88,0.9)"
                          : "rgba(255,69,58,0.9)",
                      marginBottom: 4,
                    }}
                  >
                    {quizResult.score}%
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color:
                        quizResult.status === "passed"
                          ? "rgba(48,209,88,0.8)"
                          : "rgba(255,69,58,0.8)",
                    }}
                  >
                    {quizResult.status === "passed" ? "Felicitări! Test trecut" : "Test nepromovat"}
                  </div>
                  <div style={{ fontSize: 12, color: t3, marginTop: 4 }}>
                    {quizResult.correctAnswers}/{quizResult.totalQuestions} răspunsuri corecte
                  </div>
                </div>
                {quizResult.status === "failed" && (
                  <button
                    onClick={() => {
                      setQuizResult(null)
                      setQuizAnswers({})
                    }}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: 14,
                      fontSize: 14,
                      fontWeight: 700,
                      border: `1px solid ${bd}`,
                      background: g2,
                      color: t1,
                      cursor: "pointer",
                    }}
                  >
                    Încearcă din nou
                  </button>
                )}
              </div>
            ) : (
              <div>
                {quizQuestions.map((q, qi) => (
                  <div key={q.id} style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: t1, marginBottom: 10 }}>
                      {qi + 1}. {q.questionText}
                    </div>
                    {q.options.map((opt) => {
                      const selected = quizAnswers[q.id] === opt.id
                      return (
                        <div
                          key={opt.id}
                          onClick={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: opt.id }))}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 12px",
                            borderRadius: 12,
                            marginBottom: 6,
                            cursor: "pointer",
                            background: selected ? "rgba(10,132,255,0.10)" : g2,
                            border: `1px solid ${selected ? "rgba(10,132,255,0.3)" : bds}`,
                          }}
                        >
                          <div
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: "50%",
                              border: `2px solid ${selected ? "rgba(10,132,255,0.7)" : bds}`,
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {selected && (
                              <div
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  background: "rgba(10,132,255,0.9)",
                                }}
                              />
                            )}
                          </div>
                          <span style={{ fontSize: 13, color: selected ? t1 : t2 }}>
                            {opt.text}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ))}
                {quizQuestions.length > 0 && (
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={submitting || Object.keys(quizAnswers).length < quizQuestions.length}
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: 14,
                      fontSize: 14,
                      fontWeight: 700,
                      border: "none",
                      background:
                        Object.keys(quizAnswers).length < quizQuestions.length
                          ? "rgba(255,255,255,0.15)"
                          : "rgba(255,255,255,0.95)",
                      color: Object.keys(quizAnswers).length < quizQuestions.length ? t3 : "#000",
                      cursor:
                        Object.keys(quizAnswers).length < quizQuestions.length
                          ? "not-allowed"
                          : "pointer",
                      marginTop: 8,
                    }}
                  >
                    {submitting ? "Se trimite..." : "Trimite răspunsurile"}
                  </button>
                )}
              </div>
            )
          ) : (
            <div style={{ fontSize: 14, color: t2, lineHeight: 1.7 }}>
              {lesson.type === "video" ? (
                <div
                  style={{
                    aspectRatio: "16/9",
                    background: g2,
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `1px solid ${bds}`,
                  }}
                >
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="rgba(255,255,255,0.3)"
                    stroke="none"
                  >
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
              ) : (
                <div style={{ color: t3, fontSize: 13, textAlign: "center", paddingTop: 24 }}>
                  Conținut lecție disponibil după accesare
                </div>
              )}
            </div>
          )}
        </div>

        {lesson.type !== "quiz" && !completed && (
          <div style={{ padding: "12px 20px", borderTop: `1px solid ${bds}` }}>
            <button
              onClick={handleMarkComplete}
              disabled={completing}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 14,
                fontSize: 14,
                fontWeight: 700,
                border: "none",
                background: "rgba(255,255,255,0.95)",
                color: "#000",
                cursor: completing ? "not-allowed" : "pointer",
                opacity: completing ? 0.7 : 1,
              }}
            >
              {completing ? "Se marchează..." : "Marchează ca finalizat"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function CertificateSection({ courseId, completed }: { courseId: string; completed: boolean }) {
  const [cert, setCert] = useState<CertificateInfo | null>(null)
  const [certLoading, setCertLoading] = useState(false)

  useEffect(() => {
    if (completed) {
      fetch(`/api/learning/${courseId}/certificate`)
        .then((r) => r.json())
        .then((d) => setCert(d.certificate ?? null))
    }
  }, [courseId, completed])

  function handleDownload() {
    if (cert?.certificateUrl) window.open(cert.certificateUrl, "_blank")
  }

  function handleGenerate() {
    setCertLoading(true)
    fetch(`/api/learning/${courseId}/certificate`, { method: "POST" })
      .then((r) => r.json())
      .then((d) => setCert(d.certificate ?? null))
      .finally(() => setCertLoading(false))
  }

  if (!completed) return null

  return (
    <div
      style={{
        margin: "14px 16px 0",
        padding: "14px 16px",
        borderRadius: 16,
        background: "rgba(48,209,88,0.06)",
        border: "1px solid rgba(48,209,88,0.18)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Specular />
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "rgba(48,209,88,0.10)",
            border: "1px solid rgba(48,209,88,0.2)",
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
            stroke="rgba(48,209,88,0.8)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="8" r="6" />
            <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t1, marginBottom: 2 }}>
            Certificat de Finalizare
          </div>
          {cert ? (
            <div style={{ fontSize: 11, color: "rgba(48,209,88,0.7)" }}>
              Emis la{" "}
              {new Date(cert.issuedAt).toLocaleDateString("ro-RO", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: t3 }}>Generați certificatul de finalizare</div>
          )}
        </div>
        {cert ? (
          <button
            onClick={handleDownload}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              border: "1px solid rgba(48,209,88,0.25)",
              background: "rgba(48,209,88,0.10)",
              color: "rgba(48,209,88,0.9)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Descarcă
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={certLoading}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              border: "1px solid rgba(48,209,88,0.25)",
              background: "rgba(48,209,88,0.10)",
              color: "rgba(48,209,88,0.9)",
              cursor: certLoading ? "not-allowed" : "pointer",
              opacity: certLoading ? 0.6 : 1,
            }}
          >
            {certLoading ? "..." : "Generează"}
          </button>
        )}
      </div>
    </div>
  )
}

type TabId = "modules" | "lessons" | "about"

export function CourseDetailClient({ id }: { id: string }) {
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [fabOpen, setFabOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>("modules")
  const [openLesson, setOpenLesson] = useState<LessonItem | null>(null)
  const queryClient = useQueryClient()

  const { data: lessonsData, isLoading: lessonsLoading } = useQuery({
    queryKey: ["course-lessons", id],
    queryFn: () =>
      fetch(`/api/learning/${id}/lessons`).then(
        (r) => r.json() as Promise<{ lessons: LessonItem[] }>
      ),
    enabled: activeTab === "lessons",
  })
  const lessons = lessonsData?.lessons ?? []

  useEffect(() => {
    fetch(`/api/learning/${id}`)
      .then((r) => r.json())
      .then(setCourse)
      .finally(() => setLoading(false))
  }, [id])

  function handleLessonComplete(lessonId: string) {
    queryClient.setQueryData<{ lessons: LessonItem[] }>(["course-lessons", id], (prev) =>
      prev
        ? {
            lessons: prev.lessons.map((l) =>
              l.id === lessonId ? { ...l, completedByUser: true } : l
            ),
          }
        : prev
    )
  }

  const isActionable = course?.status === "in_progress" || course?.status === "new"

  const progColor =
    course && course.progress >= 50 ? "rgba(10,132,255,0.7)" : "rgba(255,159,10,0.8)"

  const doneCount = course ? course.modules.filter((m) => m.status === "done").length : 0

  const sc = course ? statusConfig(course.status) : null

  const initials = course
    ? course.instructorName
        .split(" ")
        .map((w) => w[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "—"

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "modules", label: "Module" },
    { id: "lessons", label: "Lecții" },
    { id: "about", label: "Despre" },
  ]

  void isActionable
  void CategoryIcon

  return (
    <div style={{ paddingBottom: 120 }}>
      <Link
        href="/learning"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "14px 16px 0",
          textDecoration: "none",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={t2}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span style={{ fontSize: 14, color: t2 }}>Learning Center</span>
      </Link>

      {loading || !course ? (
        <SkeletonHero />
      ) : (
        <>
          <div style={{ padding: "16px 16px 14px" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {sc && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 9px",
                    borderRadius: 20,
                    fontSize: 10,
                    fontWeight: 700,
                    background: sc.bg,
                    color: sc.color,
                  }}
                >
                  {sc.dot && (
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: sc.color,
                        display: "inline-block",
                      }}
                    />
                  )}
                  {sc.label}
                </span>
              )}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "3px 9px",
                  borderRadius: 20,
                  fontSize: 10,
                  fontWeight: 700,
                  background: g2,
                  color: t2,
                }}
              >
                {course.categoryLabel}
              </span>
              {course.hasCert && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 9px",
                    borderRadius: 20,
                    fontSize: 10,
                    fontWeight: 700,
                    background: "rgba(191,90,242,0.12)",
                    color: "rgba(191,90,242,0.85)",
                  }}
                >
                  <svg
                    width="9"
                    height="9"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  >
                    <polyline points="22 4 12 14.01 9 11.01" />
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  </svg>
                  Certificat
                </span>
              )}
            </div>

            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: t1,
                lineHeight: 1.25,
                marginBottom: 8,
              }}
            >
              {course.title}
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <div
                style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: t2 }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                {course.durationLabel}
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: t2 }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                {course.totalModules} module
              </div>
              {course.rating > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    color: t2,
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  {course.rating} · {course.reviewCount} recenzii
                </div>
              )}
            </div>

            {course.status !== "new" && (
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 11, color: t3 }}>Progres</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color:
                        course.status === "completed"
                          ? "rgba(48,209,88,0.9)"
                          : "rgba(255,159,10,0.95)",
                    }}
                  >
                    {course.progress}% completat
                  </span>
                </div>
                <ProgBar
                  pct={course.progress}
                  color={course.status === "completed" ? "rgba(48,209,88,0.7)" : progColor}
                  h={6}
                />
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, padding: "0 16px 4px" }}>
            <button
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 16,
                fontSize: 14,
                fontWeight: 700,
                border: `1px solid ${bd}`,
                background: g2,
                color: t1,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Offline
            </button>
            <button
              style={{
                flex: 2,
                padding: 14,
                borderRadius: 16,
                fontSize: 15,
                fontWeight: 700,
                border: "none",
                background: "rgba(255,255,255,0.95)",
                color: "#000",
                cursor: "pointer",
              }}
            >
              {ctaLabel(course.status, course.currentModule)}
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: 4,
              padding: "12px 16px 0",
              borderBottom: `1px solid ${bds}`,
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: "8px 4px",
                  fontSize: 12,
                  fontWeight: 700,
                  border: "none",
                  background: "transparent",
                  color: activeTab === tab.id ? t1 : t3,
                  cursor: "pointer",
                  borderBottom: `2px solid ${activeTab === tab.id ? "rgba(255,255,255,0.8)" : "transparent"}`,
                  marginBottom: -1,
                  transition: "color 0.15s",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "modules" && (
            <SectionCard title="Module" badge={`${doneCount}/${course.totalModules} completate`}>
              {course.modules.map((m) => (
                <ModuleItem key={m.id} mod={m} />
              ))}
            </SectionCard>
          )}

          {activeTab === "lessons" && (
            <LessonsTab
              courseId={id}
              lessons={lessons}
              loading={lessonsLoading}
              onOpenLesson={(lesson) => setOpenLesson(lesson)}
            />
          )}

          {activeTab === "about" && (
            <>
              {course.hasCert && (
                <CertificateSection courseId={id} completed={course.status === "completed"} />
              )}
              <SectionCard title="Despre Curs">
                <div style={{ padding: "12px 16px" }}>
                  {course.description && (
                    <p
                      style={{
                        fontSize: 13,
                        color: t2,
                        lineHeight: 1.6,
                        marginBottom: 12,
                      }}
                    >
                      {course.description}
                    </p>
                  )}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 12,
                      background: g2,
                      border: `1px solid ${bds}`,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "rgba(10,132,255,0.15)",
                        border: "1px solid rgba(10,132,255,0.25)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{ fontSize: 12, fontWeight: 700, color: "rgba(10,132,255,0.9)" }}
                      >
                        {initials}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>
                        {course.instructorName}
                      </div>
                      <div style={{ fontSize: 11, color: t3 }}>
                        Instructor Certificat · {course.categoryLabel}
                      </div>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          <div style={{ height: 16 }} />
        </>
      )}

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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)" stroke="none">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

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
                padding: "4px 0 16px",
              }}
            >
              Course Actions
            </div>

            {[
              {
                icon: (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={t1}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                  </svg>
                ),
                bg: "rgba(255,255,255,0.08)",
                border: "rgba(255,255,255,0.12)",
                label: "Save to Favorites",
                color: t1,
                show: true,
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
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                ),
                bg: "rgba(10,132,255,0.12)",
                border: "rgba(10,132,255,0.2)",
                label: "Share Course",
                color: "rgba(10,132,255,0.9)",
                show: true,
              },
              {
                icon: (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(255,159,10,0.9)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                ),
                bg: "rgba(255,159,10,0.12)",
                border: "rgba(255,159,10,0.2)",
                label: "Download pentru Offline",
                color: "rgba(255,159,10,0.9)",
                show: true,
              },
              {
                icon: (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={course?.status === "completed" ? t1 : t3}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="8" r="6" />
                    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                  </svg>
                ),
                bg: g2,
                border: bds,
                label: "View Certificate",
                color: course?.status === "completed" ? t1 : t3,
                show: course?.hasCert ?? false,
                note: course?.status !== "completed" ? "after completion" : undefined,
              },
              {
                icon: (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(255,69,58,0.9)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                ),
                bg: "rgba(255,69,58,0.10)",
                border: "rgba(255,69,58,0.18)",
                label: "Archive",
                color: "rgba(255,69,58,0.9)",
                show: true,
              },
            ]
              .filter((a) => a.show)
              .map((a, idx, arr) => (
                <div
                  key={a.label}
                  onClick={() => setFabOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 20px",
                    borderBottom: idx < arr.length - 1 ? `1px solid ${bds}` : "none",
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
                  <span style={{ fontSize: 15, fontWeight: 600, color: a.color, flex: 1 }}>
                    {a.label}
                  </span>
                  {a.note && (
                    <span
                      style={{
                        fontSize: 10,
                        color: t4,
                        padding: "2px 7px",
                        borderRadius: 8,
                        background: g1,
                      }}
                    >
                      {a.note}
                    </span>
                  )}
                </div>
              ))}

            <div style={{ height: 8 }} />
          </div>
        </div>
      )}

      {openLesson && (
        <LessonSheet
          lesson={openLesson}
          courseId={id}
          onClose={() => {
            handleLessonComplete(openLesson.id)
            setOpenLesson(null)
          }}
        />
      )}
    </div>
  )
}
