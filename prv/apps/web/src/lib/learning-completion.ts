// Learning completion — Learning Center analytics (roadmap Phase 20). Pure +
// unit-tested.
//
// Rolls course enrollments up into a completion picture: the enrollment status
// mix, an overall completion rate and average progress, and a per-course
// breakdown so a training lead sees which courses land and which stall.

export type EnrollmentStatus = "new" | "in_progress" | "completed" | "saved"

export interface EnrollmentInput {
  courseId: string
  courseTitle: string
  status: EnrollmentStatus
  progressPct: number
}

export interface CourseCompletion {
  courseId: string
  title: string
  enrolled: number
  completed: number
  completionRatePct: number // completed / enrolled
  avgProgressPct: number
}

export interface LearningCompletion {
  totalEnrollments: number
  byStatus: Record<EnrollmentStatus, number>
  completed: number
  inProgress: number
  completionRatePct: number | null // completed / total
  avgProgressPct: number | null
  courses: CourseCompletion[] // by enrolment count, largest first
}

function clampPct(n: number): number {
  const v = Number.isFinite(n) ? n : 0
  return Math.max(0, Math.min(100, v))
}
function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Aggregate course enrollments into overall + per-course completion. */
export function computeLearningCompletion(enrollments: EnrollmentInput[]): LearningCompletion {
  const byStatus: Record<EnrollmentStatus, number> = {
    new: 0,
    in_progress: 0,
    completed: 0,
    saved: 0,
  }
  let progressSum = 0

  interface Acc {
    title: string
    enrolled: number
    completed: number
    progressSum: number
  }
  const byCourse = new Map<string, Acc>()

  for (const e of enrollments) {
    if (e.status in byStatus) byStatus[e.status] += 1
    const pct = clampPct(e.progressPct)
    progressSum += pct

    let a = byCourse.get(e.courseId)
    if (!a) {
      a = { title: e.courseTitle, enrolled: 0, completed: 0, progressSum: 0 }
      byCourse.set(e.courseId, a)
    }
    a.enrolled += 1
    a.progressSum += pct
    if (e.status === "completed") a.completed += 1
  }

  const total = enrollments.length
  const courses: CourseCompletion[] = [...byCourse.entries()]
    .map(([courseId, a]) => ({
      courseId,
      title: a.title,
      enrolled: a.enrolled,
      completed: a.completed,
      completionRatePct: a.enrolled > 0 ? round1((a.completed / a.enrolled) * 100) : 0,
      avgProgressPct: a.enrolled > 0 ? round1(a.progressSum / a.enrolled) : 0,
    }))
    .sort((x, y) => y.enrolled - x.enrolled || x.title.localeCompare(y.title))

  return {
    totalEnrollments: total,
    byStatus,
    completed: byStatus.completed,
    inProgress: byStatus.in_progress,
    completionRatePct: total > 0 ? round1((byStatus.completed / total) * 100) : null,
    avgProgressPct: total > 0 ? round1(progressSum / total) : null,
    courses,
  }
}
