// Seed: learning courses with enrollments and achievements
import { db } from "../client"
import { learningCourses, courseEnrollments, userAchievements } from "../schema/learning"

export interface LearningSeedResult {
  courseIds: string[]
}

export async function seedLearning(opts: {
  companyId: string
  managerId: string
  supervisorId: string
  workerIds: string[]
}): Promise<LearningSeedResult> {
  console.log("  → Seeding learning courses...")

  const { companyId, managerId, supervisorId, workerIds } = opts
  const [worker1Id, worker2Id, worker3Id] = workerIds

  const courseDefs = [
    {
      instructorUserId: managerId,
      title: "Securitate și Sănătate în Muncă — Construcții",
      subtitle:
        "Curs obligatoriu pentru toți angajații de pe șantier. Acoperă normele SSM aplicabile lucrărilor de renovare.",
      category: "safety" as const,
      totalModules: 6,
      durationMinutes: 120,
      hasCert: true,
      isFeatured: true,
      isActive: true,
      rating: 4.7,
      reviewCount: 12,
    },
    {
      instructorUserId: managerId,
      title: "Leadership pentru Supraveghetori de Șantier",
      subtitle:
        "Cum să coordonezi eficient o echipă de lucrători: comunicare, delegare, rezolvare conflicte.",
      category: "leadership" as const,
      totalModules: 4,
      durationMinutes: 90,
      hasCert: false,
      isFeatured: true,
      isActive: true,
      rating: 4.5,
      reviewCount: 5,
    },
    {
      instructorUserId: managerId,
      title: "Utilizare PRV — Curs Complet pentru Angajați",
      subtitle:
        "Toate funcționalitățile PRV explicate pas cu pas: pontaj, rapoarte, cereri materiale, comunicare.",
      category: "digital" as const,
      totalModules: 8,
      durationMinutes: 180,
      hasCert: true,
      isFeatured: false,
      isActive: true,
      rating: 4.8,
      reviewCount: 18,
    },
    {
      instructorUserId: managerId,
      title: "Citirea Planurilor și Devizelor de Construcție",
      subtitle:
        "Cum să interpretezi planurile arhitecturale și să folosești devizele pentru estimare corectă.",
      category: "renovation" as const,
      totalModules: 5,
      durationMinutes: 150,
      hasCert: false,
      isFeatured: false,
      isActive: true,
      rating: 4.3,
      reviewCount: 7,
    },
    {
      instructorUserId: managerId,
      title: "Reglementări GDPR pentru Companii",
      subtitle:
        "Obligațiile companiei și ale angajaților privind protecția datelor cu caracter personal.",
      category: "compliance" as const,
      totalModules: 3,
      durationMinutes: 60,
      hasCert: true,
      isFeatured: false,
      isActive: true,
      rating: 4.1,
      reviewCount: 9,
    },
  ]

  const courseIds: string[] = []

  for (const c of courseDefs) {
    const [record] = await db
      .insert(learningCourses)
      .values({ companyId, ...c })
      .returning({ id: learningCourses.id })
    if (record) courseIds.push(record.id)
  }

  // ── Enrollments ────────────────────────────────────────────────────────────
  const enrollmentDefs: Array<{
    courseIdx: number
    userId: string
    status: "new" | "in_progress" | "completed" | "saved"
    progressPct: number
    currentModule: number
    completedAt?: Date
  }> = [
    // SSM course — all completed
    {
      courseIdx: 0,
      userId: supervisorId,
      status: "completed",
      progressPct: 100,
      currentModule: 6,
      completedAt: new Date("2025-02-15"),
    },
    {
      courseIdx: 0,
      userId: worker1Id,
      status: "completed",
      progressPct: 100,
      currentModule: 6,
      completedAt: new Date("2025-02-18"),
    },
    {
      courseIdx: 0,
      userId: worker2Id,
      status: "completed",
      progressPct: 100,
      currentModule: 6,
      completedAt: new Date("2025-02-20"),
    },
    {
      courseIdx: 0,
      userId: worker3Id,
      status: "completed",
      progressPct: 100,
      currentModule: 6,
      completedAt: new Date("2025-02-22"),
    },
    // Leadership — supervisor in progress
    {
      courseIdx: 1,
      userId: supervisorId,
      status: "in_progress",
      progressPct: 50,
      currentModule: 2,
    },
    {
      courseIdx: 1,
      userId: managerId,
      status: "completed",
      progressPct: 100,
      currentModule: 4,
      completedAt: new Date("2025-03-01"),
    },
    // PRV course — mixed
    {
      courseIdx: 2,
      userId: worker1Id,
      status: "completed",
      progressPct: 100,
      currentModule: 8,
      completedAt: new Date("2025-03-10"),
    },
    { courseIdx: 2, userId: worker2Id, status: "in_progress", progressPct: 62, currentModule: 5 },
    { courseIdx: 2, userId: worker3Id, status: "new", progressPct: 0, currentModule: 0 },
    {
      courseIdx: 2,
      userId: supervisorId,
      status: "completed",
      progressPct: 100,
      currentModule: 8,
      completedAt: new Date("2025-03-08"),
    },
    // GDPR — manager + supervisor completed
    {
      courseIdx: 4,
      userId: managerId,
      status: "completed",
      progressPct: 100,
      currentModule: 3,
      completedAt: new Date("2025-01-20"),
    },
    {
      courseIdx: 4,
      userId: supervisorId,
      status: "completed",
      progressPct: 100,
      currentModule: 3,
      completedAt: new Date("2025-01-25"),
    },
  ]

  for (const e of enrollmentDefs) {
    if (!courseIds[e.courseIdx]) continue
    await db
      .insert(courseEnrollments)
      .values({
        courseId: courseIds[e.courseIdx],
        userId: e.userId,
        companyId,
        status: e.status,
        progressPct: e.progressPct,
        currentModule: e.currentModule,
        completedAt: e.completedAt,
      })
      .onConflictDoNothing()
  }

  // ── Achievements ───────────────────────────────────────────────────────────
  const achievementDefs = [
    {
      userId: worker1Id,
      label: "SSM Certificat",
      detail: "Absolvit cursul de Securitate și Sănătate în Muncă",
      colorType: "green" as const,
      achievedAt: new Date("2025-02-18"),
    },
    {
      userId: worker1Id,
      label: "PRV Expert",
      detail: "Finalizat cursul PRV cu scor maxim",
      colorType: "amber" as const,
      achievedAt: new Date("2025-03-10"),
    },
    {
      userId: supervisorId,
      label: "SSM Certificat",
      detail: "Absolvit cursul de Securitate și Sănătate în Muncă",
      colorType: "green" as const,
      achievedAt: new Date("2025-02-15"),
    },
    {
      userId: supervisorId,
      label: "Leadership Avansat",
      detail: "Finalizat cursul de Leadership pentru Supraveghetori",
      colorType: "amber" as const,
      achievedAt: new Date("2025-04-01"),
    },
    {
      userId: managerId,
      label: "GDPR Certificat",
      detail: "Absolvit cursul de conformitate GDPR",
      colorType: "green" as const,
      achievedAt: new Date("2025-01-20"),
    },
  ]

  for (const a of achievementDefs) {
    await db.insert(userAchievements).values({ companyId, ...a })
  }

  console.log(`    ✓ Courses: ${courseIds.length}`)
  return { courseIds }
}
