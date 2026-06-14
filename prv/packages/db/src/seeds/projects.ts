// Seed: general projects with milestones and members
import { db } from "../client"
import { projects, projectMembers, projectMilestones } from "../schema/projects"
import { eq } from "drizzle-orm"

export interface ProjectsSeedResult {
  projectIds: string[]
}

export async function seedProjects(opts: {
  companyId: string
  storeId: string
  clientIds: string[]
  ceoId: string
  managerId: string
  supervisorId: string
  workerIds: string[]
}): Promise<ProjectsSeedResult> {
  console.log("  → Seeding projects...")

  const { companyId, storeId, clientIds, ceoId, managerId, supervisorId, workerIds } = opts
  const [clientId1, clientId2] = clientIds
  const [worker1Id, worker2Id] = workerIds

  const projectDefs = [
    {
      clientId: clientId1,
      storeId,
      ownerId: managerId,
      name: "Implementare CRM Client — Familia Radu",
      code: "PROJ-001",
      description:
        "Gestionarea relației cu clientul Familia Radu pe parcursul contractului de renovare.",
      status: "active" as const,
      budget: "5000",
      currency: "RON",
      startDate: "2025-03-01",
      dueDate: "2025-06-30",
    },
    {
      clientId: clientId2,
      storeId,
      ownerId: managerId,
      name: "Modernizare Infrastructură IT — Hotel Royal",
      code: "PROJ-002",
      description:
        "Proiect intern de modernizare infrastructură IT pentru suport lucrări Hotel Royal.",
      status: "active" as const,
      budget: "12000",
      currency: "RON",
      startDate: "2025-04-01",
      dueDate: "2025-08-31",
    },
    {
      storeId,
      ownerId: ceoId,
      name: "Extindere Echipă — Recrutare Q3 2025",
      code: "PROJ-003",
      description:
        "Recrutare 2 electricieni și 1 instalator pentru creșterea capacității operaționale.",
      status: "active" as const,
      budget: "8000",
      currency: "RON",
      startDate: "2025-05-01",
      dueDate: "2025-07-31",
    },
  ]

  const projectIds: string[] = []

  for (const p of projectDefs) {
    const existing = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.code, p.code))
      .limit(1)

    let projectId: string

    if (existing[0]) {
      projectId = existing[0].id
    } else {
      const [record] = await db
        .insert(projects)
        .values({ companyId, ...p })
        .returning({ id: projects.id })
      if (!record) continue
      projectId = record.id
    }

    projectIds.push(projectId)
  }

  // ── Members ─────────────────────────────────────────────────────────────────
  if (projectIds[0]) {
    const memberDefs = [
      { userId: managerId, role: "owner" as const },
      { userId: supervisorId, role: "manager" as const },
      { userId: worker1Id, role: "worker" as const },
    ]
    for (const m of memberDefs) {
      await db
        .insert(projectMembers)
        .values({ projectId: projectIds[0], ...m })
        .onConflictDoNothing()
    }

    await db.insert(projectMilestones).values([
      {
        projectId: projectIds[0],
        title: "Semnare contract",
        isComplete: true,
        completedAt: new Date("2025-02-25"),
        sortOrder: 0,
        dueDate: "2025-03-01",
      },
      {
        projectId: projectIds[0],
        title: "Demarare lucrări",
        isComplete: true,
        completedAt: new Date("2025-03-05"),
        sortOrder: 1,
        dueDate: "2025-03-05",
      },
      {
        projectId: projectIds[0],
        title: "Finalizare instalații",
        isComplete: false,
        sortOrder: 2,
        dueDate: "2025-05-15",
      },
      {
        projectId: projectIds[0],
        title: "Predare finală",
        isComplete: false,
        sortOrder: 3,
        dueDate: "2025-06-30",
      },
    ])
  }

  if (projectIds[1]) {
    const memberDefs = [
      { userId: managerId, role: "owner" as const },
      { userId: worker2Id, role: "worker" as const },
    ]
    for (const m of memberDefs) {
      await db
        .insert(projectMembers)
        .values({ projectId: projectIds[1], ...m })
        .onConflictDoNothing()
    }

    await db.insert(projectMilestones).values([
      {
        projectId: projectIds[1],
        title: "Audit infrastructură existentă",
        isComplete: true,
        completedAt: new Date("2025-04-10"),
        sortOrder: 0,
        dueDate: "2025-04-15",
      },
      {
        projectId: projectIds[1],
        title: "Achiziție echipamente",
        isComplete: false,
        sortOrder: 1,
        dueDate: "2025-05-31",
      },
      {
        projectId: projectIds[1],
        title: "Implementare și testare",
        isComplete: false,
        sortOrder: 2,
        dueDate: "2025-07-31",
      },
      {
        projectId: projectIds[1],
        title: "Training utilizatori",
        isComplete: false,
        sortOrder: 3,
        dueDate: "2025-08-15",
      },
    ])
  }

  if (projectIds[2]) {
    const memberDefs = [
      { userId: ceoId, role: "owner" as const },
      { userId: managerId, role: "manager" as const },
    ]
    for (const m of memberDefs) {
      await db
        .insert(projectMembers)
        .values({ projectId: projectIds[2], ...m })
        .onConflictDoNothing()
    }

    await db.insert(projectMilestones).values([
      {
        projectId: projectIds[2],
        title: "Publicare anunțuri recrutare",
        isComplete: true,
        completedAt: new Date("2025-05-05"),
        sortOrder: 0,
        dueDate: "2025-05-05",
      },
      {
        projectId: projectIds[2],
        title: "Interviuri candidați",
        isComplete: false,
        sortOrder: 1,
        dueDate: "2025-06-15",
      },
      {
        projectId: projectIds[2],
        title: "Angajare și onboarding",
        isComplete: false,
        sortOrder: 2,
        dueDate: "2025-07-31",
      },
    ])
  }

  console.log(`    ✓ Projects: ${projectIds.length}`)
  return { projectIds }
}
